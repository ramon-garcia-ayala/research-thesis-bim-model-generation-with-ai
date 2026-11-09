/*
 * Rebuilds papers/index.json and papers/words.json from the papers folders and the vocabulary (papers/keywords.json).
 * prepare, translate and graph already do it; run this after changing the vocabulary or repairing a paper by hand.
 */
import { writeIndexes } from '../check.mjs'

const { papers, keywords } = writeIndexes(process.cwd())
const used = new Set(papers.flatMap((p) => p.keywords))
console.log(`${papers.length} papers, ${used.size} of ${keywords.length} keywords in use`)
for (const k of keywords) console.log(`  ${String(papers.filter((p) => p.keywords.includes(k.id)).length).padStart(3)}  ${k.label}`)
