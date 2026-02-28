import { readRepoFiles } from './github-client'
import type { GitHubRepoConfig } from '@/shared/types'

export async function readGitHubComponentFiles(config: GitHubRepoConfig, token?: string): Promise<Record<string, string>> {
  return readRepoFiles(config, token)
}
