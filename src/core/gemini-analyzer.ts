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

export async function analyzeAccessibility(
  apiKey: string,
  screenshot: string,
  axeResults: string,
  sourceFiles: Record<string, string>,
  screenshotWidth?: number,
  options?: AnalyzerOptions
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
    })
  }

  const ai = new GoogleGenAI({ apiKey })

  const sourceFilesText = Object.entries(sourceFiles)
    .map(([filePath, content]) => `--- File: ${filePath} ---\n${content}`)
    .join('\n\n')

  const availableFiles = Object.keys(sourceFiles)

  const prompt = `You are an expert web accessibility auditor. Analyze the provided screenshot and axe-core scan results to identify WCAG 2.1 violations.

Cross-reference the axe results with the source code files to pinpoint exact locations and provide concrete fixes.

Axe-core scan results:
${axeResults}

Source code files:
${sourceFilesText}

AVAILABLE SOURCE FILES (you may ONLY use these file paths):
${availableFiles.map((f) => `- ${f}`).join('\n')}

For each issue found:
1. Identify the affected React component and file path
2. Provide the exact current code snippet that is problematic
3. Provide a corrected code snippet that fixes the issue
4. Map to the specific WCAG 2.1 success criterion (e.g., "1.1.1 Non-text Content")
5. Assign severity: critical (WCAG A blocker), serious (WCAG A/AA), moderate (usability impact), minor (best practice)
6. Estimate the line number in the source file
7. If visible in the screenshot, provide the bounding box coordinates in pixels relative to the full screenshot image.${screenshotWidth ? ` The screenshot is ${screenshotWidth}px wide.` : ''} x=0, y=0 is the top-left corner. Coordinates must be in absolute pixels of the original image

CRITICAL RULES:
- ONLY reference files listed in AVAILABLE SOURCE FILES above. NEVER invent file paths or component names that do not exist in the provided source code.
- If an axe-core violation cannot be mapped to any provided source file, SKIP that violation entirely. Do NOT guess or fabricate component names.
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

Be thorough but focus on real, actionable issues that can be mapped to the provided source code. If there are violations visible in the screenshot or axe results that cannot be traced to any provided source file, mention them in the summary but do NOT create issue entries for them.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: screenshot
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2
    }
  })

  const text = response.text
  if (!text) {
    throw new Error('Empty response from Gemini')
  }
  const parsed = JSON.parse(text) as { issues: A11yIssue[]; score: number; summary: string }

  const validatedIssues = parsed.issues.filter((issue) => {
    if (!availableFiles.includes(issue.filePath)) {
      return false
    }
    const fileContent = sourceFiles[issue.filePath]
    if (fileContent && !fileContent.includes(issue.currentCode)) {
      return false
    }
    return true
  })

  return {
    ...parsed,
    issues: validatedIssues,
  }
}
