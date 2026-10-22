/* A stand-in for the browser's speech, shared by the speech and reader tests. */
import { vi } from 'vitest'

/** A stand-in for speechSynthesis: an utterance ends when the test calls finish(); cancel interrupts it, as browsers do. */
export function fakeSynth(voices = []) {
  let current = null
  const synth = {
    spoken: [],
    speak: vi.fn((u) => {
      synth.spoken.push(u)
      current = u
    }),
    cancel: vi.fn(() => {
      const c = current
      current = null
      c?.onerror?.({ error: 'interrupted' })
      c?.onend?.()
    }),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => voices,
    finish() {
      const c = current
      current = null
      c?.onend?.()
    },
  }
  return synth
}
export class Utterance {
  constructor(text) {
    this.text = text
  }
}
