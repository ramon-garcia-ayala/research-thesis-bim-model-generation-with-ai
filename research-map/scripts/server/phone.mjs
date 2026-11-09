/*
 * The phone: `npm run dev:phone` runs `tailscale serve <port>` in the foreground beside the server, which gives the
 * author's private tailnet an HTTPS address for the map, and stops it when the server stops. Nothing is installed or
 * left running.
 */
import { execFileSync, spawn as spawnChild } from 'node:child_process'

/** The command that serves `port` on the tailnet while it runs. */
export const phoneCommand = (port) => ({ cmd: 'tailscale', args: ['serve', String(port)] })

const tailscaleStatus = () => JSON.parse(execFileSync('tailscale', ['status', '--json'], { encoding: 'utf8', windowsHide: true }))

/** Starts `tailscale serve` for `port`, prints the phone's address, and stops it with the server. */
export function startPhone({ port, spawn = spawnChild, proc = process, status = tailscaleStatus, log = console.log }) {
  const { cmd, args } = phoneCommand(port)
  const child = spawn(cmd, args, { stdio: 'inherit', windowsHide: true })
  let name = ''
  try {
    name = String(status()?.Self?.DNSName ?? '').replace(/\.$/, '')
  } catch {
    name = ''
  }
  log(
    name
      ? `On the phone (Tailscale on): https://${name}/`
      : 'Tailscale is not running or not signed in on this laptop: start it and sign in, then run npm run dev:phone again.',
  )
  const stop = () => child.kill()
  proc.on('exit', stop)
  for (const signal of ['SIGINT', 'SIGTERM'])
    proc.on(signal, () => {
      stop()
      proc.exit(0)
    })
  child.on?.('error', (e) => log(`tailscale serve could not start: ${e.message}`))
  return child
}
