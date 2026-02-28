import { analyzeAccessibility as coreAnalyze } from '@/core'
import type { AnalyzerOptions } from '@/core'
import type { A11yIssue } from '@/shared/types'

function detectAnalyzerOptions(): AnalyzerOptions {
  const vertexProject = process.env.VERTEX_AI_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT
  if (vertexProject) {
    return {
      provider: 'vertex',
      vertexConfig: {
        project: vertexProject,
        location: process.env.VERTEX_AI_LOCATION ?? process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
      },
      enableGrounding: process.env.VERTEX_DISABLE_GROUNDING !== 'true',
      enableCaching: process.env.VERTEX_DISABLE_CACHING !== 'true',
    }
  }
  return {}
}

export async function analyzeAccessibility(
  screenshot: string,
  axeResults: string,
  sourceFiles: Record<string, string>,
  screenshotWidth?: number,
  mode: 'runtime+code' | 'code-only' = 'runtime+code'
): Promise<{ issues: A11yIssue[]; score: number; summary: string; groundingMetadata?: unknown }> {
  const options = detectAnalyzerOptions()
  const apiKey = process.env.GEMINI_API_KEY ?? ''

  if (options.provider !== 'vertex' && !apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  return coreAnalyze(apiKey, screenshot, axeResults, sourceFiles, screenshotWidth, options, mode)
}
