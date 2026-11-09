import { describe, expect, it } from 'vitest'
import { LANG_KEY, initialLang, setLang } from '../../presentations/assets/i18n.js'

const memory = (init = {}) => {
  const data = { ...init }
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v }, data }
}
const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }

describe('initialLang', () => {
  it('picks Spanish for a Spanish browser', () => expect(initialLang(null, 'es-MX')).toBe('es'))
  it('picks English for any other browser', () => expect(initialLang(null, 'en-US')).toBe('en'))
  it('prefers the stored choice over the browser', () => expect(initialLang(memory({ [LANG_KEY]: 'en' }), 'es-MX')).toBe('en'))
  it('ignores a stored value that is not a language', () => expect(initialLang(memory({ [LANG_KEY]: 'fr' }), 'es-MX')).toBe('es'))
  it('falls back to the browser when storage throws', () => expect(initialLang(broken, 'es-ES')).toBe('es'))
})

describe('setLang', () => {
  it('sets the document language and remembers it', () => {
    const storage = memory()
    setLang(document, storage, 'es')
    expect(document.documentElement.dataset.lang).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    expect(storage.data[LANG_KEY]).toBe('es')
  })
  it('still switches when storage throws', () => {
    setLang(document, broken, 'en')
    expect(document.documentElement.dataset.lang).toBe('en')
  })
})
