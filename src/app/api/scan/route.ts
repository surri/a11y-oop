import { NextResponse } from 'next/server'
import { captureScreenshot } from '@/lib/puppeteer'
import { runLighthouseAccessibilityDetailed } from '@/lib/lighthouse-scanner'
import type { A11yIssue, ScanResult } from '@/shared/types'

function toSeverity(score: number | null): A11yIssue['severity'] {
  if (score === null) return 'moderate'
  if (score <= 0) return 'serious'
  if (score < 0.5) return 'moderate'
  return 'minor'
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string }
    const runtimeUrl = body.url?.trim()
    if (!runtimeUrl) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const [screenshot, lighthouse] = await Promise.all([
      captureScreenshot(runtimeUrl),
      runLighthouseAccessibilityDetailed(runtimeUrl),
    ])

    const issues: A11yIssue[] = lighthouse.audits.map((audit, idx) => ({
      id: `${audit.id}-${idx}`,
      component: audit.id,
      filePath: undefined,
      severity: toSeverity(audit.score),
      wcagCriteria: audit.id,
      description: `${audit.title}${audit.description ? ` - ${audit.description}` : ''}`,
      currentCode: audit.displayValue,
      fixedCode: undefined,
      line: undefined,
      sourceReady: false,
    }))

    const score = lighthouse.score ?? Math.max(0, 100 - issues.length * 7)
    const summary = issues.length === 0
      ? 'Lighthouse did not report accessibility findings.'
      : `Lighthouse reported ${issues.length} accessibility finding${issues.length !== 1 ? 's' : ''}.`

    const result: ScanResult = {
      url: runtimeUrl,
      mode: 'runtime-dom',
      timestamp: new Date().toISOString(),
      screenshot,
      score,
      lighthouseScore: lighthouse.score,
      summary,
      issues,
      axeViolationCount: issues.length,
      lighthouseFindings: lighthouse.audits,
      lighthouseReport: lighthouse.report,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Scan failed:', error)
    return NextResponse.json(
      { error: 'Scan failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
