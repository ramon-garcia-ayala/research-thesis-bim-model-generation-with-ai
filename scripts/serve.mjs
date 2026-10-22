/*
 * The map's own local server (`npm run dev`): serves the folder as http-server did, no caching, and adds the reader's
 * API (/api/). It listens on 127.0.0.1 only; the phone reaches it through `tailscale serve` (`npm run dev:phone`). It
 * writes files the reader asks for (reading state, approved notes) and never commits.
 */
import http from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runClaude, streamClaude } from './lib/claude.mjs'
import { handleApi, routes, sendJson } from './server/api.mjs'
import { chatRoutes } from './server/chat.mjs'
import { allowed } from './server/guard.mjs'
import { serveStatic } from './server/static.mjs'

/** The server for the map folder `root`; `claude` runs Claude Code, `now` gives the date (tests replace both). */
export function createServer({ root, claude = { run: runClaude, stream: streamClaude }, now = () => new Date() } = {}) {
  const ctx = { root, claude, now, routes: [...routes, ...chatRoutes] }
  const server = http.createServer(async (req, res) => {
    if (!allowed(req, { port: server.address()?.port })) return sendJson(res, 403, { error: 'forbidden' })
    try {
      if (await handleApi(req, res, ctx)) return
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'method not allowed' })
      await serveStatic(root, new URL(req.url, 'http://localhost').pathname, res)
    } catch (e) {
      if (!res.headersSent) sendJson(res, 500, { error: e.message })
      else res.end()
    }
  })
  return server
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4322)
  const server = createServer({ root: process.cwd() })
  server.listen(port, '127.0.0.1', () => console.log(`Research map: http://localhost:${port}/`))
}
