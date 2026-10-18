import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkFolder } from '../scripts/check.mjs'

const map = {
  version: 1,
  lastPresentation: null,
  centre: { question: [], hypothesis: [] },
  groups: [{ id: 'datasets', title: 'Datasets', colour: 'g1', date: '2026-10-18' }],
  nodes: [
    {
      id: 'procthor', kind: 'paper', group: 'datasets', title: 'ProcTHOR', date: '2026-10-18',
      source: { file: 'files/procthor.pdf', original: 'I:\\Papers\\procthor.pdf' },
    },
  ],
  links: [],
}

/** A map folder with the given files; returns its path. */
const folder = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'research-map-'))
  mkdirSync(join(dir, 'notes'))
  mkdirSync(join(dir, 'files'))
  for (const [path, text] of Object.entries(files)) writeFileSync(join(dir, path), text)
  return dir
}
const noRemote = () => ''

describe('checkFolder', () => {
  it('a complete folder passes', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/procthor.md': '## 2026-10-18 · Summary\nx', 'files/procthor.pdf': '%PDF' })
    expect(checkFolder(dir, { gitRemote: noRemote })).toEqual([])
  })

  it('a missing source file, a missing note and an orphan note are each named', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/atlas.md': '' })
    const problems = checkFolder(dir, { gitRemote: noRemote }).join('\n')
    expect(problems).toMatch(/procthor.*files\/procthor\.pdf/)
    expect(problems).toMatch(/procthor.*notes\/procthor\.md/)
    expect(problems).toMatch(/notes\/atlas\.md.*no node/)
  })

  it('a note entry with a bad date is named', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/procthor.md': '## 2026-02-30 · Summary\nx', 'files/procthor.pdf': '' })
    expect(checkFolder(dir, { gitRemote: noRemote }).join('\n')).toMatch(/notes\/procthor\.md.*2026-02-30/)
  })

  it('a git remote fails the check', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/procthor.md': '## 2026-10-18 · Summary\nx', 'files/procthor.pdf': '' })
    expect(checkFolder(dir, { gitRemote: () => 'origin\n' }).join('\n')).toMatch(/remote/)
  })

  it('invalid JSON is one problem, not a crash', () => {
    expect(checkFolder(folder({ 'map.json': '{ nope' }), { gitRemote: noRemote })[0]).toMatch(/map\.json/)
  })
})
