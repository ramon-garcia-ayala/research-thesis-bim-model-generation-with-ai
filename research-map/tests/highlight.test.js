import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { start } from '../assets/view.js'

const fromDisk = async (path) => (existsSync(join(import.meta.dirname, '..', path)) ? readFileSync(join(import.meta.dirname, '..', path), 'utf8') : null)

let root
let view
beforeEach(async () => {
  document.body.innerHTML = '<main id="app"></main>'
  root = document.getElementById('app')
  view = await start(root, { load: fromDisk, dir: 'tests/fixture/' })
})

const card = (id) => root.querySelector(`.card[data-id="${id}"]`)
const link = (key) => root.querySelector(`.link[data-key="${key}"]`)
const lit = (id) => card(id).classList.contains('lit')
const dim = (id) => card(id).classList.contains('dim')

describe('highlight', () => {
  it('lights what it is given and dims the rest of the cards', () => {
    view.setLit(['sample-a', 'sample-b'])
    expect(lit('sample-a')).toBe(true)
    expect(lit('sample-b')).toBe(true)
    expect(dim('sample-a')).toBe(false)
    expect(lit('sample-c')).toBe(false)
    expect(dim('sample-c')).toBe(true)
    expect(dim('datasets')).toBe(false) // a group holding a lit node keeps its context
    expect(dim('rules')).toBe(true)
  })

  it('lights a link only when both its ends are lit, and dims the others', () => {
    view.setLit(['sample-a', 'hypothesis', 'sample-b'])
    expect(link('sample-a→hypothesis').classList.contains('lit')).toBe(true)
    expect(link('sample-a→hypothesis').classList.contains('dim')).toBe(false)
    expect(link('idea-1→sample-d').classList.contains('dim')).toBe(true)
    expect(link('sample-b→question').classList.contains('lit')).toBe(false)
    expect(link('sample-b→question').classList.contains('dim')).toBe(true)
  })

  it('lights the question or the hypothesis, and dims the centre when neither is cited', () => {
    view.setLit(['question'])
    expect(root.querySelector('.part[data-id="question"]').classList.contains('lit')).toBe(true)
    expect(root.querySelector('.part[data-id="hypothesis"]').classList.contains('lit')).toBe(false)
    expect(root.querySelector('.card.centre').classList.contains('dim')).toBe(false)
    view.setLit(['sample-a'])
    expect(root.querySelector('.card.centre').classList.contains('dim')).toBe(true)
  })

  it('lights a group when it is cited', () => {
    view.setLit(['rules'])
    expect(lit('rules')).toBe(true)
    expect(dim('datasets')).toBe(true)
  })

  it('null puts everything back', () => {
    view.setLit(['sample-a'])
    view.setLit(null)
    expect(root.querySelectorAll('.card.lit, .card.dim, .link.lit, .link.dim, .part.lit')).toHaveLength(0)
  })

  it('opens a collapsed group when a node inside it is lit', () => {
    card('datasets').click()
    expect(card('sample-a')).toBeNull()
    view.setLit(['sample-a'])
    expect(lit('sample-a')).toBe(true)
  })

  it('ids the map does not have are ignored; only unknown ids light nothing', () => {
    view.setLit(['sample-a', 'no-such-node'])
    expect(lit('sample-a')).toBe(true)
    view.setLit(['no-such-node'])
    expect(root.querySelectorAll('.card.lit, .card.dim')).toHaveLength(0)
  })

  it('a search still hides what does not match, lit or not', () => {
    view.setLit(['sample-a', 'sample-d'])
    view.search('grammars')
    expect(lit('sample-d')).toBe(true)
    expect(lit('sample-a')).toBe(false)
    expect(dim('sample-a')).toBe(true)
  })

  it('survives a redraw: collapsing a group keeps the highlight', () => {
    view.setLit(['sample-d'])
    card('datasets').click()
    expect(lit('sample-d')).toBe(true)
  })
})
