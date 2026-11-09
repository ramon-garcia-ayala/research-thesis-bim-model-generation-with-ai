// ES / EN. Both languages sit side by side in the HTML (<x lang="en">…</x><x lang="es">…</x>);
// deck.css shows the one that matches html[data-lang].

export const LANG_KEY = 'research-map-lang'

const isLang = (v) => v === 'en' || v === 'es'

/** The stored choice if any, else Spanish for a Spanish browser, else English. Storage may be missing or throw. */
export function initialLang(storage, navigatorLanguage) {
  try {
    const stored = storage?.getItem(LANG_KEY)
    if (isLang(stored)) return stored
  } catch {
    // a private window or blocked site data: fall through to the browser language
  }
  return String(navigatorLanguage || '').toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function setLang(doc, storage, lang) {
  doc.documentElement.dataset.lang = lang
  doc.documentElement.lang = lang
  try {
    storage?.setItem(LANG_KEY, lang)
  } catch {
    // not remembered, still switched
  }
}

/** window.localStorage, or null where reading it throws. */
export function safeStorage(win) {
  try {
    return win.localStorage
  } catch {
    return null
  }
}
