import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import type { FixPatch, GitHubRepoConfig, LocalSourceConfig, SourceMode } from '@/shared/types'
import { applyPatches } from '@/lib/patch-applier'
import { applyGitHubPatches } from '@/lib/github-patch-applier'
import { readComponentFiles } from '@/lib/code-reader'
import { readGitHubComponentFiles } from '@/lib/github-code-reader'
import { analyzeAccessibility } from '@/lib/gemini'

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const token = session?.accessToken

    const body = await request.json()
    const patches: FixPatch[] | undefined = body.patches
    const sourceMode: SourceMode | undefined = body.sourceMode
    const github: GitHubRepoConfig | undefined = body.github
    const local: LocalSourceConfig | undefined = body.local
    const scanContext = body.scanContext as {
      screenshot: string
      lighthouseReport: string | null
    } | undefined

    if (sourceMode !== 'github' && sourceMode !== 'local') {
      throw new HttpError(400, 'sourceMode must be either "github" or "local"')
    }

    const effectivePatches = patches ?? await (async () => {
      if (sourceMode === 'github' && !token) {
        throw new HttpError(401, 'GitHub login required to access repository source.')
      }
      if (sourceMode === 'github' && (!github?.owner || !github?.repo)) {
        throw new HttpError(400, 'github.owner and github.repo are required for GitHub mode')
      }
      if (sourceMode !== 'github' && !local?.srcPath?.trim()) {
        throw new HttpError(400, 'local.srcPath is required for local mode')
      }
      if (!scanContext?.screenshot) {
        throw new HttpError(400, 'scanContext.screenshot is required')
      }

      const sourceFiles =
        sourceMode === 'github' && github
          ? await readGitHubComponentFiles(github, token)
          : await readComponentFiles(local?.srcPath)
      if (Object.keys(sourceFiles).length === 0) {
        throw new HttpError(
          400,
          sourceMode === 'github'
            ? 'No readable source files were found in the selected repository path.'
            : 'No source files were found in local.srcPath. Verify the directory and file pattern.'
        )
      }

      let analysis: Awaited<ReturnType<typeof analyzeAccessibility>>
      try {
        analysis = await analyzeAccessibility(
          scanContext.screenshot,
          `Lighthouse accessibility findings:\n${scanContext.lighthouseReport ?? 'No Lighthouse report payload was provided.'}`,
          sourceFiles,
          1280,
          'runtime+code'
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('GEMINI_API_KEY')) {
          throw new HttpError(503, message)
        }
        throw new HttpError(502, `Failed to generate fixes from Lighthouse findings: ${message}`)
      }

      return analysis.issues
        .filter((issue) => issue.filePath && issue.currentCode && issue.fixedCode)
        .map((issue) => ({
          filePath: issue.filePath!,
          original: issue.currentCode!,
          replacement: issue.fixedCode!,
        }))
    })()

    const result =
      effectivePatches.length === 0
        ? { applied: 0, failed: 0, errors: ['No source-mapped fixes were generated from Lighthouse findings.'] }
        : sourceMode === 'github' && github
          ? await applyGitHubPatches(github, effectivePatches, token)
          : await applyPatches(effectivePatches, local?.srcPath)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Fix route failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
