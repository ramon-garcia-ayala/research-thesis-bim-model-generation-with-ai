/*
 * The checker Claude runs before every commit: the data is valid, every source file and note exists, no note is
 * orphaned, every note entry has a real date, and the folder has no git remote (nothing here goes to GitHub).
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDate, validate } from '../assets/model.js'

const ENTRY_HEADING = /^## (\S+) · /

const gitRemoteOf = (dir) => () => execSync('git remote', { cwd: dir, encoding: 'utf8' })

/** The problems of the map folder at `dir`; empty when it is ready to commit. */
export function checkFolder(dir, { gitRemote = gitRemoteOf(dir) } = {}) {
  let map
  try {
    map = JSON.parse(readFileSync(join(dir, 'map.json'), 'utf8'))
  } catch (e) {
    return [`map.json cannot be read: ${e.message}`]
  }
  const problems = validate(map)
  const nodes = Array.isArray(map.nodes) ? map.nodes : []

  for (const n of nodes) {
    if (n.source?.file && !existsSync(join(dir, n.source.file)))
      problems.push(`node "${n.id}": source ${n.source.file} is not in the folder`)
    const note = `notes/${n.id}.md`
    if (!existsSync(join(dir, note))) {
      problems.push(`node "${n.id}": ${note} is missing`)
      continue
    }
    for (const line of readFileSync(join(dir, note), 'utf8').split(/\r?\n/)) {
      const m = ENTRY_HEADING.exec(line)
      if (m && !isDate(m[1])) problems.push(`${note}: entry date "${m[1]}" is not a real YYYY-MM-DD`)
    }
  }

  const ids = new Set(nodes.map((n) => n.id))
  const notesDir = join(dir, 'notes')
  if (existsSync(notesDir))
    for (const f of readdirSync(notesDir))
      if (f.endsWith('.md') && !ids.has(f.slice(0, -3))) problems.push(`notes/${f}: no node has this id`)

  if (gitRemote().trim() !== '') problems.push('the folder has a git remote; it must have none')
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkFolder(process.cwd())
  for (const p of problems) console.error(p)
  console.log(problems.length === 0 ? 'map OK' : `${problems.length} problem(s)`)
  process.exit(problems.length === 0 ? 0 : 1)
}
