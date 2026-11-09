/*
 * The server drives Claude Code on this laptop, so only the map itself may talk to it: the Host must be this machine
 * (or its Tailscale name), and a write must be JSON from the same origin. Another site in the browser, or a DNS name
 * rebound to 127.0.0.1, is refused before anything runs.
 */

const TAILNET = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.ts\.net$/i

/** True when request `req` may be served by the server listening on `port`. */
export function allowed(req, { port }) {
  const host = String(req.headers.host ?? '').toLowerCase()
  const local = host === `localhost:${port}` || host === `127.0.0.1:${port}`
  if (!local && !TAILNET.test(host)) return false
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return false
    const origin = req.headers.origin
    if (origin !== undefined && origin !== `http://${host}` && origin !== `https://${host}`) return false
  }
  return true
}
