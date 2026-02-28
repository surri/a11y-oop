import { GoogleGenAI, Type } from '@google/genai'
import type { A11yIssue } from '@/shared/types'
import type { AnalyzerProvider, VertexConfig } from './types'
import { analyzeWithVertex } from './vertex-analyzer'

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          component: { type: Type.STRING },
          filePath: { type: Type.STRING },
          severity: {
            type: Type.STRING,
            enum: ['critical', 'serious', 'moderate', 'minor']
          },
          wcagCriteria: { type: Type.STRING },
          description: { type: Type.STRING },
          currentCode: { type: Type.STRING },
          fixedCode: { type: Type.STRING },
          line: { type: Type.NUMBER },
          boundingBox: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER }
            },
            required: ['x', 'y', 'width', 'height']
          }
        },
        required: [
          'id',
          'component',
          'filePath',
          'severity',
          'wcagCriteria',
          'description',
          'currentCode',
          'fixedCode',
          'line'
        ]
      }
    },
    score: { type: Type.NUMBER },
    summary: { type: Type.STRING }
  },
  required: ['issues', 'score', 'summary']
}

export interface AnalyzerOptions {
  provider?: AnalyzerProvider
  vertexConfig?: VertexConfig
  enableGrounding?: boolean
  enableCaching?: boolean
}

export type AccessibilityAnalysisMode = 'runtime+code' | 'code-only'

const WCAG_REFERENCE_URL = 'https://www.w3.org/TR/WCAG/'
const WCAG_STANDARDS_URL = 'https://www.w3.org/WAI/standards-guidelines/wcag/'

function buildPrompt(
  axeResults: string,
  sourceFiles: Record<string, string>,
  screenshotWidth?: number,
  mode: AccessibilityAnalysisMode = 'runtime+code'
): string {
  const sourceFilesText = Object.entries(sourceFiles)
    .map(([filePath, content]) => `--- File: ${filePath} ---\n${content}`)
    .join('\n\n')

  const availableFiles = Object.keys(sourceFiles)
  const dataContext = mode === 'runtime+code'
    ? `You are an expert web accessibility auditor. Analyze the provided screenshot and runtime accessibility findings (for example Lighthouse accessibility audits) to identify violations against the latest published WCAG Recommendation.

Cross-reference the runtime findings with the source code files to pinpoint exact locations and provide concrete fixes.`
    : `You are an expert web accessibility auditor. Analyze the provided source code for likely violations against the latest published WCAG Recommendation.

No runtime screenshot or runtime accessibility findings are available in this run. Focus on deterministic code-level issues you can confidently map to the provided files.`

  const issueGuidance = mode === 'runtime+code'
    ? `7. If visible in the screenshot, provide the bounding box coordinates in pixels relative to the full screenshot image.${screenshotWidth ? ` The screenshot is ${screenshotWidth}px wide.` : ''} x=0, y=0 is the top-left corner. Coordinates must be in absolute pixels of the original image`
    : '7. Leave "boundingBox" empty unless there is enough evidence from code context to infer stable coordinates (usually omit it in code-only mode).'

  const runtimeBlock = mode === 'runtime+code'
    ? `Runtime accessibility findings:
${axeResults}
`
    : 'Runtime accessibility findings: Not available (code-only mode)\n'

  return `${dataContext}

Normative WCAG reference policy:
- Treat the latest W3C WCAG Recommendation as the source of truth (currently WCAG 2.2 unless superseded).
- Prefer official W3C sources for criterion names and intent: ${WCAG_REFERENCE_URL} and ${WCAG_STANDARDS_URL}
- If web grounding/search is available, verify criterion titles against those W3C sources before finalizing.

${runtimeBlock}
Source code files:
${sourceFilesText}

AVAILABLE SOURCE FILES (you may ONLY use these file paths):
${availableFiles.map((f) => `- ${f}`).join('\n')}

For each issue found:
1. Identify the affected React component and file path
2. Provide the exact current code snippet that is problematic
3. Provide a corrected code snippet that fixes the issue
4. Map to the specific WCAG success criterion from the latest published WCAG Recommendation (e.g., "1.1.1 Non-text Content")
5. Assign severity: critical (WCAG A blocker), serious (WCAG A/AA), moderate (usability impact), minor (best practice)
6. Estimate the line number in the source file
${issueGuidance}

CRITICAL RULES:
- Use official W3C WCAG sources as normative references. Do not rely on third-party summaries when criterion wording conflicts.
- ONLY reference files listed in AVAILABLE SOURCE FILES above. NEVER invent file paths or component names that do not exist in the provided source code.
- If a violation cannot be mapped to any provided source file, SKIP that violation entirely. Do NOT guess or fabricate component names.
- The "component" field must be a component name that actually appears in the provided source code.
- The "filePath" must exactly match one of the AVAILABLE SOURCE FILES listed above.
- The currentCode must be an exact substring of the source file (preserve whitespace and indentation exactly).
- The fixedCode must be valid JSX with all opening tags having matching closing tags.
- Include enough surrounding context so the snippet is unique within the file.
- When changing an element type (e.g. <div> to <nav>, <div> to <button>), you MUST include BOTH the opening AND closing tags in the snippet. Never include only the opening tag without its matching closing tag.

Example - WRONG (mismatched tags):
  currentCode: "<div onClick={handler}>"
  fixedCode: "<button onClick={handler}>"
  (Missing closing tag change: </div> → </button>)

Example - CORRECT (full element replacement):
  currentCode: "<div onClick={handler}>\\n  <span>Click</span>\\n</div>"
  fixedCode: "<button onClick={handler}>\\n  <span>Click</span>\\n</button>"

Provide an overall accessibility score from 0-100 (100 = fully accessible) and a brief summary of the findings.

Be thorough but focus on real, actionable issues that can be mapped to the provided source code.`
}

function isGroundingToolCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('googlesearch') ||
    message.includes('google search') ||
    message.includes('tool') && message.includes('not support')
  )
}

export async function analyzeAccessibility(
  apiKey: string,
  screenshot: string,
  axeResults: string,
  sourceFiles: Record<string, string>,
  screenshotWidth?: number,
  options?: AnalyzerOptions,
  mode: AccessibilityAnalysisMode = 'runtime+code'
): Promise<{ issues: A11yIssue[]; score: number; summary: string; groundingMetadata?: unknown }> {
  if (options?.provider === 'vertex') {
    if (!options.vertexConfig) {
      throw new Error('vertexConfig is required when provider is "vertex"')
    }
    return analyzeWithVertex(screenshot, axeResults, sourceFiles, {
      project: options.vertexConfig.project,
      location: options.vertexConfig.location,
      enableGrounding: options.enableGrounding ?? true,
      enableCaching: options.enableCaching ?? true,
    }, mode)
  }

  const ai = new GoogleGenAI({ apiKey })

  const availableFiles = Object.keys(sourceFiles)
  const prompt = buildPrompt(axeResults, sourceFiles, screenshotWidth, mode)
  const shouldUseGrounding = options?.enableGrounding ?? true

  const parts: Array<
    { text: string } |
    { inlineData: { mimeType: 'image/png'; data: string } }
  > = [{ text: prompt }]

  if (mode === 'runtime+code') {
    if (!screenshot) {
      throw new Error('screenshot is required in runtime+code mode')
    }
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: screenshot,
      }
    })
  }

  const generate = (groundingEnabled: boolean) => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
      ...(groundingEnabled ? { tools: [{ googleSearch: {} }] } : {})
    }
  })

  let response
  try {
    response = await generate(shouldUseGrounding)
  } catch (error) {
    if (!shouldUseGrounding || !isGroundingToolCompatibilityError(error)) {
      throw error
    }
    response = await generate(false)
  }

  const text = response.text
  if (!text) {
    throw new Error('Empty response from Gemini')
  }
  const parsed = JSON.parse(text) as { issues: A11yIssue[]; score: number; summary: string }
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata

  const validatedIssues = parsed.issues.filter((issue) => {
    if (!issue.filePath || !availableFiles.includes(issue.filePath)) {
      return false
    }
    const fileContent = sourceFiles[issue.filePath]
    if (issue.currentCode && fileContent && !fileContent.includes(issue.currentCode)) {
      return false
    }
    return true
  })

  return {
    ...parsed,
    issues: validatedIssues,
    groundingMetadata,
  }
}
