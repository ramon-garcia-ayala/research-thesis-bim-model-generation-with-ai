/* The JSON object in a model's reply, whatever text or code fence surrounds it. */

/** The first top-level {…} in `text`, parsed; throws when there is none. */
export function extractJson(text) {
  const start = text.indexOf('{')
  if (start >= 0) {
    let depth = 0
    let quoted = false
    for (let i = start; i < text.length; i++) {
      const c = text[i]
      if (quoted) {
        if (c === '\\') i++
        else if (c === '"') quoted = false
      } else if (c === '"') quoted = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('no JSON object in the reply')
}
