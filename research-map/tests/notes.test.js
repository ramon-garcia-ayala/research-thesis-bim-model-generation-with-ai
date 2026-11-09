import { describe, expect, it } from 'vitest'
import { parseNote, renderMarkdown } from '../assets/notes.js'

describe('parseNote', () => {
  it('splits a note into dated entries, in order', () => {
    const md = '## 2026-10-18 · Summary\nFirst.\n\nSecond line.\n## 2026-10-25 · Result\n- a\n- b\n'
    expect(parseNote(md)).toEqual([
      { date: '2026-10-18', kind: 'Summary', body: 'First.\n\nSecond line.' },
      { date: '2026-10-25', kind: 'Result', body: '- a\n- b' },
    ])
  })

  it('accepts Windows line endings', () => {
    expect(parseNote('## 2026-10-18 · Summary\r\nText.\r\n')).toEqual([{ date: '2026-10-18', kind: 'Summary', body: 'Text.' }])
  })

  it('an unknown heading stays in the body; text before the first entry is an undated entry', () => {
    expect(parseNote('Intro.\n## 2026-10-18 · Summary\n## Methods\nText.')).toEqual([
      { date: null, kind: 'Note', body: 'Intro.' },
      { date: '2026-10-18', kind: 'Summary', body: '## Methods\nText.' },
    ])
  })

  it('an empty note has no entries', () => {
    expect(parseNote('')).toEqual([])
    expect(parseNote('\n\n')).toEqual([])
  })
})

describe('renderMarkdown', () => {
  it('paragraphs, lists and inline marks', () => {
    expect(renderMarkdown('One **bold** and *it* and `x<y`.\nSame paragraph.\n\n- a\n- [b](https://x.org/?a=1&b=2)')).toBe(
      '<p>One <strong>bold</strong> and <em>it</em> and <code>x&lt;y</code>. Same paragraph.</p>' +
        '<ul><li>a</li><li><a href="https://x.org/?a=1&amp;b=2" target="_blank" rel="noopener">b</a></li></ul>',
    )
  })

  it('raw HTML and unknown headings render as text, never as markup', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n## Methods')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<p>## Methods</p>')
  })

  it('a javascript: link is not a link', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href')
  })

  it('relative links (local files) are links', () => {
    expect(renderMarkdown('[pdf](files/a.pdf)')).toContain('href="files/a.pdf"')
  })

  it('a pipe table becomes a table: the first row is the head, the dashes row is dropped', () => {
    expect(renderMarkdown('| Step | **Manual** |\n|---|---|\n| Site | `x<y` |\n| Brief | |')).toBe(
      '<table><thead><tr><th>Step</th><th><strong>Manual</strong></th></tr></thead>' +
        '<tbody><tr><td>Site</td><td><code>x&lt;y</code></td></tr><tr><td>Brief</td><td></td></tr></tbody></table>',
    )
  })

  it('pipes without a dashes row are a paragraph', () => {
    expect(renderMarkdown('| a | b |\n| c | d |')).toBe('<p>| a | b | | c | d |</p>')
  })

  it('bold inside code stays literal', () => {
    expect(renderMarkdown('`**x**`')).toBe('<p><code>**x**</code></p>')
  })
})
