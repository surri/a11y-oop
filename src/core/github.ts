import { Octokit } from '@octokit/rest'
import type { GitHubRepoConfig, GitHubResolvedConfig, FixPatch, GitHubPrResult } from '@/shared/types'

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token })
}

const DEFAULT_FILE_PATTERN = '**/*.{tsx,jsx}'
const DEFAULT_EXTENSIONS = ['.tsx', '.jsx']

function normalizeSrcPath(srcPath?: string): string | undefined {
  if (!srcPath) return undefined
  const normalized = srcPath.replace(/^\/+|\/+$/g, '')
  return normalized.length > 0 ? normalized : undefined
}

function extractExtensions(filePattern: string): string[] {
  const multiExtMatch = filePattern.match(/\*\.\{([^}]+)\}$/)
  if (multiExtMatch) {
    const extensions = multiExtMatch[1]
      .split(',')
      .map((ext) => ext.trim().replace(/^\./, ''))
      .filter(Boolean)
      .map((ext) => `.${ext}`)
    if (extensions.length > 0) {
      return extensions
    }
  }

  const singleExtMatch = filePattern.match(/\*\.([a-zA-Z0-9]+)$/)
  if (singleExtMatch) {
    return [`.${singleExtMatch[1]}`]
  }

  return DEFAULT_EXTENSIONS
}

function detectMonorepoSrcPath(paths: string[], scope: 'apps' | 'packages'): string | undefined {
  const counts = new Map<string, number>()
  const prefixRegex = new RegExp(`^${scope}/[^/]+/src/`)

  for (const filePath of paths) {
    if (!prefixRegex.test(filePath)) continue
    const segments = filePath.split('/')
    if (segments.length < 3) continue
    const prefix = `${segments[0]}/${segments[1]}/src`
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0])
  })

  return sorted[0]?.[0]
}

function detectSrcPath(blobPaths: string[]): string | undefined {
  if (blobPaths.some((filePath) => filePath.startsWith('src/'))) {
    return 'src'
  }
  if (blobPaths.some((filePath) => filePath.startsWith('app/'))) {
    return 'app'
  }

  const appsSrc = detectMonorepoSrcPath(blobPaths, 'apps')
  if (appsSrc) {
    return appsSrc
  }

  const packagesSrc = detectMonorepoSrcPath(blobPaths, 'packages')
  if (packagesSrc) {
    return packagesSrc
  }

  return undefined
}

async function getRepoTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<{ tree: NonNullable<Awaited<ReturnType<Octokit['git']['getTree']>>['data']['tree']> }> {
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  })
  const commitSha = refData.object.sha

  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: commitSha,
  })
  const treeSha = commitData.tree.sha

  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: '1',
  })

  return {
    tree: treeData.tree ?? [],
  }
}

export async function resolveRepoConfig(
  octokit: Octokit,
  config: GitHubRepoConfig
): Promise<GitHubResolvedConfig> {
  if (!config.owner || !config.repo) {
    throw new Error('owner and repo are required')
  }

  let branch = config.branch
  if (!branch) {
    const { data } = await octokit.repos.get({
      owner: config.owner,
      repo: config.repo,
    })
    branch = data.default_branch
  }

  const normalizedSrcPath = normalizeSrcPath(config.srcPath)
  const filePattern = config.filePattern ?? DEFAULT_FILE_PATTERN

  if (normalizedSrcPath) {
    return {
      owner: config.owner,
      repo: config.repo,
      branch,
      srcPath: normalizedSrcPath,
      filePattern,
      resolutionMode: 'explicit',
    }
  }

  const { tree } = await getRepoTree(octokit, config.owner, config.repo, branch)
  const extensions = extractExtensions(filePattern)
  const blobPaths = tree
    .filter((item) => item.type === 'blob' && item.path)
    .map((item) => item.path!)
    .filter((filePath) => extensions.some((ext) => filePath.endsWith(ext)))

  const detectedSrcPath = detectSrcPath(blobPaths)
  if (detectedSrcPath) {
    return {
      owner: config.owner,
      repo: config.repo,
      branch,
      srcPath: detectedSrcPath,
      filePattern,
      resolutionMode: 'heuristic',
    }
  }

  return {
    owner: config.owner,
    repo: config.repo,
    branch,
    filePattern,
    resolutionMode: 'fallback-root',
  }
}

