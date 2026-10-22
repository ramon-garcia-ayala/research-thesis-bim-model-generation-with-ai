import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { prepare } from '../../scripts/papers/prepare.mjs'
import { blk, raw } from './sample-dump.js'

const FIXTURE = join(import.meta.dirname, '..', 'fixture')

// Stand-ins for pdf_dump.py: the dump is the synthetic one; a crop is an empty PNG per id.
const dump = async (pdf, out) => writeFileSync(out, JSON.stringify(raw))
const crop = async (pdf, cropsJson, outDir) => {
  mkdirSync(outDir, { recursive: true })
  for (const c of JSON.parse(readFileSync(cropsJson, 'utf8'))) writeFileSync(join(outDir, `${c.id}.png`), '')
}

let root
const paperOf = () => JSON.parse(readFileSync(join(root, 'papers/sample-a/paper.json'), 'utf8'))

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'prepare-'))
  cpSync(FIXTURE, root, { recursive: true })
  rmSync(join(root, 'papers'), { recursive: true })
})

describe('prepare', () => {
  it('writes paper.json, the figures and the index', async () => {
    const r = await prepare('sample-a', { root, dump, crop })
    expect(r).toEqual({ sections: 3, blocks: expect.any(Number), figures: 1 })
    expect(existsSync(join(root, 'papers/sample-a/fig/fig-1.png'))).toBe(true)
    expect(paperOf()).toMatchObject({ version: 1, node: 'sample-a', source: 'files/sample-a.pdf' })
    expect(JSON.parse(readFileSync(join(root, 'papers/index.json'), 'utf8')).papers[0]).toMatchObject({ node: 'sample-a', es: false, graph: false })
  })

  it('keeps an unchanged translation when run again', async () => {
    await prepare('sample-a', { root, dump, crop })
    const p = paperOf()
    p.sections[1].blocks[0].text.es = 'Un validador revisa cada casa.'
    p.sections[1].title.es = '2 Método'
    writeFileSync(join(root, 'papers/sample-a/paper.json'), JSON.stringify(p))
    await prepare('sample-a', { root, dump, crop })
    expect(paperOf().sections[1].blocks[0].text.es).toBe('Un validador revisa cada casa.')
    expect(paperOf().sections[1].title.es).toBe('2 Método')
  })

  it('drops a translation whose English changed', async () => {
    await prepare('sample-a', { root, dump, crop })
    const p = paperOf()
    p.sections[1].blocks[0].text = { en: 'Older English.', es: 'Inglés viejo.' }
    writeFileSync(join(root, 'papers/sample-a/paper.json'), JSON.stringify(p))
    await prepare('sample-a', { root, dump, crop })
    expect(paperOf().sections[1].blocks[0].text.es).toBeUndefined()
  })

  it('takes the title from the first page, not the arXiv stamp', async () => {
    const front = [blk([10, 220, 37, 560], 'arXiv:2206.06994v1 [cs.AI] 14 Jun 2022', 20), blk([151, 103, 483, 120], 'Sample: Procedural', 17.2, true), blk([221, 123, 390, 140], 'Houses', 17.2, true)]
    const titled = { pages: [{ ...raw.pages[0], blocks: [...front, ...raw.pages[0].blocks] }, raw.pages[1]] }
    await prepare('sample-a', { root, dump: async (pdf, out) => writeFileSync(out, JSON.stringify(titled)), crop })
    expect(paperOf().title).toBe('Sample: Procedural Houses')
  })

  it('refuses a node that is not a paper', () => expect(prepare('idea-1', { root, dump, crop })).rejects.toThrow('"idea-1" is not a paper node'))
})
