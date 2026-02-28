import type { ScanResult, FixPatch, FixResult, RescanResult } from '@/shared/types'
import type { ScanConfig, PatchConfig, PipelineCallbacks } from './types'
import { captureScreenshot } from './scanner'
import { runAxeScan } from './axe-scanner'
import { readSourceFiles } from './code-reader'
import { analyzeAccessibility } from './gemini-analyzer'
import { runLighthouseAccessibility } from './lighthouse-scanner'
import { applyPatches } from './patch-applier'

export async function runScan(
  config: ScanConfig,
  callbacks?: PipelineCallbacks
): Promise<ScanResult> {
  const { url, srcDir, fileGlob, geminiApiKey } = config

  callbacks?.onStep?.('capturing')
  callbacks?.onProgress?.('Capturing screenshot...')

  const [screenshot, axeViolations, sourceFiles, lighthouseScore] = await Promise.all([
    captureScreenshot(url),
    runAxeScan(url),
    readSourceFiles(srcDir, fileGlob),
    runLighthouseAccessibility(url),
  ])

  callbacks?.onStep?.('analyzing')
  callbacks?.onProgress?.('Analyzing with Gemini AI...')

  const { issues, score, summary } = await analyzeAccessibility(
    geminiApiKey,
    screenshot,
    JSON.stringify(axeViolations, null, 2),
    sourceFiles,
    undefined,
    {
      provider: config.provider,
      vertexConfig: config.vertexConfig,
      enableGrounding: config.enableGrounding,
      enableCaching: config.enableCaching,
    }
  )

  return {
    url,
    timestamp: new Date().toISOString(),
    screenshot,
    score,
    lighthouseScore,
    summary,
    issues,
    axeViolationCount: axeViolations.length
  }
}

export async function runFix(
  patchConfig: PatchConfig,
  patches: FixPatch[],
  callbacks?: PipelineCallbacks
): Promise<FixResult> {
  callbacks?.onStep?.('fixing')
  callbacks?.onProgress?.(`Applying ${patches.length} patches...`)

  return applyPatches(patchConfig.srcDir, patches)
}

export async function runRescan(
  config: ScanConfig,
  before: { screenshot: string; score: number; lighthouseScore: number | null; issueCount: number },
  callbacks?: PipelineCallbacks
): Promise<RescanResult> {
  callbacks?.onStep?.('rescanning')
  callbacks?.onProgress?.('Rescanning after fixes...')

  const scanResult = await runScan(config, callbacks)

  return {
    before: {
      screenshot: before.screenshot,
      score: before.score,
      lighthouseScore: before.lighthouseScore,
    },
    after: {
      screenshot: scanResult.screenshot,
      score: scanResult.score,
      lighthouseScore: scanResult.lighthouseScore,
    },
    issuesFixed: before.issueCount - scanResult.issues.length,
    issuesRemaining: scanResult.issues.length,
  }
}

export async function runFullPipeline(
  config: ScanConfig,
  patchConfig: PatchConfig,
  callbacks?: PipelineCallbacks
): Promise<{ scan: ScanResult; fix: FixResult; rescan: RescanResult }> {
  const scan = await runScan(config, callbacks)

  const patches: FixPatch[] = scan.issues.map((issue) => ({
    filePath: issue.filePath,
    original: issue.currentCode,
    replacement: issue.fixedCode,
  }))

  const fix = await runFix(patchConfig, patches, callbacks)

  const rescan = await runRescan(config, {
    screenshot: scan.screenshot,
    score: scan.score,
    lighthouseScore: scan.lighthouseScore,
    issueCount: scan.issues.length,
  }, callbacks)

  return { scan, fix, rescan }
}
