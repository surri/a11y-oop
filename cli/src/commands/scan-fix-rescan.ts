import type { ScanConfig, PatchConfig, PipelineCallbacks } from '../../../src/core'
import type { FixPatch, GitHubRepoConfig, GitHubPrResult } from '../../../src/shared/types'
import {
  runScan,
  runFix,
  runRescan,
  captureScreenshot,
  runAxeScan,
  analyzeAccessibility,
  runLighthouseAccessibility,
  createOctokit,
  readRepoFiles,
  createFixPR,
} from '../../../src/core'
import { createSpinner } from '../output/spinner.js'
import {
  formatScanResult,
  formatIssues,
  formatFixResult,
  formatRescanResult,
} from '../output/formatter.js'

export interface RunOptions {
  url: string
  src?: string
  apiKey: string
  glob: string
  scanOnly: boolean
  rescan: boolean
  json: boolean
  github?: string
  branch: string
  srcPath: string
  provider?: 'genai' | 'vertex'
  project?: string
  location?: string
  grounding?: boolean
  caching?: boolean
}

function parseGitHubOption(github: string): { owner: string; repo: string } {
  const parts = github.split('/')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid --github format. Expected owner/repo (e.g. facebook/react)')
  }
  return { owner: parts[0], repo: parts[1] }
}

