import { execFile } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

function findLighthouseBin(): string | null {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const direct = path.join(dir, 'node_modules', '.bin', 'lighthouse')
    if (existsSync(direct)) return direct

    const pnpmDir = path.join(dir, 'node_modules', '.pnpm')
    if (existsSync(pnpmDir)) {
      try {
        for (const entry of readdirSync(pnpmDir)) {
          if (entry.startsWith('lighthouse@')) {
            const candidate = path.join(pnpmDir, entry, 'node_modules', 'lighthouse', 'cli', 'index.js')
            if (existsSync(candidate)) return candidate
          }
        }
      } catch { /* continue walking up */ }
    }

    dir = path.dirname(dir)
  }
  return null
}

export function runLighthouseAccessibility(url: string): Promise<number | null> {
  return new Promise((resolvePromise) => {
    const lhBin = findLighthouseBin()
    if (!lhBin) {
      resolvePromise(null)
      return
    }

    const args = lhBin.endsWith('.js')
      ? [lhBin, url]
      : [url]
    const cmd = lhBin.endsWith('.js') ? process.execPath : lhBin

    execFile(
      cmd,
      [
        ...args,
        '--output=json',
        '--quiet',
        '--chrome-flags=--headless --no-sandbox --disable-setuid-sandbox',
        '--only-categories=accessibility',
        '--preset=desktop',
      ],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error || !stdout) {
          console.error('Lighthouse scan failed:', error?.message)
          resolvePromise(null)
          return
        }

        try {
          const report = JSON.parse(stdout)
          const score = report.categories?.accessibility?.score
          if (score == null) {
            resolvePromise(null)
            return
          }
          resolvePromise(Math.round(score * 100))
        } catch {
          console.error('Failed to parse Lighthouse output')
          resolvePromise(null)
        }
      }
    )
  })
}
