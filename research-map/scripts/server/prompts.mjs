/*
 * What the study companion tells Claude, and how it reads the reply. A question is answered from the paper's idea
 * graph (cheap); the reply's first line says whether the graph covered it, and when it did not the server re-reads the
 * paper's text around the closest ideas, and adds what it finds to the graph.
 */
import { blocksOf, textOf } from '../../assets/paper.js'

export const MODELS = {
  sonnet: { model: 'claude-sonnet-5-5', effort: 'low' },
  haiku: { model: 'claude-haiku-5-5' },
  reread: { model: 'claude-sonnet-5-5', effort: 'medium' },
}

export const RESEARCH_TOOLS = ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch']

const LANG_NAMES = { es: 'Spanish (Mexico)', en: 'English' }

const STANCE = [
  'You are a study companion for an architect who is reading research papers for a MaCAD thesis and for their practice',
  'at Gensler. You help them learn: explain plainly, then make them think — ask what they would do, how it applies to',
  'their work, or how it bears on the thesis. No summaries unless they ask for one. Be brief: a few short paragraphs.',
]

const CITE = 'Cite the paper as [¶ <block id>] right after what each statement rests on, e.g. [¶ s3-p2]; use only block ids from the material given.'

const STATUS = [
  'The FIRST LINE of your reply is exactly one of:',
  'COVERED',
  'NOT COVERED: <ids of the blocks nearest to the question, separated by spaces>',
  'Write COVERED when the ideas below are enough to answer well; otherwise write NOT COVERED and nothing else — do not',
  'guess. After COVERED, a new line, then the answer.',
]

/** The ideas of one paper's graph, compactly: what each says, what it rests on, how they relate, the thesis links. */
function graphText({ node, title, graph }) {
  const ideas = (graph?.ideas ?? []).map(
    (i) => `${i.id} [${i.kind}]${i.key ? ` (${i.key})` : ''} ${i.en} — blocks: ${(i.blocks ?? []).join(', ')}`,
  )
  const edges = (graph?.edges ?? []).map((e) => `${e.from} —${e.type}→ ${e.to}: ${e.why}`)
  const thesis = (graph?.thesis ?? []).map((t) => `${t.idea} → ${t.to}: ${t.why}`)
  return [
    `## Paper "${title}" (${node})`,
    'Ideas:',
    ...ideas,
    ...(edges.length ? ['Relations:', ...edges] : []),
    ...(thesis.length ? ['Bearing on the thesis:', ...thesis] : []),
  ].join('\n')
}

const historyText = (history) =>
  history.length
    ? ['The conversation so far:', ...history.map((m) => `${m.role === 'user' ? 'Author' : 'You'}: ${m.text}`)].join('\n')
    : ''

const lastAssistant = (history) => [...history].reverse().find((m) => m.role === 'assistant')

/**
 * The instructions and material of one chat turn. `mode`: ask (a free question), explain ("what did they mean here?"
 * on the attached passage), research (look beyond the paper, with tools), quiz (questions on `scope`).
 */
export function chatPrompt({ mode, papers, thesis, mapTitles = {}, prepared = [], underlines = [], attach = [], history = [], message = '', scope = null, lang = 'es' }) {
  const system = [...STANCE, `Answer in ${LANG_NAMES[lang] ?? 'Spanish (Mexico)'}.`, CITE]
  if (mode === 'research') {
    system.push(
      'Research the question beyond this paper: the web (WebSearch, WebFetch), the other papers’ idea graphs and the map’s',
      'notes listed below (Read, Grep, Glob; read only what you need). Say how what you find relates to the paper.',
      'End with a list of your sources (URLs, or the files you read).',
    )
  } else {
    system.push(...STATUS)
    if (mode === 'explain')
      system.push('The author attached a passage and asks what it means: explain it plainly, in the context of the paper, then ask them one question back.')
    if (mode === 'underlined')
      system.push(
        'The author asks about what they underlined in this paper, listed below. Answer their question from those passages.',
        'If they ask nothing in particular, say what connects the passages, what they add up to for the thesis, and what they leave out.',
      )
    if (mode === 'quiz')
      system.push(
        'The author asks to be quizzed on the scope given. Write 3 open questions that make them explain, compare, or argue',
        'a point against the thesis hypothesis. Number them. Do not answer them; wait for the author’s answers.',
      )
  }
  if (mode !== 'quiz' && lastAssistant(history)?.mode === 'quiz')
    system.push(
      'Your last message was a quiz: the author is now answering it. Assess the answer against the ideas:',
      'say what was right and what was missing, citing paragraphs, then ask whether they want the next question.',
    )

  const parts = [
    `The thesis question: ${thesis.question}`,
    `The thesis hypothesis: ${thesis.hypothesis}`,
    '',
    ...papers.map(graphText),
  ]
  if (mode === 'research') {
    const others = prepared.filter((id) => !papers.some((p) => p.node === id))
    parts.push(
      '',
      'Files you may read (paths relative to the working folder):',
      ...others.map((id) => `- papers/${id}/graph.json — the idea graph of "${mapTitles[id] ?? id}"`),
      '- notes/<node-id>.md — the map’s notes on each paper and idea',
      '- map.json — the map: its nodes and links',
    )
  }
  const whole = (a) => (a.image ? ' (whole figure; you have its caption, not the image)' : '')
  if (mode === 'underlined') parts.push('', 'The author’s underlines:', ...attach.map((a) => `- [${a.block}]${whole(a)} «${a.text}»`))
  else {
    if (underlines.length) parts.push('', 'The author’s underlines:', ...underlines.map((u) => `- [${u.block}] «${u.text}»`))
    if (attach.length) parts.push('', 'The passage the author attached:', ...attach.map((a) => `- [${a.block}] «${a.text}»`))
  }
  if (mode === 'quiz' && scope) parts.push('', `Quiz scope: ${scope.kind}${scope.ids?.length ? ` — ${scope.ids.join(', ')}` : ''}`)
  const h = historyText(history)
  if (h) parts.push('', h)
  parts.push('', `The author: ${message}`)
  return { system: system.join('\n'), prompt: parts.join('\n') }
}

