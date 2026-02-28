import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import type { FixPatch, GitHubRepoConfig, LocalSourceConfig, SourceMode } from '@/shared/types'
import { applyPatches } from '@/lib/patch-applier'
import { applyGitHubPatches } from '@/lib/github-patch-applier'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const token = session?.accessToken

    const body = await request.json()
    const patches: FixPatch[] = body.patches
    const sourceMode: SourceMode | undefined = body.sourceMode
    const github: GitHubRepoConfig | undefined = body.github
    const local: LocalSourceConfig | undefined = body.local

    const result =
      sourceMode === 'github' && github
        ? await applyGitHubPatches(github, patches, token)
        : await applyPatches(patches, local?.srcPath)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
