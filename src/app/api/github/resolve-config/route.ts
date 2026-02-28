import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { resolveRepoConfig } from '@/lib/github-client'
import type { GitHubRepoConfig } from '@/shared/types'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const token = session?.accessToken
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub login required to access repository source.' },
        { status: 401 }
      )
    }

    const body = await request.json() as GitHubRepoConfig
    const { owner, repo } = body

    if (!owner || !repo) {
      return NextResponse.json({ error: 'owner and repo are required' }, { status: 400 })
    }

    const resolved = await resolveRepoConfig(body, token)
    return NextResponse.json(resolved)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve repository config' },
      { status: 500 }
    )
  }
}
