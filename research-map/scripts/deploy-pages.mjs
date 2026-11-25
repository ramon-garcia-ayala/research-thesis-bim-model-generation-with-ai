// Publishes the public site: stages it (build-pages.mjs) and force-pushes it as the single commit of the `gh-pages`
// branch, which GitHub Pages serves. The branch holds the built site only, never the repo's history.
//
//   npm run pages          (from research-map/)
//
// Pages is set to the `gh-pages` branch, `/` (Settings → Pages). If the push answers "Repository not found", the active
// `gh` account is not the one that owns the repo: run it with
//   GH_TOKEN="$(gh auth token --user ramon-garcia-ayala)" npm run pages

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildPages, DECK } from './build-pages.mjs'

const run = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

const remote = run(process.cwd(), 'remote', 'get-url', 'origin')
const author = { name: run(process.cwd(), 'config', 'user.name'), email: run(process.cwd(), 'config', 'user.email') }
const dir = mkdtempSync(join(tmpdir(), 'pages-'))
try {
  const site = join(dir, 'site')
  const files = buildPages(site)
  run(site, 'init', '-q', '-b', 'gh-pages')
  run(site, 'add', '-A')
  run(site, '-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'commit', '-q', '-m', `Publish ${DECK.id} (built by research-map/scripts/build-pages.mjs)`)
  run(site, '-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '-f', remote, 'gh-pages')
  console.log(`published ${files.length} files of ${DECK.id} to gh-pages`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
