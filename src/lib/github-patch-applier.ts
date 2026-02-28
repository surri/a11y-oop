import { createFixPR } from './github-client'
import type { FixPatch, FixResult, GitHubRepoConfig } from '@/shared/types'

export async function applyGitHubPatches(config: GitHubRepoConfig, patches: FixPatch[], token?: string): Promise<FixResult> {
  const pr = await createFixPR(config, patches, token)
  return { applied: pr.filesChanged, failed: 0, errors: [], pr }
}
