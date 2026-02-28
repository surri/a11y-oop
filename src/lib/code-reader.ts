import { readSourceFiles } from '@/core'
import path from 'path'

const defaultSrcPath = process.env.DEMO_SRC_PATH
  ?? path.resolve(process.env.HOME ?? '', 'hackerthon', 'a11y-oop-demo', 'src')

export async function readComponentFiles(srcPath?: string): Promise<Record<string, string>> {
  return readSourceFiles(srcPath ?? defaultSrcPath)
}
