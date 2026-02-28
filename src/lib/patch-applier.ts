import { applyPatches as coreApplyPatches } from '@/core'
import type { FixPatch, FixResult } from '@/shared/types'
import path from 'path'

const defaultRoot = process.env.DEMO_SRC_PATH
  ?? path.resolve(process.env.HOME ?? '', 'hackerthon', 'a11y-oop-demo', 'src')

export async function applyPatches(patches: FixPatch[], srcPath?: string): Promise<FixResult> {
  return coreApplyPatches(srcPath ?? defaultRoot, patches)
}
