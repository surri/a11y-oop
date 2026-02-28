import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { validateRepoAccess } from '@/lib/github-client'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const token = session?.accessToken

    const body = await request.json() as { owner: string; repo: string }
    const { owner, repo } = body

    if (!owner || !repo) {
      return NextResponse.json({ error: 'owner and repo are required' }, { status: 400 })
    }

    const result = await validateRepoAccess(owner, repo, token)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
