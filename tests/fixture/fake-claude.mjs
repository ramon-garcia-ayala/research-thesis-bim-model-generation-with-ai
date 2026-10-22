/*
 * A stand-in for `claude -p` in tests: logs its arguments and stdin to FAKE_CLAUDE_LOG (one JSON line per call),
 * replies FAKE_CLAUDE_REPLY (in two deltas with --output-format stream-json, else as one result), and fails with
 * FAKE_CLAUDE_FAIL=1. FAKE_CLAUDE_REPLIES (a JSON list) gives one reply per call, in order, counted in the log.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'

const args = process.argv.slice(2)
let stdin = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) stdin += chunk

const log = process.env.FAKE_CLAUDE_LOG
const calls = log && existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).length : 0
if (log) appendFileSync(log, `${JSON.stringify({ args, stdin })}\n`)

const replies = process.env.FAKE_CLAUDE_REPLIES ? JSON.parse(process.env.FAKE_CLAUDE_REPLIES) : null
const reply = replies ? replies[Math.min(calls, replies.length - 1)] : (process.env.FAKE_CLAUDE_REPLY ?? '')
const stream = args[args.indexOf('--output-format') + 1] === 'stream-json'
const out = (o) => process.stdout.write(`${JSON.stringify(o)}\n`)

if (process.env.FAKE_CLAUDE_FAIL === '1') {
  out({ type: 'result', subtype: 'error_during_execution', is_error: true, result: 'Not logged in' })
  process.exit(1)
}
if (stream) {
  out({ type: 'system', subtype: 'init' })
  const half = Math.ceil(reply.length / 2)
  for (const text of [reply.slice(0, half), reply.slice(half)])
    out({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } } })
}
out({ type: 'result', subtype: 'success', is_error: false, result: reply })