/** The instructions and material for answering from the paper's text, when the graph did not cover the question. */
export function rereadPrompt({ paper, blockIds, question, history = [], lang = 'es' }) {
  const wanted = blockIds ? new Set(blockIds) : null
  const blocks = blocksOf(paper).filter((b) => b.section !== 'refs' && (!wanted || wanted.has(b.id)))
  const system = [
    ...STANCE,
    `Answer in ${LANG_NAMES[lang] ?? 'Spanish (Mexico)'}, from the text of the paper given below.`,
    CITE,
    'The FIRST LINE of your reply is exactly COVERED when this text answers the question, or NOT COVERED when it does not',
    '(then stop). After COVERED, a new line, then the answer.',
    'If you used ideas from the text that a summary of the paper would need, end with a fenced block:',
    '```graph-add',
    '[{ "kind": "concept|question|method|dataset|result|claim|limitation|future", "en": "…", "es": "…", "blocks": ["<block id>"] }]',
    '```',
    'one short statement per idea in English and Spanish, numbers exactly as the paper states them.',
  ].join('\n')
  const prompt = [
    `The paper: ${paper.title}`,
    '',
    ...blocks.map((b) => `[${b.id}] ${textOf(b, 'en')}`),
    '',
    historyText(history),
    '',
    `The author: ${question}`,
  ].join('\n')
  return { system, prompt }
}

/** The instructions for turning a chat message into a proposed entry of a paper's note. */
export function notePrompt({ text, from, node, paperTitle }) {
  const system = [
    `You write one entry for the research-map note of the paper "${paperTitle}" (${node}).`,
    'Write it in English, like the other notes: short, plain, a few lines or bullets. Do not write a heading line.',
    'Quote the author’s own words exactly as they wrote them, in their language, between quotation marks.',
    'Say which part is whose: start the author’s part with "Author:" and yours with "Claude:".',
    'Reply with the entry’s body and nothing else.',
  ].join('\n')
  const who = from === 'author' ? 'The author wrote' : 'Claude (you) wrote, in the reader’s chat'
  return { system, prompt: `${who}:\n\n${text}` }
}

/** The status line of a reply: covered, or not with the blocks nearest to the question; null when it is neither. */
export function parseStatus(firstLine) {
  const line = String(firstLine ?? '').trim()
  if (/^COVERED\.?$/.test(line)) return { covered: true, near: [] }
  const m = /^NOT COVERED\.?(?::\s*(.*))?$/.exec(line)
  if (!m) return null
  return { covered: false, near: (m[1] ?? '').split(/[\s,]+/).filter((id) => /^[a-z0-9][a-z0-9-]*$/.test(id)) }
}

/** The answer without its ```graph-add block, and the ideas in it (none when it is missing or not JSON). */
export function splitGraphAdd(text) {
  const m = /```graph-add\s*\n([\s\S]*?)```/.exec(text)
  if (!m) return { answer: text.trim(), ideas: [] }
  let ideas = []
  try {
    const parsed = JSON.parse(m[1])
    ideas = Array.isArray(parsed) ? parsed : []
  } catch {
    ideas = []
  }
  return { answer: text.replace(m[0], '').trim(), ideas }
}

/** The block ids an answer cites as [¶ id], each once, in order. */
export const citesOf = (text) => [...new Set([...String(text).matchAll(/\[¶\s*([a-z0-9][a-z0-9-]*)\]/g)].map((m) => m[1]))]

/** Each of `ids` with `radius` blocks on either side, in document order, references left out. */
export function nearBlocks(paper, ids, radius = 3) {
  const blocks = blocksOf(paper).filter((b) => b.section !== 'refs')
  const keep = new Set()
  for (const id of ids) {
    const i = blocks.findIndex((b) => b.id === id)
    if (i < 0) continue
    for (let k = Math.max(0, i - radius); k <= Math.min(blocks.length - 1, i + radius); k++) keep.add(k)
  }
  return [...keep].sort((a, b) => a - b).map((k) => blocks[k].id)
}
