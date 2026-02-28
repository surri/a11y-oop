import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { captureScreenshot } from '@/lib/puppeteer'
import { runAxeScan } from '@/lib/axe-scanner'
import { readComponentFiles } from '@/lib/code-reader'
import { readGitHubComponentFiles } from '@/lib/github-code-reader'
import { analyzeAccessibility } from '@/lib/gemini'
import { runLighthouseAccessibility } from '@/lib/lighthouse-scanner'
import type { ScanResult, GitHubRepoConfig, LocalSourceConfig, SourceMode } from '@/shared/types'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const token = session?.accessToken

    const body = await request.json() as { url: string; sourceMode?: SourceMode; github?: GitHubRepoConfig; local?: LocalSourceConfig }
    const { url, sourceMode, github, local } = body

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const sourceFilesPromise =
      sourceMode === 'github' && github
        ? readGitHubComponentFiles(github, token)
        : readComponentFiles(local?.srcPath)

    const [screenshot, axeViolations, sourceFiles, lighthouseScore] = await Promise.all([
      captureScreenshot(url),
      runAxeScan(url),
      sourceFilesPromise,
      runLighthouseAccessibility(url),
    ])

    const analysisResult = await analyzeAccessibility(
      screenshot,
      JSON.stringify(axeViolations, null, 2),
      sourceFiles,
      1280
    )
    const { issues, score, summary } = analysisResult

    const result: ScanResult = {
      url,
      timestamp: new Date().toISOString(),
      screenshot,
      score,
      lighthouseScore,
      summary,
      issues,
      axeViolationCount: axeViolations.length
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