export async function readRepoFiles(
  octokit: Octokit,
  config: GitHubRepoConfig
): Promise<Record<string, string>> {
  const resolved = await resolveRepoConfig(octokit, config)
  const { tree } = await getRepoTree(octokit, resolved.owner, resolved.repo, resolved.branch)

  const allowedExtensions = extractExtensions(resolved.filePattern)
  const srcPrefix = resolved.srcPath
    ? (resolved.srcPath.endsWith('/') ? resolved.srcPath : `${resolved.srcPath}/`)
    : undefined

  const relevantFiles = tree.filter((item) => {
    if (item.type !== 'blob' || !item.path) {
      return false
    }
    if (srcPrefix && !item.path.startsWith(srcPrefix)) {
      return false
    }
    return allowedExtensions.some((ext) => item.path!.endsWith(ext))
  })

  const results: Record<string, string> = {}

  await Promise.all(
    relevantFiles.map(async (item) => {
      if (!item.sha || !item.path) return
      const { data: blobData } = await octokit.git.getBlob({
        owner: resolved.owner,
        repo: resolved.repo,
        file_sha: item.sha,
      })
      const content =
        blobData.encoding === 'base64'
          ? Buffer.from(blobData.content, 'base64').toString('utf-8')
          : blobData.content
      const key = srcPrefix ? item.path.slice(srcPrefix.length) : item.path
      results[key] = content
    })
  )

  return results
}

export async function createFixPR(
  octokit: Octokit,
  config: GitHubRepoConfig,
  patches: FixPatch[]
): Promise<GitHubPrResult> {
  const resolved = await resolveRepoConfig(octokit, config)

  const { data: refData } = await octokit.git.getRef({
    owner: resolved.owner,
    repo: resolved.repo,
    ref: `heads/${resolved.branch}`,
  })
  const baseSha = refData.object.sha

  const { data: baseCommit } = await octokit.git.getCommit({
    owner: resolved.owner,
    repo: resolved.repo,
    commit_sha: baseSha,
  })
  const baseTreeSha = baseCommit.tree.sha

  const branchName = `a11y-fix/${Date.now()}`
  await octokit.git.createRef({
    owner: resolved.owner,
    repo: resolved.repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  const srcPrefix = resolved.srcPath
    ? (resolved.srcPath.endsWith('/') ? resolved.srcPath : `${resolved.srcPath}/`)
    : undefined

  const treeUpdates: Array<{
    path: string
    mode: '100644'
    type: 'blob'
    sha: string
  }> = []

  await Promise.all(
    patches.map(async (patch) => {
      const filePath =
        srcPrefix && !patch.filePath.startsWith(srcPrefix)
          ? `${srcPrefix}${patch.filePath}`
          : patch.filePath

      const { data: fileData } = await octokit.repos.getContent({
        owner: resolved.owner,
        repo: resolved.repo,
        path: filePath,
        ref: resolved.branch,
      })

      const fileContent = Array.isArray(fileData) ? null : fileData
      if (!fileContent || fileContent.type !== 'file' || !('content' in fileContent)) return

      const currentContent = Buffer.from(fileContent.content as string, 'base64').toString('utf-8')
      const updatedContent = currentContent.replace(patch.original, patch.replacement)

      const { data: newBlob } = await octokit.git.createBlob({
        owner: resolved.owner,
        repo: resolved.repo,
        content: updatedContent,
        encoding: 'utf-8',
      })

      treeUpdates.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: newBlob.sha,
      })
    })
  )

  const { data: newTree } = await octokit.git.createTree({
    owner: resolved.owner,
    repo: resolved.repo,
    base_tree: baseTreeSha,
    tree: treeUpdates,
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner: resolved.owner,
    repo: resolved.repo,
    message: 'fix: apply automated accessibility fixes\n\nGenerated by A11y Oop',
    tree: newTree.sha,
    parents: [baseSha],
  })

  await octokit.git.updateRef({
    owner: resolved.owner,
    repo: resolved.repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  })

  const { data: pr } = await octokit.pulls.create({
    owner: resolved.owner,
    repo: resolved.repo,
    title: `fix: automated accessibility fixes (${patches.length} issue${patches.length !== 1 ? 's' : ''})`,
    body: `## Automated Accessibility Fixes\n\nThis PR was generated by [A11y Oop](https://github.com/a11y-oop).\n\n### Changes\n- Fixed ${patches.length} accessibility issue${patches.length !== 1 ? 's' : ''} detected by automated scanning\n- Patches applied to ${treeUpdates.length} file${treeUpdates.length !== 1 ? 's' : ''}`,
    head: branchName,
    base: resolved.branch,
  })

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    branchName,
    filesChanged: treeUpdates.length,
  }
}

export async function validateRepoAccess(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ valid: boolean; defaultBranch: string }> {
  try {
    const { data } = await octokit.repos.get({ owner, repo })
    return { valid: true, defaultBranch: data.default_branch }
  } catch {
    return { valid: false, defaultBranch: 'main' }
  }
}
