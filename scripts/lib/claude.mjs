/*
 * Running Claude Code's `claude -p` on the author's own login: the prompt on stdin, every call isolated (no session
 * saved, no settings, no MCP servers) and given only the tools it names. Used to prepare papers (translation, idea
 * graph) and by the local server for the reader's chat.
 */
import { spawn } from 'node:child_process'

/** The command that runs Claude Code: CLAUDE_BIN when set, else `claude` on the PATH. */
export const defaultBin = () => (process.env.CLAUDE_BIN ? [process.env.CLAUDE_BIN] : ['claude'])

/** The arguments of one isolated `claude -p` call. */
export function claudeArgs({ model, effort, tools = [], system, stream = false }) {
  const args = ['-p', '--model', model, '--no-session-persistence', '--setting-sources', '', '--strict-mcp-config', '--tools', tools.join(',')]
  if (effort) args.push('--effort', effort)
  if (system) args.push('--append-system-prompt', system)
  if (stream) args.push('--output-format', 'stream-json', '--verbose', '--include-partial-messages')
  else args.push('--output-format', 'json')
  return args
}

/** One line of stream-json output: a text delta, the final result, an error, or null for anything else. */
export function parseStreamLine(line) {
  let o
  try {
    o = JSON.parse(line)
  } catch {
    return null
  }
  if (o?.type === 'stream_event' && o.event?.type === 'content_block_delta' && o.event.delta?.type === 'text_delta')
    return { delta: o.event.delta.text }
  if (o?.type === 'result') return o.is_error ? { error: o.result || o.subtype || 'failed' } : { result: o.result ?? '' }
  return null
}

function call({ prompt, model, effort, tools, system, cwd, bin = defaultBin(), timeoutMs = 900000, env, stream, onDelta }) {
  return new Promise((resolve, reject) => {
    const fail = (message) => reject(new Error(`claude: ${message}`))
    let child
    try {
      child = spawn(bin[0], [...bin.slice(1), ...claudeArgs({ model, effort, tools, system, stream })], {
        cwd,
        env: { ...process.env, ...env },
        shell: false,
        windowsHide: true,
      })
    } catch (e) {
      return fail(e.message)
    }
    let result = null
    let error = null
    let buffer = ''
    let stderr = ''
    const timer = setTimeout(() => {
      error = `timed out after ${Math.round(timeoutMs / 1000)} s`
      child.kill()
    }, timeoutMs)
    const take = (line) => {
      const r = parseStreamLine(line)
      if (r?.delta !== undefined) onDelta?.(r.delta)
      if (r?.result !== undefined) result = r.result
      if (r?.error !== undefined) error = r.error
    }
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) take(line)
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (e) => {
      clearTimeout(timer)
      fail(e.message)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (buffer) take(buffer)
      if (error) return fail(error)
      if (code !== 0) return fail(stderr.trim() || `exited with code ${code}`)
      if (result === null) return fail('no result in the output')
      resolve(result)
    })
    child.stdin.on('error', () => {}) // a child that dies early closes stdin; the exit reports why
    child.stdin.end(prompt)
  })
}

/** Run one call and resolve its whole reply. */
export const runClaude = (opts) => call({ ...opts, stream: false })

/** Run one call, passing each piece of the reply to `onDelta` as it comes; resolves the whole reply. */
export const streamClaude = (opts) => call({ ...opts, stream: true })
