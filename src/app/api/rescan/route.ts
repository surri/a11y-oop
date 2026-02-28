import { NextResponse } from 'next/server'
import type { RescanResult, GitHubRepoConfig, LocalSourceConfig, SourceMode } from '@/shared/types'
import { captureScreenshot } from '@/lib/puppeteer'
import { runAxeScan } from '@/lib/axe-scanner'
import { readComponentFiles } from '@/lib/code-reader'
import { readGitHubComponentFiles } from '@/lib/github-code-reader'
import { analyzeAccessibility } from '@/lib/gemini'
import { runLighthouseAccessibility } from '@/lib/lighthouse-scanner'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, beforeScreenshot, beforeScore, beforeLighthouseScore } = body as {
      url: string
      beforeScreenshot: string
      beforeScore: number
      beforeLighthouseScore: number | null
    }
    const sourceMode: SourceMode | undefined = body.sourceMode
    const github: GitHubRepoConfig | undefined = body.github
    const local: LocalSourceConfig | undefined = body.local

    const beforeIssueCount = body.beforeIssueCount as number ?? 0

    const sourceFilesPromise =
      sourceMode === 'github' && github
        ? readGitHubComponentFiles(github)
        : readComponentFiles(local?.srcPath)

    const [newScreenshot, axeResults, componentFiles, lighthouseScore] = await Promise.all([
      captureScreenshot(url),
      runAxeScan(url),
      sourceFilesPromise,
      runLighthouseAccessibility(url),
    ])
    const newResult = await analyzeAccessibility(
      newScreenshot,
      JSON.stringify(axeResults, null, 2),
      componentFiles,
      1280
    )

    const rescanResult: RescanResult = {
      before: {
        screenshot: beforeScreenshot,
        score: beforeScore,
        lighthouseScore: beforeLighthouseScore ?? null,
      },
      after: {
        screenshot: newScreenshot,
        score: newResult.score,
        lighthouseScore: lighthouseScore,
      },
      issuesFixed: beforeIssueCount - newResult.issues.length,
      issuesRemaining: newResult.issues.length,
    }

    return NextResponse.json(rescanResult)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
