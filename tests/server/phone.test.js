// @vitest-environment node
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { phoneCommand, startPhone } from '../../scripts/server/phone.mjs'

/** A process stand-in: events, and an exit that is only recorded. */
const fakeProcess = () => Object.assign(new EventEmitter(), { exit: vi.fn() })
const fakeChild = () => Object.assign(new EventEmitter(), { kill: vi.fn() })

describe('the phone', () => {
  it('serves the port on the tailnet in the foreground', () => expect(phoneCommand(4322)).toEqual({ cmd: 'tailscale', args: ['serve', '4322'] }))

  it('starts tailscale serve and prints the tailnet address', () => {
    const child = fakeChild()
    const spawn = vi.fn(() => child)
    const log = vi.fn()
    startPhone({ port: 4322, spawn, proc: fakeProcess(), status: () => ({ Self: { DNSName: 'laptop.tail1234.ts.net.' } }), log })
    expect(spawn).toHaveBeenCalledWith('tailscale', ['serve', '4322'], expect.objectContaining({ stdio: 'inherit' }))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('https://laptop.tail1234.ts.net/'))
  })

  it('says how to start Tailscale when it is not running', () => {
    const log = vi.fn()
    startPhone({ port: 4322, spawn: () => fakeChild(), proc: fakeProcess(), status: () => ({ BackendState: 'NoState', Self: { DNSName: '' } }), log })
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/Tailscale/))
  })

  it('stops tailscale serve when the server stops', () => {
    const child = fakeChild()
    const proc = fakeProcess()
    startPhone({ port: 4322, spawn: () => child, proc, status: () => ({}), log: () => {} })
    proc.emit('exit')
    expect(child.kill).toHaveBeenCalled()
  })

  it('stops it on Ctrl+C too, and ends the server', () => {
    const child = fakeChild()
    const proc = fakeProcess()
    startPhone({ port: 4322, spawn: () => child, proc, status: () => ({}), log: () => {} })
    proc.emit('SIGINT')
    expect(child.kill).toHaveBeenCalled()
    expect(proc.exit).toHaveBeenCalled()
  })
})
