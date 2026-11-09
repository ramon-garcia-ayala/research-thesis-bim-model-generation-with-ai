/*
 * Build a paper's idea graph (papers/<node-id>/graph.json) once: Claude reads the whole paper with Sonnet 5.5 at
 * xhigh effort and writes its main ideas, how they relate, and where they bear on the thesis. Every later question in
 * the reader is answered from this graph, cheaply. An invalid reply never replaces a good graph.
 * Run by Claude from Claude Code: `npm run paper:graph -- <node-id> [--reply <saved reply>]`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EDGE_TYPES, IDEA_KINDS, blocksOf, textOf, validateGraph } from '../../assets/paper.js'
import { indexPapers } from '../check.mjs'
import { runClaude } from '../lib/claude.mjs'
import { extractJson } from '../lib/json.mjs'

export { extractJson }

const MODEL = { model: 'claude-sonnet-5-5', effort: process.env.PAPER_EFFORT || 'xhigh', tools: [] }
const latest = (versions) => versions?.at(-1)?.text ?? ''
const today = () => new Date().toISOString().slice(0, 10)

/** The instructions and the material of the graph-building call. */
export function graphPrompt(paper, map) {
  const system = [
    'You read a research paper once, carefully, and write its main ideas as a graph that a tutor will later use to answer',
    "a student's questions about the paper without reading it again. The student is an architect writing a thesis.",
    '',
    'Reply with one JSON object and nothing else:',
    '{ "ideas": [ { "id": "i1", "kind": "…", "key": "…", "en": "…", "es": "…", "blocks": ["s3-p2"] } ],',
    '  "edges": [ { "from": "i1", "to": "i2", "type": "…", "why": "…" } ],',
    '  "thesis": [ { "idea": "i1", "to": "…", "why": "…" } ] }',
    '',
    `- ideas: 15 to 40, ids i1, i2, … Each kind is one of: ${IDEA_KINDS.join(', ')}.`,
    "  Cover the paper's questions, its method steps, its data, its results, its claims, its limitations and its future work.",
    '  "en" is one or two plain sentences in English; "es" says the same in Spanish (Mexico). Results keep their numbers',
    '  exactly as the paper states them (same digits, same units). Say what the paper says, not what you think of it.',
    '  "blocks" lists the ids of the paragraphs, figures or tables the idea rests on (at least one, only ids that appear',
    '  in brackets in the paper below).',
    '  "key" is optional: a short kebab-case name for an idea other papers may share (a dataset, a metric, a method),',
    '  e.g. "procthor-10k", "spl", "room-spec".',
    `- edges: typed relations between ideas. Each type is one of: ${EDGE_TYPES.join(', ')}. "why" is one line.`,
    '- thesis: only where the paper genuinely bears on the thesis below. "to" is "question", "hypothesis" or the id of',
    '  a map node listed below; "why" is one line saying how (support, challenge, a method to borrow, a gap).',
  ].join('\n')
  const nodes = map.nodes.map((n) => `${n.id} — ${n.title}`).join('\n')
  const text = blocksOf(paper)
    .filter((b) => b.section !== 'refs')
    .map((b) => `[${b.id}] ${textOf(b, 'en')}`)
    .join('\n\n')
  const prompt = [
    `The thesis question: ${latest(map.centre.question)}`,
    `The thesis hypothesis: ${latest(map.centre.hypothesis)}`,
    '',
    'The nodes of the thesis research map (id — title):',
    nodes,
    '',
    `The paper: ${paper.title}`,
    '',
    text,
  ].join('\n')
  return { system, prompt }
}

/** Build and write the graph of paper `nodeId`; throws, leaving any existing graph.json as it was, on any problem. */
export async function buildGraph(nodeId, { root = process.cwd(), claude = runClaude, date = today() } = {}) {
  const paper = JSON.parse(readFileSync(join(root, 'papers', nodeId, 'paper.json'), 'utf8'))
  const map = JSON.parse(readFileSync(join(root, 'map.json'), 'utf8'))
  const { system, prompt } = graphPrompt(paper, map)
  const reply = extractJson(await claude({ ...MODEL, system, prompt, cwd: root }))
  const graph = {
    version: 1,
    node: nodeId,
    built: { date, model: MODEL.model, effort: MODEL.effort },
    // An idea without a shared name may come with an empty key: it simply has none.
    ideas: (reply.ideas ?? []).map(({ date: _, key, ...i }) => ({ ...i, ...(key?.trim() ? { key: key.trim() } : {}), origin: 'read' })),
    edges: reply.edges ?? [],
    thesis: reply.thesis ?? [],
  }
  const problems = validateGraph(graph, paper, new Set(map.nodes.map((n) => n.id)))
  if (problems.length) {
    // The reply cost a long call: keep it outside the repo, to repair and build from (`--reply <file>`).
    const saved = join(tmpdir(), `graph-${nodeId}-${Date.now()}.json`)
    writeFileSync(saved, JSON.stringify(reply, null, 2))
    throw new Error(`the graph Claude wrote is not valid; graph.json is unchanged; the reply is saved in ${saved}\n${problems.join('\n')}`)
  }
  writeFileSync(join(root, 'papers', nodeId, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`)
  writeFileSync(join(root, 'papers', 'index.json'), `${JSON.stringify(indexPapers(root), null, 2)}\n`)
  return { ideas: graph.ideas.length, edges: graph.edges.length, thesis: graph.thesis.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2]
  if (!id || !existsSync(join(process.cwd(), 'papers', id, 'paper.json'))) {
    console.error('usage: node scripts/papers/graph.mjs <node-id>   (the paper must be prepared first)')
    process.exit(2)
  }
  // --reply <file>: build from a saved (and repaired) reply instead of asking Claude again.
  const at = process.argv.indexOf('--reply')
  const claude = at > 0 ? async () => readFileSync(process.argv[at + 1], 'utf8') : undefined
  const r = await buildGraph(id, { claude })
  console.log(`${id}: ${r.ideas} ideas, ${r.edges} edges, ${r.thesis} links to the thesis`)
}
