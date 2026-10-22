/*
 * Reading a paper aloud with the browser's own voices (speechSynthesis): the text as a queue of sentences, spoken one
 * utterance at a time (which also avoids Chromium cutting long utterances off), each reported so the reader can light
 * it. Pure apart from the `synth` it is given.
 */
import { blocksOf, sentences, textOf } from './paper.js'

const SPOKEN = ['heading', 'paragraph', 'figure', 'table']

/** The sentences of `text` (from character `base` of its block) as queue items. */
const itemsOf = (block, text, base = 0) =>
  sentences(text).map(({ start, end }) => ({ block, start: base + start, end: base + end, text: text.slice(start, end).trim() }))

/**
 * What to read, one item per sentence: the whole paper (`from` null), from a point on (`from` = a block and an offset
 * in its text), or only a selection (`only`). Figures and tables are read by their caption; references and equations
 * are skipped.
 */
export function buildQueue(paper, lang, from = null, only = null) {
  const blocks = blocksOf(paper).filter((b) => b.section !== 'refs' && SPOKEN.includes(b.type))
  if (only) {
    const b = blocks.find((x) => x.id === only.block)
    return b ? itemsOf(b.id, textOf(b, lang).slice(only.start, only.end), only.start) : []
  }
  const first = from ? Math.max(0, blocks.findIndex((b) => b.id === from.block)) : 0
  const queue = []
  blocks.slice(first).forEach((b, i) => {
    const items = itemsOf(b.id, textOf(b, lang))
    const offset = i === 0 && from?.offset ? from.offset : 0
    queue.push(...items.filter((it) => it.end > offset))
  })
  return queue
}

/**
 * A speaker over `synth` (speechSynthesis) and `Utterance` (SpeechSynthesisUtterance). `onSentence(item | null)`
 * reports the sentence being spoken (null once stopped); `onIdle()` the end of the queue.
 */
export function createSpeaker({ synth, Utterance, onSentence = () => {}, onIdle = () => {} }) {
  let queue = []
  let index = 0
  let state = 'idle'
  let rate = 1
  let voiceName = null
  let turn = 0 // each utterance belongs to a turn; an interrupted one must not move the queue on

  const voices = () => synth.getVoices?.() ?? []

  function speakAt(i) {
    const mine = ++turn
    index = i
    if (index >= queue.length) {
      state = 'idle'
      onSentence(null)
      onIdle()
      return
    }
    const item = queue[index]
    const u = new Utterance(item.text)
    u.rate = rate
    const voice = voices().find((v) => v.name === voiceName)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.onend = () => {
      if (mine === turn && state === 'playing') speakAt(index + 1)
    }
    u.onerror = () => {} // interrupted by stop, a new queue or a change of voice: the new turn carries on
    state = 'playing'
    onSentence(item)
    synth.speak(u)
  }

  function interrupt() {
    turn++
    synth.cancel()
  }

  return {
    play(q) {
      interrupt()
      queue = q
      speakAt(0)
    },
    pause() {
      if (state !== 'playing') return
      state = 'paused'
      synth.pause()
    },
    resume() {
      if (state !== 'paused') return
      state = 'playing'
      synth.resume()
    },
    stop() {
      if (state === 'idle') return
      state = 'idle'
      interrupt()
      onSentence(null)
    },
    /** Moves `delta` blocks back or forward from the sentence being read. */
    skip(delta) {
      if (state === 'idle' || !queue.length) return
      const blocks = [...new Set(queue.map((q) => q.block))]
      const target = blocks[Math.min(blocks.length - 1, Math.max(0, blocks.indexOf(queue[index].block) + delta))]
      interrupt()
      speakAt(queue.findIndex((q) => q.block === target))
    },
    setRate(r) {
      rate = r
      if (state === 'playing') {
        interrupt()
        speakAt(index)
      }
    },
    setVoice(name) {
      voiceName = name
      if (state === 'playing') {
        interrupt()
        speakAt(index)
      }
    },
    /** The voices for `lang` ('en' | 'es'), natural ones and Mexico's first. */
    voicesFor(lang) {
      const score = (v) => (/natural/i.test(v.name) ? 0 : 2) + (v.lang === 'es-MX' ? 0 : 1)
      return voices()
        .filter((v) => String(v.lang).toLowerCase().startsWith(lang))
        .sort((a, b) => score(a) - score(b))
    },
    state: () => state,
    at: () => (state === 'idle' ? null : (queue[index] ?? null)),
  }
}
