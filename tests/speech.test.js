import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { buildQueue, createSpeaker } from '../assets/speech.js'
import { Utterance, fakeSynth } from './fake-speech.js'

const paper = JSON.parse(readFileSync(join(import.meta.dirname, 'fixture/papers/sample-a/paper.json'), 'utf8'))

const voices = [
  { name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
  { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' },
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
]

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
    speaker.pause()
    expect(synth.pause).toHaveBeenCalled()
    expect(speaker.state()).toBe('paused')
    speaker.resume()
    expect(synth.resume).toHaveBeenCalled()
    expect(speaker.state()).toBe('playing')
    speaker.stop()
    expect(synth.cancel).toHaveBeenCalled()
    expect(onSentence).toHaveBeenLastCalledWith(null)
    expect(speaker.state()).toBe('idle')
    expect(synth.spoken).toHaveLength(1) // the interrupted sentence did not move the queue on
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

  it('filters voices by language, natural ones first', () => {
    const { speaker } = setup()
    expect(speaker.voicesFor('es').map((v) => v.lang)).toEqual(['es-MX', 'es-ES'])
    expect(speaker.voicesFor('en')).toHaveLength(1)
  })
})
