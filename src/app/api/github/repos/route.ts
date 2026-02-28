import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOctokit } from '@/core'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'GitHub login required to access repository source.' },
        { status: 401 }
      )
    }

    const octokit = createOctokit(session.accessToken)
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      type: 'all',
    })

    const repos = data.map((repo) => ({
      full_name: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      default_branch: repo.default_branch,
      private: repo.private,
      description: repo.description,
    }))

    return NextResponse.json(repos)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch repos' },
      { status: 500 }
    )
  }
}
