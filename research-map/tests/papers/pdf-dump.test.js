import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const SCRIPT = join(import.meta.dirname, '..', '..', 'scripts', 'papers', 'pdf_dump.py')
const python = (...args) => spawnSync('python', ['-I', ...args], { encoding: 'utf8' })
const hasPyMuPDF = python('-c', 'import pymupdf').status === 0

// A one-page PDF: a heading, a line of body text and one filled rectangle.
const MAKE_PDF = `
import sys, pymupdf
doc = pymupdf.open()
page = doc.new_page(width=612, height=792)
page.insert_text((72, 72), 'A heading', fontsize=16)
page.insert_text((72, 120), 'Body text here.', fontsize=10)
page.draw_rect(pymupdf.Rect(100, 200, 300, 350), color=(0, 0, 0), fill=(0.8, 0.8, 0.8))
doc.save(sys.argv[1])
`

describe.skipIf(!hasPyMuPDF)('pdf_dump.py', () => {
  let out, figs
  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'pdf-dump-'))
    const pdf = join(dir, 'sample.pdf')
    expect(python('-c', MAKE_PDF, pdf).status).toBe(0)
    out = join(dir, 'raw.json')
    const dumped = python(SCRIPT, 'dump', pdf, out)
    expect(dumped.stderr).toBe('')
    figs = join(dir, 'fig')
    writeFileSync(join(dir, 'crops.json'), JSON.stringify([{ id: 'fig-1', page: 1, bbox: [100, 200, 300, 350] }]))
    python(SCRIPT, 'crop', pdf, join(dir, 'crops.json'), figs, '--dpi', '72')
  })

  it('dumps text blocks with sizes and the drawn rectangle', () => {
    const raw = JSON.parse(readFileSync(out, 'utf8'))
    expect(raw.pages[0]).toMatchObject({ n: 1, w: 612, h: 792 })
    expect(raw.pages[0].blocks.flatMap((b) => b.lines.map((l) => l.text))).toEqual(['A heading', 'Body text here.'])
    expect(raw.pages[0].blocks[0].lines[0].size).toBe(16)
    expect(raw.pages[0].blocks[0].lines[0].bbox).toHaveLength(4)
    expect(raw.pages[0].drawings).toHaveLength(1)
  })

  it('crops a region to a PNG', () => expect(readFileSync(join(figs, 'fig-1.png')).subarray(1, 4).toString()).toBe('PNG'))

  it('skips a region outside its page, naming it, and still crops the others', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pdf-crop-'))
    const pdf = join(dir, 'sample.pdf')
    python('-c', MAKE_PDF, pdf)
    const crops = [{ id: 'fig-off', page: 1, bbox: [700, 900, 800, 1000] }, { id: 'fig-on', page: 1, bbox: [100, 200, 300, 350] }]
    writeFileSync(join(dir, 'crops.json'), JSON.stringify(crops))
    const r = python(SCRIPT, 'crop', pdf, join(dir, 'crops.json'), join(dir, 'fig'), '--dpi', '72')
    expect(r.status).toBe(0)
    expect(r.stderr).toContain('fig-off')
    expect(existsSync(join(dir, 'fig', 'fig-off.png'))).toBe(false)
    expect(existsSync(join(dir, 'fig', 'fig-on.png'))).toBe(true)
  })
})
