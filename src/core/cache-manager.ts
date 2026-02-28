import { GoogleAuth } from 'google-auth-library'
import { createHash } from 'node:crypto'

interface CachedContentInfo {
  name: string
  displayName: string
  expireTime: string
}

interface ListCachedContentsResponse {
  cachedContents?: CachedContentInfo[]
}

const cacheRegistry = new Map<string, { name: string; expireTime: string }>()

function buildBaseUrl(project: string, location: string): string {
  return `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}`
}

function buildDisplayName(systemPrompt: string): string {
  const hash = createHash('sha256').update(systemPrompt).digest('hex').slice(0, 16)
  return `a11y-wcag-${hash}`
}

export async function getOrCreateCache(
  project: string,
  location: string,
  systemPrompt: string,
  model: string = 'gemini-2.5-flash'
): Promise<string | null> {
  const displayName = buildDisplayName(systemPrompt)

  const memoryCached = cacheRegistry.get(displayName)
  if (memoryCached && new Date(memoryCached.expireTime) > new Date()) {
    return memoryCached.name
  }

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  const client = await auth.getClient()
  const baseUrl = buildBaseUrl(project, location)

  try {
    const listResponse = await client.request<ListCachedContentsResponse>({
      url: `${baseUrl}/cachedContents`,
      method: 'GET',
    })

    const existing = (listResponse.data.cachedContents ?? []).find(
      (c) => c.displayName === displayName && new Date(c.expireTime) > new Date()
    )

    if (existing) {
      cacheRegistry.set(displayName, { name: existing.name, expireTime: existing.expireTime })
      return existing.name
    }
  } catch {
    // List failed, attempt creation directly
  }

  try {
    const modelPath = `projects/${project}/locations/${location}/publishers/google/models/${model}`
    const expireTime = new Date(Date.now() + 3600 * 1000).toISOString()

    const createResponse = await client.request<CachedContentInfo>({
      url: `${baseUrl}/cachedContents`,
      method: 'POST',
      data: {
        model: modelPath,
        displayName,
        systemInstruction: {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        expireTime,
      }
    })

    const created = createResponse.data
    cacheRegistry.set(displayName, { name: created.name, expireTime: created.expireTime })
    return created.name
  } catch {
    // Cache creation may fail if content is below minimum token threshold (~32K tokens)
    return null
  }
}
