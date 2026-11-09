// The one place for what every deck shares: the app's name, the tracks and the list of presentations.

/** The app's name on every slide. Slides never type it: they hold <span data-app-name></span>. */
export const APP_NAME = 'GFit: Generative Information Modeler'

/** Two audiences, two decks: the Gensler leaders and the MaCAD thesis (IAAC). Each track numbers its own presentations. */
export const TRACKS = {
  leaders: { en: 'Gensler', es: 'Gensler' },
  thesis: { en: 'IAAC', es: 'IAAC' },
}

/**
 * Every published presentation per track, oldest first. A presentation's folder is `<track>/<id>/`, the id is
 * `presentacion-NN`. The date is optional: a presentation without a date yet shows none.
 * @type {{ leaders: Presentation[], thesis: Presentation[] }}
 * @typedef {{ id: string, date?: string, title: { en: string, es: string } }} Presentation
 */
export const PRESENTATIONS = {
  leaders: [
    { id: 'presentacion-01', date: '2026-10-21', title: { en: 'Start', es: 'Inicio' } },
  ],
  thesis: [
    { id: 'presentacion-01', title: { en: 'Start', es: 'Inicio' } },
    { id: 'presentacion-02', date: '2026-10-27', title: { en: 'From artifacts to decisions', es: 'De artefactos a decisiones' } },
    { id: 'presentacion-03', date: '2026-10-27', title: { en: 'Introduction and state of the art', es: 'Introducción y estado del arte' } },
  ],
}
