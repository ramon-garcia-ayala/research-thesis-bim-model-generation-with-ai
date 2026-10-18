/*
 * A node's note: a log of dated entries (`## YYYY-MM-DD · Kind`), and the small Markdown its entries are written in.
 * Pure. HTML in a note is always shown as text.
 */

const ENTRY = /^## (\d{4}-\d{2}-\d{2}) · (.+)$/

/** The entries of a note, in file order. Text before the first entry is an undated "Note". */
export function parseNote(markdown) {
  const entries = []
  let current = { date: null, kind: 'Note', lines: [] }
  const close = () => {
    const body = current.lines.join('\n').trim()
    if (current.date !== null || body !== '') entries.push({ date: current.date, kind: current.kind, body })
  }
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const m = ENTRY.exec(line)
    if (m) {
      close()
      current = { date: m[1], kind: m[2].trim(), lines: [] }
    } else current.lines.push(line)
  }
  close()
  return entries
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A link target that is safe to follow: http(s), or a relative path inside the map. */
const safeUrl = (url) => /^https?:\/\//i.test(url) || /^[\w./-]+$/.test(url)

function inline(text) {
  // Code first, so marks inside it stay literal; placeholders keep it out of the later passes.
  const codes = []
  let s = escape(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, url) => {
    const raw = url.replace(/&amp;/g, '&')
    return safeUrl(raw) ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>` : whole
  })
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`)
}

/** Paragraphs, `-` lists, **bold**, *italic*, `code` and [links](url); everything else is text. */
export function renderMarkdown(body) {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== '')
    .map((block) => {
      const lines = block.split('\n')
      if (lines.every((l) => /^\s*- /.test(l)))
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*- /, ''))}</li>`).join('')}</ul>`
      return `<p>${inline(lines.map((l) => l.trim()).join(' '))}</p>`
    })
    .join('')
}
