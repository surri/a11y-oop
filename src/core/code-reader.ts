import { glob } from 'glob'
import { readFile } from 'fs/promises'
import path from 'path'

export async function readSourceFiles(
  srcDir: string,
  fileGlob: string = '**/*.tsx'
): Promise<Record<string, string>> {
  const files = await glob(fileGlob, {
    cwd: srcDir,
    absolute: false
  })

  const result: Record<string, string> = {}

  await Promise.all(
    files.map(async (relPath) => {
      const absPath = path.join(srcDir, relPath)
      const content = await readFile(absPath, 'utf-8')
      result[relPath] = content
    })
  )

  return result
}
