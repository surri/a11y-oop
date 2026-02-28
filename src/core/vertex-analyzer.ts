import { VertexAI, SchemaType } from '@google-cloud/vertexai'
import { GoogleAuth } from 'google-auth-library'
import type { A11yIssue } from '@/shared/types'
import { getOrCreateCache } from './cache-manager'

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          component: { type: SchemaType.STRING },
          filePath: { type: SchemaType.STRING },
          severity: {
            type: SchemaType.STRING,
            enum: ['critical', 'serious', 'moderate', 'minor']
          },
          wcagCriteria: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          currentCode: { type: SchemaType.STRING },
          fixedCode: { type: SchemaType.STRING },
          line: { type: SchemaType.NUMBER },
          boundingBox: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER },
              width: { type: SchemaType.NUMBER },
              height: { type: SchemaType.NUMBER }
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
    score: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING }
  },
  required: ['issues', 'score', 'summary']
}

const SYSTEM_INSTRUCTION = `You are an expert web accessibility auditor. Analyze the provided screenshot and axe-core scan results to identify WCAG 2.1 violations.

Cross-reference the axe results with the source code files to pinpoint exact locations and provide concrete fixes.

For each issue found:
1. Identify the affected React component and file path
2. Provide the exact current code snippet that is problematic
3. Provide a corrected code snippet that fixes the issue
4. Map to the specific WCAG 2.1 success criterion (e.g., "1.1.1 Non-text Content")
5. Assign severity: critical (WCAG A blocker), serious (WCAG A/AA), moderate (usability impact), minor (best practice)
6. Estimate the line number in the source file
7. If visible in the screenshot, provide the bounding box coordinates of the element

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

function buildUserPrompt(
  axeResults: string,
  sourceFiles: Record<string, string>
): string {
  const sourceFilesText = Object.entries(sourceFiles)
    .map(([filePath, content]) => `--- File: ${filePath} ---\n${content}`)
    .join('\n\n')

  const availableFiles = Object.keys(sourceFiles)

  return `Axe-core scan results:
${axeResults}

Source code files:
${sourceFilesText}

AVAILABLE SOURCE FILES (you may ONLY use these file paths):
${availableFiles.map((f) => `- ${f}`).join('\n')}`
}

interface VertexAnalyzerConfig {
  project: string
  location: string
  enableGrounding?: boolean
  enableCaching?: boolean
}

async function generateWithCache(
  config: VertexAnalyzerConfig,
  cachedContentName: string,
  userPrompt: string,
  screenshot: string,
  enableGrounding: boolean
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  const client = await auth.getClient()
  const { project, location } = config

  const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`

  const requestBody: Record<string, unknown> = {
    cachedContent: cachedContentName,
    contents: [{
      role: 'user',
      parts: [
        { text: userPrompt },
        { inlineData: { mimeType: 'image/png', data: screenshot } }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
    },
  }

  if (enableGrounding) {
    requestBody['tools'] = [{ googleSearchRetrieval: {} }]
  }

  const response = await client.request<{
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      groundingMetadata?: unknown
    }>
  }>({ url, method: 'POST', data: requestBody })

  const candidate = response.data.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Vertex AI (cached)')
  }

  return { text, groundingMetadata: candidate?.groundingMetadata }
}

async function generateWithSDK(
  config: VertexAnalyzerConfig,
  userPrompt: string,
  screenshot: string,
  enableGrounding: boolean
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const { project, location } = config
  const vertexAI = new VertexAI({ project, location })

  const tools = enableGrounding
    ? [{ googleSearchRetrieval: {} }]
    : undefined

  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
    ...(tools ? { tools } : {}),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
    },
  })

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: userPrompt },
        { inlineData: { mimeType: 'image/png', data: screenshot } }
      ]
    }]
  })

  const candidate = result.response.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Vertex AI')
  }

  return {
    text,
    groundingMetadata: candidate?.groundingMetadata,
  }
}

export async function analyzeWithVertex(
  screenshot: string,
  axeResults: string,
  sourceFiles: Record<string, string>,
  config: VertexAnalyzerConfig
): Promise<{ issues: A11yIssue[]; score: number; summary: string; groundingMetadata?: unknown }> {
  const { project, location, enableGrounding = true, enableCaching = true } = config
  const userPrompt = buildUserPrompt(axeResults, sourceFiles)
  const availableFiles = Object.keys(sourceFiles)

  let response: { text: string; groundingMetadata?: unknown }

  if (enableCaching) {
    const cachedContentName = await getOrCreateCache(
      project,
      location,
      SYSTEM_INSTRUCTION
    )

    if (cachedContentName) {
      response = await generateWithCache(
        config,
        cachedContentName,
        userPrompt,
        screenshot,
        enableGrounding
      )
    } else {
      response = await generateWithSDK(config, userPrompt, screenshot, enableGrounding)
    }
  } else {
    response = await generateWithSDK(config, userPrompt, screenshot, enableGrounding)
  }

  const parsed = JSON.parse(response.text) as {
    issues: A11yIssue[]
    score: number
    summary: string
  }

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
    ...(response.groundingMetadata ? { groundingMetadata: response.groundingMetadata } : {}),
  }
}
