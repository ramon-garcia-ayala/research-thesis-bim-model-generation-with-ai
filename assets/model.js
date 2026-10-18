/*
 * The map's data: what a valid map is, and what is new since the last thesis presentation.
 * Pure: no DOM, no files. The checker (scripts/check.mjs) and the viewer both use it.
 */

export const KINDS = ['paper', 'idea', 'image', 'reference', 'build']
export const CENTRE = ['question', 'hypothesis']
export const COLOURS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8']

const ID = /^[a-z0-9][a-z0-9-]*$/

/** True for a real calendar day written YYYY-MM-DD. */
export const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export const linkKey = (l) => `${l.from}→${l.to}`

const blank = (s) => typeof s !== 'string' || s.trim() === ''

/** The problems of a map, one line each naming the item; empty when it is valid. */
export function validate(map) {
  if (!map || typeof map !== 'object') return ['map.json is not an object']
  const problems = []
  const list = (name) => {
    if (Array.isArray(map[name])) return map[name]
    problems.push(`${name} is not a list`)
    return []
  }

  if (map.lastPresentation !== null && !isDate(map.lastPresentation))
    problems.push(`lastPresentation "${map.lastPresentation}" is not null or YYYY-MM-DD`)

  if (!map.centre || typeof map.centre !== 'object') problems.push('centre is missing')
  for (const part of CENTRE) {
    const versions = map.centre?.[part]
    if (!Array.isArray(versions)) {
      problems.push(`centre.${part} is not a list`)
      continue
    }
    versions.forEach((v, i) => {
      if (!isDate(v?.date)) problems.push(`${part} version ${i + 1}: date "${v?.date}" is not YYYY-MM-DD`)
      if (blank(v?.text)) problems.push(`${part} version ${i + 1}: no text`)
    })
  }

  const groups = list('groups')
  const nodes = list('nodes')
  const links = list('links')

  const seen = new Set()
  const claim = (what, id) => {
    if (!ID.test(id ?? '')) problems.push(`${what} id "${id}" is not lowercase letters, digits and dashes`)
    if (CENTRE.includes(id)) problems.push(`${what} "${id}": the id is reserved for the centre`)
    if (seen.has(id)) problems.push(`duplicate id "${id}"`)
    seen.add(id)
  }
  const dated = (what, item) => {
    if (!isDate(item.date)) problems.push(`${what}: date "${item.date}" is not YYYY-MM-DD`)
  }

  for (const g of groups) {
    claim('group', g.id)
    dated(`group "${g.id}"`, g)
    if (blank(g.title)) problems.push(`group "${g.id}": no title`)
    if (!COLOURS.includes(g.colour)) problems.push(`group "${g.id}": colour "${g.colour}" is not g1…g8`)
  }

  const groupIds = new Set(groups.map((g) => g.id))
  for (const n of nodes) {
    claim('node', n.id)
    const what = `node "${n.id}"`
    dated(what, n)
    if (blank(n.title)) problems.push(`${what}: no title`)
    if (!KINDS.includes(n.kind)) problems.push(`${what}: kind "${n.kind}" is not one of ${KINDS.join(', ')}`)
    if (!groupIds.has(n.group)) problems.push(`${what}: group "${n.group}" does not exist`)
    if (n.source !== undefined && (blank(n.source?.file) || !n.source.file.startsWith('files/')))
      problems.push(`${what}: source needs a file under files/`)
  }

  const ends = new Set([...CENTRE, ...groupIds, ...nodes.map((n) => n.id)])
  const linkSeen = new Set()
  for (const l of links) {
    const what = `link ${linkKey(l)}`
    dated(what, l)
    for (const end of [l.from, l.to])
      if (!ends.has(end)) problems.push(`${what}: "${end}" is not a node, a group or the centre`)
    if (blank(l.explanation)) problems.push(`${what}: no explanation`)
    if (linkSeen.has(linkKey(l))) problems.push(`${what}: duplicate link`)
    linkSeen.add(linkKey(l))
  }

  return problems
}

/**
 * The ids (groups, nodes, centre parts) and link keys approved after the last presentation.
 * A node is also new when one of its note entries is. With no presentation yet, everything is new.
 */
export function isNew(map, notesById) {
  const cutoff = map.lastPresentation
  const after = (date) => cutoff === null || (typeof date === 'string' && date > cutoff)
  const out = new Set()
  for (const part of CENTRE) if (map.centre[part].some((v) => after(v.date))) out.add(part)
  for (const g of map.groups) if (after(g.date)) out.add(g.id)
  for (const n of map.nodes) {
    const entries = notesById[n.id] ?? []
    if (after(n.date) || entries.some((e) => e.date !== null && after(e.date))) out.add(n.id)
  }
  for (const l of map.links) if (after(l.date)) out.add(linkKey(l))
  return out
}
