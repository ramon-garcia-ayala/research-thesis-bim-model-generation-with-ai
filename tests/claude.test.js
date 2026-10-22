import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { claudeArgs, defaultBin, parseStreamLine, runClaude, streamClaude } from '../scripts/lib/claude.mjs'

const bin = [process.execPath, join(import.meta.dirname, 'fixture', 'fake-claude.mjs')]
let log
const lastLog = () => JSON.parse(readFileSync(log, 'utf8').trim().split('\n').at(-1))

beforeEach(() => {
  log = join(mkdtempSync(join(tmpdir(), 'claude-')), 'log.jsonl')
  process.env.FAKE_CLAUDE_LOG = log
  process.env.FAKE_CLAUDE_REPLY = 'hola mundo'
})

describe('claudeArgs', () => {
  it('isolates every call and passes no tools by default', () => {
    const a = claudeArgs({ model: 'claude-sonnet-5-5', effort: 'low' })
    expect(a).toEqual(expect.arrayContaining(['-p', '--no-session-persistence', '--strict-mcp-config', '--effort', 'low']))
    expect(a[a.indexOf('--model') + 1]).toBe('claude-sonnet-5-5')
    expect(a[a.indexOf('--tools') + 1]).toBe('')
    expect(a[a.indexOf('--setting-sources') + 1]).toBe('')
    expect(a[a.indexOf('--output-format') + 1]).toBe('json')
  })

  it('names the tools, the system prompt and the stream format when asked', () => {
    const a = claudeArgs({ model: 'claude-haiku-5-5', tools: ['Read', 'WebSearch'], system: 'S', stream: true })
    expect(a[a.indexOf('--tools') + 1]).toBe('Read,WebSearch')
    expect(a[a.indexOf('--append-system-prompt') + 1]).toBe('S')
    expect(a).toEqual(expect.arrayContaining(['--output-format', 'stream-json', '--verbose', '--include-partial-messages']))
    expect(a).not.toContain('--effort')
  })
})

describe('parseStreamLine', () => {
  it('reads text deltas and the result', () => {
    expect(parseStreamLine('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"ho"}}}')).toEqual({ delta: 'ho' })
    expect(parseStreamLine('{"type":"result","subtype":"success","is_error":false,"result":"hola"}')).toEqual({ result: 'hola' })
    expect(parseStreamLine('{"type":"system","subtype":"init"}')).toBeNull()
  })
  it('reads an error result', () =>
    expect(parseStreamLine('{"type":"result","subtype":"error_max_turns","is_error":true}')).toEqual({ error: 'error_max_turns' }))
  it('ignores a line that is not JSON', () => expect(parseStreamLine('warning: something')).toBeNull())
})

describe('running claude', () => {
  it('uses CLAUDE_BIN when set', () => {
    process.env.CLAUDE_BIN = 'C:/bin/claude.exe'
    expect(defaultBin()).toEqual(['C:/bin/claude.exe'])
    delete process.env.CLAUDE_BIN
    expect(defaultBin()).toEqual(['claude'])
  })

  it('sends the prompt on stdin and resolves the reply', async () => {
    await expect(runClaude({ prompt: 'P', model: 'm', bin })).resolves.toBe('hola mundo')
    expect(lastLog().stdin).toBe('P')
  })

  it('streams deltas', async () => {
    const seen = []
    await expect(streamClaude({ prompt: 'P', model: 'm', bin, onDelta: (d) => seen.push(d) })).resolves.toBe('hola mundo')
    expect(seen.join('')).toBe('hola mundo')
  })

  it('rejects when claude fails', () => expect(runClaude({ prompt: 'P', model: 'm', bin, env: { FAKE_CLAUDE_FAIL: '1' } })).rejects.toThrow(/^claude: /))

  it('rejects a stream when claude fails', () =>
    expect(streamClaude({ prompt: 'P', model: 'm', bin, env: { FAKE_CLAUDE_FAIL: '1' }, onDelta: () => {} })).rejects.toThrow(/^claude: Not logged in/))

  it('rejects when the binary is missing', () => expect(runClaude({ prompt: 'P', model: 'm', bin: ['no-such-claude-binary'] })).rejects.toThrow(/^claude: /))

  it('kills a call that takes too long', () =>
    expect(runClaude({ prompt: 'P', model: 'm', bin: [process.execPath, '-e', 'setTimeout(() => {}, 60000)', '--'], timeoutMs: 200 })).rejects.toThrow(/^claude: .*timed out/))
})
