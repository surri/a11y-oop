import type { PatchConfig, PipelineCallbacks } from '../../../src/core'
import type { A11yIssue, FixPatch, RescanResult, ScanResult } from '../../../src/shared/types'
import {
  captureScreenshot,
  runLighthouseAccessibilityDetailed,
  readSourceFiles,
  analyzeAccessibility,
  runFix,
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
  src: string
  apiKey: string
  glob: string
  scanOnly: boolean
  rescan: boolean
  json: boolean
  provider?: 'genai' | 'vertex'
  project?: string
  location?: string
  grounding?: boolean
  caching?: boolean
}

function toSeverity(score: number | null): A11yIssue['severity'] {
  if (score === null) return 'moderate'
  if (score <= 0) return 'serious'
  if (score < 0.5) return 'moderate'
  return 'minor'
}

function buildRuntimeScanResult(
  url: string,
  screenshot: string,
  lighthouse: Awaited<ReturnType<typeof runLighthouseAccessibilityDetailed>>
): ScanResult {
  const issues: A11yIssue[] = lighthouse.audits.map((audit, idx) => ({
    id: `${audit.id}-${idx}`,
    component: audit.id,
    severity: toSeverity(audit.score),
    wcagCriteria: audit.id,
    description: `${audit.title}${audit.description ? ` - ${audit.description}` : ''}`,
    currentCode: audit.displayValue,
    sourceReady: false,
  }))

  const score = lighthouse.score ?? Math.max(0, 100 - issues.length * 7)
  const summary = issues.length === 0
    ? 'Lighthouse did not report accessibility findings.'
    : `Lighthouse reported ${issues.length} accessibility finding${issues.length !== 1 ? 's' : ''}.`

  return {
    url,
    mode: 'runtime-dom',
    timestamp: new Date().toISOString(),
    screenshot,
    score,
    lighthouseScore: lighthouse.score,
    summary,
    issues,
    axeViolationCount: issues.length,
    lighthouseFindings: lighthouse.audits,
    lighthouseReport: lighthouse.report,
  }
}

export async function runScanFixRescan(options: RunOptions): Promise<void> {
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

  if (!options.json) spinner.start('Running Lighthouse scan...')

  let scanResult: ScanResult
  let sourceMappedIssues: A11yIssue[] = []

  try {
    const [screenshot, lighthouse] = await Promise.all([
      captureScreenshot(options.url),
      runLighthouseAccessibilityDetailed(options.url),
    ])

    scanResult = buildRuntimeScanResult(options.url, screenshot, lighthouse)

    if (!options.scanOnly) {
      if (!options.json) spinner.text = 'Reading local source files...'
      const sourceFiles = await readSourceFiles(options.src, options.glob)

      if (!options.json) spinner.text = `Generating source-mapped fixes with ${options.provider === 'vertex' ? 'Vertex AI' : 'Gemini'}...`
      const analysis = await analyzeAccessibility(
        options.apiKey,
        screenshot,
        `Lighthouse accessibility findings:\n${scanResult.lighthouseReport ?? ''}`,
        sourceFiles,
        undefined,
        {
          provider: options.provider,
          vertexConfig: options.project ? { project: options.project, location: options.location ?? 'us-central1' } : undefined,
          enableGrounding: options.grounding,
          enableCaching: options.caching,
        },
        'runtime+code'
      )
      sourceMappedIssues = analysis.issues
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

  const patches: FixPatch[] = sourceMappedIssues
    .filter((issue) => issue.filePath && issue.currentCode && issue.fixedCode)
    .map((issue) => ({
      filePath: issue.filePath!,
      original: issue.currentCode!,
      replacement: issue.fixedCode!,
    }))

  let fixResult
  if (!options.json) spinner.start(`Applying ${patches.length} patches to ${options.src}...`)
  try {
    if (patches.length === 0) {
      fixResult = { applied: 0, failed: 0, errors: ['No source-mapped fixes were generated from Lighthouse findings.'] }
    } else {
      const patchConfig: PatchConfig = { srcDir: options.src }
      fixResult = await runFix(patchConfig, patches, callbacks)
    }
  } catch (error) {
    if (!options.json) spinner.fail('Fix failed')
    throw error
  }
  if (!options.json) spinner.succeed('Fix step complete')

  let rescanResult: RescanResult | undefined
  if (options.rescan) {
    if (!options.json) spinner.start('Running Lighthouse rescan...')
    try {
      const [afterScreenshot, afterLighthouse] = await Promise.all([
        captureScreenshot(options.url),
        runLighthouseAccessibilityDetailed(options.url),
      ])

      const afterScore = afterLighthouse.score ?? scanResult.score
      const afterIssueCount = afterLighthouse.audits.length

      rescanResult = {
        before: {
          screenshot: scanResult.screenshot,
          score: scanResult.score,
          lighthouseScore: scanResult.lighthouseScore,
        },
        after: {
          screenshot: afterScreenshot,
          score: afterScore,
          lighthouseScore: afterLighthouse.score,
        },
        issuesFixed: Math.max(0, scanResult.issues.length - afterIssueCount),
        issuesRemaining: afterIssueCount,
      }
    } catch (error) {
      if (!options.json) spinner.fail('Rescan failed')
      throw error
    }
    if (!options.json) spinner.succeed('Rescan complete')
  }

  if (options.json) {
    const output: Record<string, unknown> = { scan: scanResult, fix: fixResult, mappedIssueCount: sourceMappedIssues.length }
    if (rescanResult) output['rescan'] = rescanResult
    process.stdout.write(JSON.stringify(output, null, 2) + '\n')
  } else {
    process.stdout.write(formatScanResult(scanResult) + '\n')
    process.stdout.write(formatIssues(scanResult.issues) + '\n')
    process.stdout.write('\n')
    process.stdout.write(`Source-mapped issues: ${sourceMappedIssues.length}\n`)
    process.stdout.write(formatFixResult(fixResult) + '\n')
    if (rescanResult) {
      process.stdout.write(formatRescanResult(rescanResult) + '\n')
    }
  }
}
