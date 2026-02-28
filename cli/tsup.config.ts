import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    target: 'node20',
    clean: true,
    banner: {
      js: '#!/usr/bin/env node'
    },
    noExternal: ['@a11y-oop/core', '@a11y-oop/shared'],
  },
  {
    entry: { lib: 'src/lib.ts' },
    format: ['esm'],
    target: 'node20',
    dts: true,
    noExternal: ['@a11y-oop/core', '@a11y-oop/shared'],
  },
])