export async function runScanFixRescan(options: RunOptions): Promise<void> {
  const isGitHubMode = Boolean(options.github)

  const spinner = createSpinner('Scanning...')

  const callbacks: PipelineCallbacks = {
    onStep: (step) => {
      if (!options.json) spinner.text = `Step: ${step}`
    },
    onProgress: (message) => {
      if (!options.json) spinner.text = message
    },
    onError: (error) => {
      if (!options.json) spinner.fail(error.message)
    },
  }

  // --- SCAN ---
  if (!options.json) spinner.start('Scanning for accessibility issues...')

  let scanResult
  try {
    if (isGitHubMode) {
      const { owner, repo } = parseGitHubOption(options.github!)
      const githubToken = process.env['GITHUB_TOKEN']!
      const octokit = createOctokit(githubToken)
      const ghConfig: GitHubRepoConfig = {
        owner,
        repo,
        branch: options.branch,
        srcPath: options.srcPath,
        filePattern: options.glob,
      }

      if (!options.json) spinner.text = 'Reading source files from GitHub...'
      const [screenshot, axeViolations, sourceFiles, lighthouseScore] = await Promise.all([
        captureScreenshot(options.url),
        runAxeScan(options.url),
        readRepoFiles(octokit, ghConfig),
        runLighthouseAccessibility(options.url),
      ])

      if (!options.json) spinner.text = `Analyzing with ${options.provider === 'vertex' ? 'Vertex AI' : 'Gemini AI'}...`
      const { issues, score, summary } = await analyzeAccessibility(
        options.apiKey,
        screenshot,
        JSON.stringify(axeViolations, null, 2),
        sourceFiles,
        undefined,
        {
          provider: options.provider,
          vertexConfig: options.project ? { project: options.project, location: options.location ?? 'us-central1' } : undefined,
          enableGrounding: options.grounding,
          enableCaching: options.caching,
        }
      )

      scanResult = {
        url: options.url,
        timestamp: new Date().toISOString(),
        screenshot,
        score,
        lighthouseScore,
        summary,
        issues,
        axeViolationCount: axeViolations.length,
      }
    } else {
      const scanConfig: ScanConfig = {
        url: options.url,
        srcDir: options.src!,
        fileGlob: options.glob,
        geminiApiKey: options.apiKey,
        provider: options.provider,
        vertexConfig: options.project ? { project: options.project, location: options.location ?? 'us-central1' } : undefined,
        enableGrounding: options.grounding,
        enableCaching: options.caching,
      }
      scanResult = await runScan(scanConfig, callbacks)
    }
  } catch (error) {
    if (!options.json) spinner.fail('Scan failed')
    throw error
  }

  if (!options.json) spinner.succeed('Scan complete')

  if (options.scanOnly) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ scan: scanResult }, null, 2) + '\n')
    } else {
      process.stdout.write(formatScanResult(scanResult) + '\n')
      process.stdout.write(formatIssues(scanResult.issues) + '\n')
    }
    return
  }

  // --- FIX ---
  const patches: FixPatch[] = scanResult.issues.map((issue) => ({
    filePath: issue.filePath,
    original: issue.currentCode,
    replacement: issue.fixedCode,
  }))

  let fixResult
  let prResult: GitHubPrResult | undefined

  if (isGitHubMode) {
    const { owner, repo } = parseGitHubOption(options.github!)
    const githubToken = process.env['GITHUB_TOKEN']!
    const octokit = createOctokit(githubToken)
    const ghConfig: GitHubRepoConfig = {
      owner,
      repo,
      branch: options.branch,
      srcPath: options.srcPath,
    }

    if (!options.json) spinner.start('Creating pull request with fixes...')
    try {
      prResult = await createFixPR(octokit, ghConfig, patches)
      fixResult = { applied: prResult.filesChanged, failed: 0, errors: [] as string[] }
    } catch (error) {
      if (!options.json) spinner.fail('PR creation failed')
      throw error
    }
    if (!options.json) spinner.succeed(`PR created: ${prResult.prUrl}`)
  } else {
    const patchConfig: PatchConfig = { srcDir: options.src! }
    if (!options.json) spinner.start(`Applying ${patches.length} fix patches...`)
    try {
      fixResult = await runFix(patchConfig, patches, callbacks)
    } catch (error) {
      if (!options.json) spinner.fail('Fix failed')
      throw error
    }
    if (!options.json) spinner.succeed('Fixes applied')
  }

  // --- RESCAN (local mode only) ---
  let rescanResult
  if (options.rescan && !isGitHubMode) {
    const scanConfig: ScanConfig = {
      url: options.url,
      srcDir: options.src!,
      fileGlob: options.glob,
      geminiApiKey: options.apiKey,
      provider: options.provider,
      vertexConfig: options.project ? { project: options.project, location: options.location ?? 'us-central1' } : undefined,
      enableGrounding: options.grounding,
      enableCaching: options.caching,
    }
    if (!options.json) spinner.start('Rescanning after fixes...')
    try {
      rescanResult = await runRescan(
        scanConfig,
        {
          screenshot: scanResult.screenshot,
          score: scanResult.score,
          lighthouseScore: scanResult.lighthouseScore,
          issueCount: scanResult.issues.length,
        },
        callbacks
      )
    } catch (error) {
      if (!options.json) spinner.fail('Rescan failed')
      throw error
    }
    if (!options.json) spinner.succeed('Rescan complete')
  }

  // --- OUTPUT ---
  if (options.json) {
    const output: Record<string, unknown> = { scan: scanResult, fix: fixResult }
    if (prResult) output['pr'] = prResult
    if (rescanResult) output['rescan'] = rescanResult
    process.stdout.write(JSON.stringify(output, null, 2) + '\n')
  } else {
    process.stdout.write(formatScanResult(scanResult) + '\n')
    process.stdout.write(formatIssues(scanResult.issues) + '\n')
    process.stdout.write(formatFixResult(fixResult) + '\n')
    if (prResult) {
      process.stdout.write('\n')
      process.stdout.write(`  PR #${prResult.prNumber}: ${prResult.prUrl}\n`)
      process.stdout.write(`  Branch: ${prResult.branchName}\n`)
      process.stdout.write(`  Files changed: ${prResult.filesChanged}\n`)
    }
    if (rescanResult) {
      process.stdout.write(formatRescanResult(rescanResult) + '\n')
    }
    if (isGitHubMode) {
      process.stdout.write('\n  (Rescan skipped in GitHub mode - changes are in the PR)\n')
    }
  }
}
