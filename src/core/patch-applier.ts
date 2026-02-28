import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { FixPatch, FixResult } from '@/shared/types'

/**
 * Detect element type changes between original and replacement,
 * then fix any orphaned closing tags left in the full file content.
 */
export function fixOrphanedClosingTags(content: string): string {
  const tagStack: Array<{ tag: string; index: number }> = []
  const openTagRe = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\s*(?<!\/)\s*>/g
  const closeTagRe = /<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g

  const selfClosingRe = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\s*\/>/g
  const selfClosingPositions = new Set<number>()
  let selfMatch
  while ((selfMatch = selfClosingRe.exec(content)) !== null) {
    selfClosingPositions.add(selfMatch.index)
  }

  const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ])

  const tokens: Array<{ type: 'open' | 'close'; tag: string; index: number; length: number }> = []

  let match
  while ((match = openTagRe.exec(content)) !== null) {
    const tag = match[1]
    if (VOID_ELEMENTS.has(tag.toLowerCase()) || selfClosingPositions.has(match.index)) {
      continue
    }
    tokens.push({ type: 'open', tag, index: match.index, length: match[0].length })
  }

  while ((match = closeTagRe.exec(content)) !== null) {
    tokens.push({ type: 'close', tag: match[1], index: match.index, length: match[0].length })
  }

  tokens.sort((a, b) => a.index - b.index)

  const replacements: Array<{ index: number; length: number; newText: string }> = []

  for (const token of tokens) {
    if (token.type === 'open') {
      tagStack.push({ tag: token.tag, index: token.index })
    } else {
      if (tagStack.length === 0) continue

      const top = tagStack[tagStack.length - 1]
      if (top.tag === token.tag) {
        tagStack.pop()
      } else {
        replacements.push({
          index: token.index,
          length: token.length,
          newText: `</${top.tag}>`,
        })
        tagStack.pop()
      }
    }
  }

  if (replacements.length === 0) return content

  let result = content
  for (const r of replacements.reverse()) {
    result = result.slice(0, r.index) + r.newText + result.slice(r.index + r.length)
  }

  return result
}

export async function applyPatches(
  srcDir: string,
  patches: FixPatch[]
): Promise<FixResult> {
  let applied = 0
  let failed = 0
  const errors: string[] = []

  for (const patch of patches) {
    try {
      const fullPath = path.resolve(srcDir, patch.filePath)
      const content = await readFile(fullPath, 'utf-8')

      if (!content.includes(patch.original)) {
        failed++
        errors.push(`Pattern not found in ${patch.filePath}`)
        continue
      }

      const replaced = content.replace(patch.original, patch.replacement)
      const updated = fixOrphanedClosingTags(replaced)
      await writeFile(fullPath, updated, 'utf-8')
      applied++
    } catch (error) {
      failed++
      errors.push(`Failed to patch ${patch.filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return { applied, failed, errors }
}
