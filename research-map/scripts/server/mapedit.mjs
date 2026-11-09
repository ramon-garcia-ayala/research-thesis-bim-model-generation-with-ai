/*
 * The chat proposes a change to the map itself — a new idea or conclusion, and the links that join it to the rest —
 * and writes it into map.json only when the author approves it. Claude drafts (JSON); the author edits; the server
 * validates the whole map as it would be and writes nothing unless that map is valid.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { validate } from '../../assets/model.js'
import { HttpError } from './api.mjs'
import { dayOf } from './chat.mjs'
import { MODELS, mapEntryPrompt } from './prompts.mjs'

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const str = (v) => (typeof v === 'string' ? v.trim() : '')

/** The proposal in Claude's reply: the JSON object (a ```json fence or bare), or null when there is none. */
export function parseProposal(text) {
  const body = /```(?:json)?\s*\n([\s\S]*?)```/.exec(text)?.[1] ?? /\{[\s\S]*\}/.exec(text)?.[0]
  if (!body) return null
  try {
    const parsed = JSON.parse(body)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** A proposal reduced to what the map keeps: { idea: { id, title, group, note } | null, links: [{ from, to, explanation }] }. */
export function cleanProposal(raw) {
  const i = raw?.idea
  const idea = i && typeof i === 'object' ? { id: str(i.id), title: str(i.title), group: str(i.group), note: str(i.note) } : null
  const links = (Array.isArray(raw?.links) ? raw.links : []).map((l) => ({ from: str(l?.from), to: str(l?.to), explanation: str(l?.explanation) }))
  return { idea, links }
}

/**
 * The map as it would be with the proposal approved on `date`, and the problems of the proposal: the whole map is
 * validated, so a bad id, group, end or duplicate shows up here and nothing is written. An idea needs a note (every
 * node has one) and at least one link; a proposal with neither an idea nor a link adds nothing.
 */
export function applyProposal(map, proposal, date) {
  const { idea, links } = cleanProposal(proposal)
  const problems = []
  if (!idea && !links.length) problems.push('the proposal adds nothing: no idea and no link')
  if (idea && !idea.note) problems.push(`idea "${idea.id}": no note`)
  if (idea && !links.length) problems.push(`idea "${idea.id}": it needs at least one link to the map`)
  const next = structuredClone(map)
  if (idea) next.nodes.push({ id: idea.id, kind: 'idea', group: idea.group, title: idea.title, date })
  for (const l of links) next.links.push({ from: l.from, to: l.to, date, explanation: l.explanation })
  const before = new Set(validate(map))
  problems.push(...validate(next).filter((p) => !before.has(p)))
  return { next, problems, idea, links }
}

const paperOf = (root, id) => {
  const node = readJson(join(root, 'map.json')).nodes.find((n) => n.id === id)
  if (node?.kind !== 'paper') throw new HttpError(400, `"${id}" is not a paper node`)
  return node
}

/** A proposed change to the map, drafted from a chat message; { proposal, problems } for the author to edit. */
export async function draftMapEntry(body, { root, claude, now = () => new Date() }) {
  const paper = paperOf(root, String(body?.node))
  if (typeof body?.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'nothing to turn into a map entry')
  const map = readJson(join(root, 'map.json'))
  const { system, prompt } = mapEntryPrompt({ text: body.text, from: body.from === 'claude' ? 'claude' : 'author', node: paper, map })
  const reply = await claude.run({ ...MODELS.sonnet, tools: [], system, prompt, cwd: root })
  const raw = parseProposal(reply)
  if (!raw) throw new HttpError(502, 'Claude did not answer with a proposal; try again')
  const proposal = cleanProposal(raw)
  const groups = map.groups.map((g) => ({ id: g.id, title: g.title }))
  return { proposal, problems: applyProposal(map, proposal, dayOf(now())).problems, groups }
}

/** Writes the file whole or not at all (a temporary file, then renamed over it). */
function writeAtomic(file, text) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, file)
}

/** Adds an approved proposal to map.json (and the new idea's note); 400 with the problems when the map would not be valid. */
export function saveMapEntry(body, { root, now = () => new Date() }) {
  const file = join(root, 'map.json')
  const raw = readFileSync(file, 'utf8')
  const date = dayOf(now())
  const { next, problems, idea } = applyProposal(JSON.parse(raw), body?.proposal, date)
  if (problems.length) throw new HttpError(400, problems.join('; '))
  const noteFile = join(root, 'notes', `${idea?.id}.md`)
  if (idea && existsSync(noteFile)) throw new HttpError(400, `notes/${idea.id}.md already exists`)
  const eol = raw.includes('\r\n') ? '\r\n' : '\n' // the file keeps the line endings it has, so the diff is only the addition
  if (idea) writeAtomic(noteFile, `## ${date} · Summary${eol}${idea.note.replace(/\r?\n/g, eol)}${eol}`)
  writeAtomic(file, `${JSON.stringify(next, null, 2).replace(/\n/g, eol)}${eol}`)
  return { ok: true, idea: idea?.id ?? null, links: next.links.length - JSON.parse(raw).links.length }
}

/** The routes of the map editing, added to the companion's by the server. */
export const mapEditRoutes = [
  ['POST', /^\/api\/map-draft$/, ({ body }, ctx) => draftMapEntry(body, ctx)],
  ['POST', /^\/api\/map-entry$/, ({ body }, ctx) => saveMapEntry(body, ctx)],
]
