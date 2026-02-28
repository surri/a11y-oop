import { NextResponse } from 'next/server'
import type { RescanResult } from '@/shared/types'
import { captureScreenshot } from '@/lib/puppeteer'
import { runLighthouseAccessibilityDetailed } from '@/lib/lighthouse-scanner'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, beforeScreenshot, beforeScore, beforeLighthouseScore } = body as {
      url: string
      beforeScreenshot: string
      beforeScore: number
      beforeLighthouseScore: number | null
    }
    const beforeIssueCount = body.beforeIssueCount as number ?? 0

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const [newScreenshot, lighthouse] = await Promise.all([
      captureScreenshot(url),
      runLighthouseAccessibilityDetailed(url),
    ])

    const afterScore = lighthouse.score ?? beforeScore
    const afterIssueCount = lighthouse.audits.length

    const rescanResult: RescanResult = {
      before: {
        screenshot: beforeScreenshot,
        score: beforeScore,
        lighthouseScore: beforeLighthouseScore ?? null,
      },
      after: {
        screenshot: newScreenshot,
        score: afterScore,
        lighthouseScore: lighthouse.score,
      },
      issuesFixed: Math.max(0, beforeIssueCount - afterIssueCount),
      issuesRemaining: afterIssueCount,
    }

    return NextResponse.json(rescanResult)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
