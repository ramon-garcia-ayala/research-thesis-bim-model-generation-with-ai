import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { answerParts, answerQueue, buildQueue, createSpeaker } from '../assets/speech.js'
import { Utterance, fakeSynth } from './fake-speech.js'

const paper = JSON.parse(readFileSync(join(import.meta.dirname, 'fixture/papers/sample-a/paper.json'), 'utf8'))

const voices = [
  { name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
  { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' },
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
]

describe('a chat answer as a queue', () => {
  it('splits by line, then by sentence', () => {
    const text = 'Primera idea. Segunda idea.\n\n- Una lista sin punto\n- Otra'
    expect(answerParts(text).map((p) => text.slice(p.start, p.end).trim())).toEqual(['Primera idea.', 'Segunda idea.', '- Una lista sin punto', '- Otra'])
  })

  it('does not say citations or markdown marks', () => {
    const q = answerQueue('**Valida** cada casa [¶ s2-p1]. Usa `BFS`.', 3)
    expect(q.map((i) => i.text)).toEqual(['Valida cada casa.', 'Usa BFS.'])
    expect(q[0]).toMatchObject({ block: 'chat-3-0', chat: 3 })
  })

  it('skips a part with nothing to say, keeping the numbering of the rest', () => {
    const q = answerQueue('Idea uno.\n[¶ s2-p1]\nIdea dos.', 0)
    expect(q.map((i) => i.block)).toEqual(['chat-0-0', 'chat-0-2'])
  })
})

describe('seek', () => {
  const twoSentences = [
    { block: 'a', text: 'Uno.' },
    { block: 'b', text: 'Dos.' },
    { block: 'c', text: 'Tres.' },
  ]

  it('goes back to a block already read and carries on from there', () => {
    const synth = fakeSynth()
    const s = createSpeaker({ synth, Utterance })
    s.play(twoSentences)
    synth.finish()
    synth.finish()
    expect(s.at().block).toBe('c')
    s.seek('a')
    expect(s.at().block).toBe('a')
    expect(synth.spoken.at(-1).text).toBe('Uno.')
    synth.finish()
    expect(s.at().block).toBe('b')
  })

  it('from a pause it plays again', () => {
    const synth = fakeSynth()
    const s = createSpeaker({ synth, Utterance })
    s.play(twoSentences)
    s.pause()
    s.seek('c')
    expect(s.state()).toBe('playing')
    expect(synth.spoken.at(-1).text).toBe('Tres.')
  })

  it('ignores a block that is not in the queue, or when nothing is being read', () => {
    const synth = fakeSynth()
    const s = createSpeaker({ synth, Utterance })
    s.seek('a')
    expect(synth.speak).not.toHaveBeenCalled()
    s.play(twoSentences)
    s.seek('nope')
    expect(s.at().block).toBe('a')
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })
})

describe('buildQueue', () => {
  it('queues sentences from a point, captions included, references skipped', () => {
    const q = buildQueue(paper, 'en', { block: 's2-p1', offset: 0 })
    expect(q[0].block).toBe('s2-p1')
    expect(q.some((i) => i.block === 'fig-1')).toBe(true)
    expect(q.some((i) => i.block.startsWith('refs'))).toBe(false)
    expect(q.filter((i) => i.block === 's2-p2').map((i) => i.text)).toEqual([
      'A house that fails is sampled again from the same room spec.',
      'Agents trained this way reach 31.4% more goals.',
    ])
  })

  it('starts at the sentence that holds the offset', () => {
    const t = paper.sections[1].blocks[2].text.en
    const q = buildQueue(paper, 'en', { block: 's2-p2', offset: t.indexOf('Agents') + 3 })
    expect(q[0].text).toBe('Agents trained this way reach 31.4% more goals.')
  })

  it('reads the whole paper in the chosen language, falling back to English', () => {
    const q = buildQueue(paper, 'es', null)
    expect(q[0].block).toBe('s1-p1')
    expect(q.find((i) => i.block === 's2-p1').text.startsWith('Un validador')).toBe(true)
  })

  it('reads only a selection', () => {
    const t = paper.sections[1].blocks[2].text.en
    const start = t.indexOf('sampled')
    const q = buildQueue(paper, 'en', null, { block: 's2-p2', start, end: t.indexOf('goals') + 5 })
    expect(q.map((i) => i.text)).toEqual(['sampled again from the same room spec.', 'Agents trained this way reach 31.4% more goals'])
    expect(q[0]).toMatchObject({ block: 's2-p2', start })
  })
})

describe('createSpeaker', () => {
  const setup = () => {
    const synth = fakeSynth(voices)
    const onSentence = vi.fn()
    const onIdle = vi.fn()
    const speaker = createSpeaker({ synth, Utterance, onSentence, onIdle })
    return { synth, onSentence, onIdle, speaker }
  }
  const queue = () => buildQueue(paper, 'en', { block: 's2-p2', offset: 0 })

  it('speaks one sentence after another and reports each', () => {
    const { synth, onSentence, onIdle, speaker } = setup()
    speaker.play(queue())
    expect(synth.spoken.map((u) => u.text)).toEqual(['A house that fails is sampled again from the same room spec.'])
    expect(onSentence).toHaveBeenLastCalledWith(expect.objectContaining({ block: 's2-p2', start: 0 }))
    synth.finish()
    expect(synth.spoken.at(-1).text).toBe('Agents trained this way reach 31.4% more goals.')
    synth.finish()
    expect(speaker.state()).toBe('idle')
    expect(onIdle).toHaveBeenCalled()
  })

  it('pauses, resumes and stops', () => {
    const { synth, onSentence, speaker } = setup()
    speaker.play(queue())
    const first = synth.spoken.at(-1).text
    speaker.pause()
    // The browser's own pause does nothing with remote voices (Chrome's Google voices), so the voice is cancelled.
    expect(synth.cancel).toHaveBeenCalled()
    expect(synth.pause).not.toHaveBeenCalled()
    expect(speaker.state()).toBe('paused')
    expect(speaker.at().text).toBe(first)
    const said = synth.spoken.length
    speaker.resume()
    expect(synth.spoken).toHaveLength(said + 1)
    expect(synth.spoken.at(-1).text).toBe(first)
    expect(speaker.state()).toBe('playing')
    speaker.stop()
    expect(synth.cancel).toHaveBeenCalled()
    expect(onSentence).toHaveBeenLastCalledWith(null)
    expect(speaker.state()).toBe('idle')
    expect(synth.spoken).toHaveLength(said + 1) // the interrupted sentence did not move the queue on
  })

  it('uses the chosen voice and rate, from the sentence being read', () => {
    const { synth, speaker } = setup()
    speaker.play(queue())
    speaker.setRate(1.5)
    speaker.setVoice(voices[0].name)
    const u = synth.spoken.at(-1)
    expect(u.text).toBe('A house that fails is sampled again from the same room spec.')
    expect(u.rate).toBe(1.5)
    expect(u.voice).toBe(voices[0])
  })

  it('speaks in its language, with that language’s first voice when none was chosen', () => {
    const { synth, speaker } = setup()
    speaker.setLang('es')
    speaker.play(queue())
    expect(synth.spoken.at(-1).voice).toBe(voices[0])
    expect(synth.spoken.at(-1).lang).toBe('es-MX')
  })

  it('a chosen voice of the other language gives way to this language’s', () => {
    const { synth, speaker } = setup()
    speaker.setVoice(voices[0].name)
    speaker.setLang('en')
    speaker.play(queue())
    expect(synth.spoken.at(-1).voice).toBe(voices[2])
  })

  it('filters voices by language, natural ones first', () => {
    const { speaker } = setup()
    expect(speaker.voicesFor('es').map((v) => v.lang)).toEqual(['es-MX', 'es-ES'])
    expect(speaker.voicesFor('en')).toHaveLength(1)
  })
})
