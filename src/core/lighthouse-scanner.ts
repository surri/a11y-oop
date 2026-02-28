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

interface LighthouseAudit {
  id: string
  title: string
  description?: string
  score: number | null
  displayValue?: string
}

export interface LighthouseAccessibilityResult {
  score: number | null
  audits: LighthouseAudit[]
  report: string | null
}

function parseLighthouseReport(stdout: string): LighthouseAccessibilityResult {
  const report = JSON.parse(stdout)
  const scoreValue = report.categories?.accessibility?.score
  const score = scoreValue == null ? null : Math.round(scoreValue * 100)

  const auditRefs: Array<{ id: string }> = report.categories?.accessibility?.auditRefs ?? []
  const audits: LighthouseAudit[] = []
  for (const ref of auditRefs) {
    const audit = report.audits?.[ref.id]
    if (!audit) continue

    const mapped: LighthouseAudit = {
      id: ref.id,
      title: String(audit.title ?? ref.id),
      description: typeof audit.description === 'string' ? audit.description : undefined,
      score: typeof audit.score === 'number' ? audit.score : null,
      displayValue: typeof audit.displayValue === 'string' ? audit.displayValue : undefined,
    }
    if (mapped.score === 1) continue
    audits.push(mapped)
  }

  const compactReport = JSON.stringify({
    category: 'accessibility',
    url: report.finalUrl ?? report.requestedUrl ?? '',
    score,
    audits,
  })

  return {
    score,
    audits,
    report: compactReport,
  }
}

export function runLighthouseAccessibilityDetailed(url: string): Promise<LighthouseAccessibilityResult> {
  return new Promise((resolvePromise) => {
    const lhBin = findLighthouseBin()
    if (!lhBin) {
      resolvePromise({ score: null, audits: [], report: null })
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
          resolvePromise({ score: null, audits: [], report: null })
          return
        }

        try {
          resolvePromise(parseLighthouseReport(stdout))
        } catch {
          console.error('Failed to parse Lighthouse output')
          resolvePromise({ score: null, audits: [], report: null })
        }
      }
    )
  })
}

export async function runLighthouseAccessibility(url: string): Promise<number | null> {
  const result = await runLighthouseAccessibilityDetailed(url)
  return result.score
}
