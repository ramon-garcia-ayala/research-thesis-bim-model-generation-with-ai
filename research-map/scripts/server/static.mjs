/* The map's files, served as they are: never outside the folder, never a dot folder or node_modules, never cached. */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const notFound = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' })
  res.end('Not found')
}

/** Serves the file at URL path `pathname` from `root`, or 404. */
export async function serveStatic(root, pathname, res) {
  let path
  try {
    path = decodeURIComponent(pathname)
  } catch {
    return notFound(res)
  }
  const segments = path.split(/[\\/]+/).filter(Boolean)
  if (segments.some((s) => s.startsWith('.') || s === 'node_modules')) return notFound(res)
  const base = resolve(root)
  let file = resolve(join(base, ...segments))
  if (file !== base && !file.startsWith(base + sep)) return notFound(res)
  try {
    let info = await stat(file)
    if (info.isDirectory()) {
      file = join(file, 'index.html')
      info = await stat(file)
    }
    if (!info.isFile()) return notFound(res)
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    })
    createReadStream(file).pipe(res)
  } catch {
    notFound(res)
  }
}
