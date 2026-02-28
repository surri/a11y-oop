import puppeteer from 'puppeteer'
import { readFileSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import type { ViewportConfig } from './types'

function findAxeSource(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const direct = path.join(dir, 'node_modules', 'axe-core', 'axe.js')
    if (existsSync(direct)) return readFileSync(direct, 'utf-8')

    const pnpmDir = path.join(dir, 'node_modules', '.pnpm')
    if (existsSync(pnpmDir)) {
      try {
        for (const entry of readdirSync(pnpmDir)) {
          if (entry.startsWith('axe-core@')) {
            const candidate = path.join(pnpmDir, entry, 'node_modules', 'axe-core', 'axe.js')
            if (existsSync(candidate)) return readFileSync(candidate, 'utf-8')
          }
        }
      } catch { /* continue walking up */ }
    }

    dir = path.dirname(dir)
  }
  throw new Error('Could not find axe-core/axe.js. Ensure axe-core is installed.')
}

interface AxeNode {
  html: string
  target: string[]
}

interface AxeViolation {
  id: string
  impact: string | null
  description: string
  nodes: AxeNode[]
}

interface AxeResults {
  violations: AxeViolation[]
}

export interface AxeScanResult {
  id: string
  impact: string | null
  description: string
  nodes: Array<{ html: string; target: string[] }>
}

export async function runAxeScan(
  url: string,
  viewport?: ViewportConfig
): Promise<AxeScanResult[]> {
  const axeSource = findAxeSource()

  const width = viewport?.width ?? 1280
  const height = viewport?.height ?? 800

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height })
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

    await page.evaluate(axeSource)

    const results = await page.evaluate(
      () => (window as unknown as { axe: { run: () => Promise<AxeResults> } }).axe.run()
    )

    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ html: n.html, target: n.target }))
    }))
  } finally {
    await browser.close()
  }
}
