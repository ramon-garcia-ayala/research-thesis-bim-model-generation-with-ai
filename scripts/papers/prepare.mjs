/*
 * Prepare a paper for the reader: dump its PDF, turn the dump into papers/<node-id>/paper.json with its figures
 * cropped to fig/*.png, and refresh papers/index.json. Run by Claude from Claude Code, once per paper:
 * `npm run paper:prepare -- <node-id>`. Spanish already in paper.json is kept where the English did not change.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blocksOf, validatePaper } from '../../assets/paper.js'
import { indexPapers } from '../check.mjs'
import { dropRunning, structure } from './structure.mjs'

const PDF_DUMP = join(import.meta.dirname, 'pdf_dump.py')

const python = (...args) => {
  const r = spawnSync('python', ['-I', PDF_DUMP, ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`pdf_dump.py ${args[0]} failed: ${r.stderr || r.error?.message}`)
}
const runDump = async (pdf, outJson) => python('dump', pdf, outJson)
const runCrop = async (pdf, cropsJson, outDir) => python('crop', pdf, cropsJson, outDir, '--dpi', '150')

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
export const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)

/** The paper's own title: the largest lines on its first page. */
function titleOf(raw) {
  const lines = (dropRunning(raw.pages)[0]?.blocks ?? []).flatMap((b) => b.lines)
  const top = Math.max(...lines.map((l) => l.size))
  const sizes = raw.pages.flatMap((p) => p.blocks.flatMap((b) => b.lines.map((l) => l.size))).sort((a, b) => a - b)
  if (!(top >= 1.3 * sizes[Math.floor(sizes.length / 2)])) return null
  return lines.filter((l) => l.size === top).map((l) => l.text.trim()).join(' ')
}

/** Spanish from the previous paper.json, kept where the id and the English text are unchanged. */
function keepSpanish(paper, previous) {
  const old = new Map()
  for (const s of previous?.sections ?? []) old.set(`${s.id}#title`, s.title)
  for (const b of blocksOf(previous)) old.set(b.id, b.text)
  const carry = (key, t) => {
    const o = old.get(key)
    if (o?.es && o.en === t.en) t.es = o.es
  }
  for (const s of paper.sections) {
    carry(`${s.id}#title`, s.title)
    for (const b of s.blocks) carry(b.id, b.text)
  }
}

/** Prepare the paper of map node `nodeId` in `root`; returns how many sections, blocks and figures it has. */
export async function prepare(nodeId, { root = process.cwd(), dump = runDump, crop = runCrop } = {}) {
  const map = readJson(join(root, 'map.json'))
  const node = map.nodes.find((n) => n.id === nodeId)
  if (node?.kind !== 'paper') throw new Error(`"${nodeId}" is not a paper node`)
  if (!node.source?.file) throw new Error(`"${nodeId}" has no source PDF`)
  const pdf = join(root, node.source.file)
  const dir = join(root, 'papers', nodeId)
  const overrides = existsSync(join(dir, 'overrides.json')) ? readJson(join(dir, 'overrides.json')) : {}

  const tmp = mkdtempSync(join(tmpdir(), `paper-${nodeId}-`))
  try {
    await dump(pdf, join(tmp, 'raw.json'))
    const raw = readJson(join(tmp, 'raw.json'))
    const title = overrides.title ?? titleOf(raw) ?? node.title
    const { paper, crops } = structure(raw, { node: nodeId, title, source: node.source.file, overrides })
    const problems = validatePaper(paper, nodeId)
    if (problems.length > 0) throw new Error(`the prepared paper is not valid:\n${problems.join('\n')}`)

    mkdirSync(dir, { recursive: true })
    if (existsSync(join(dir, 'paper.json'))) keepSpanish(paper, readJson(join(dir, 'paper.json')))
    rmSync(join(dir, 'fig'), { recursive: true, force: true })
    writeJson(join(tmp, 'crops.json'), crops)
    await crop(pdf, join(tmp, 'crops.json'), join(dir, 'fig'))
    writeJson(join(dir, 'paper.json'), paper)
    writeJson(join(root, 'papers', 'index.json'), indexPapers(root))
    return { sections: paper.sections.length, blocks: blocksOf(paper).length, figures: crops.length }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2]
  if (!id) {
    console.error('usage: node scripts/papers/prepare.mjs <node-id>')
    process.exit(2)
  }
  const r = await prepare(id)
  console.log(`${id}: ${r.sections} sections, ${r.blocks} blocks, ${r.figures} figures and tables`)
  const paper = readJson(join(process.cwd(), 'papers', id, 'paper.json'))
  for (const b of blocksOf(paper).filter((x) => x.image)) console.log(`  ${b.image}  p.${b.page}  ${b.text.en.slice(0, 70)}`)
}
