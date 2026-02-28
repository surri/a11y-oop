import {
  createOctokit,
  readRepoFiles as coreReadRepoFiles,
  createFixPR as coreCreateFixPR,
  validateRepoAccess as coreValidateRepoAccess,
} from '@/core'
import type { GitHubRepoConfig, FixPatch, GitHubPrResult } from '@/shared/types'

function getOctokit(token?: string) {
  const resolved = token ?? process.env.GITHUB_TOKEN
  if (!resolved) {
    throw new Error('No GitHub token provided and GITHUB_TOKEN environment variable is not set')
  }
  return createOctokit(resolved)
}

export async function readRepoFiles(config: GitHubRepoConfig, token?: string): Promise<Record<string, string>> {
  return coreReadRepoFiles(getOctokit(token), config)
}

export async function createFixPR(config: GitHubRepoConfig, patches: FixPatch[], token?: string): Promise<GitHubPrResult> {
  return coreCreateFixPR(getOctokit(token), config, patches)
}

export async function validateRepoAccess(
  owner: string,
  repo: string,
  token?: string
): Promise<{ valid: boolean; defaultBranch: string }> {
  return coreValidateRepoAccess(getOctokit(token), owner, repo)
}
