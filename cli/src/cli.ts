import path from 'node:path'
import { Command } from 'commander'
import { runScanFixRescan } from './commands/scan-fix-rescan.js'

export function run(): void {
  const program = new Command()

  program
    .name('a11y-oop')
    .description('Lighthouse-first accessibility scan and local auto-fix')
    .version('0.0.1')
    .argument('<url>', 'URL to scan with Lighthouse')
    .argument('[path]', 'Local source directory (default: current directory)', '.')
    .option('--api-key <key>', 'Gemini API key (falls back to GEMINI_API_KEY env var)')
    .option('--glob <pattern>', 'File glob pattern', '**/*.{tsx,jsx}')
    .option('--scan-only', 'Only run Lighthouse scan, do not apply fixes', false)
    .option('--no-rescan', 'Skip rescan after applying fixes')
    .option('--json', 'Output results as JSON', false)
    .option('--provider <genai|vertex>', 'AI provider (default: genai)', 'genai')
    .option('--project <id>', 'GCP project ID (for vertex provider)')
    .option('--location <region>', 'GCP region (default: us-central1)', 'us-central1')
    .option('--no-grounding', 'Disable Google Search grounding (vertex only)')
    .option('--no-caching', 'Disable context caching (vertex only)')
    .action(async (urlArg: string, pathArg: string, opts) => {
      const apiKey = opts.apiKey ?? process.env['GEMINI_API_KEY']
      const provider = opts.provider as 'genai' | 'vertex'
      const project = opts.project ?? process.env['GOOGLE_CLOUD_PROJECT']
      const location = opts.location ?? process.env['GOOGLE_CLOUD_LOCATION'] ?? 'us-central1'

      if (provider === 'vertex' && !project) {
        process.stderr.write(
          'Error: --project or GOOGLE_CLOUD_PROJECT is required for vertex provider.\n'
        )
        process.exit(1)
      }

      if (provider !== 'vertex' && !apiKey) {
        process.stderr.write(
          'Error: Gemini API key is required. Provide --api-key or set GEMINI_API_KEY env var.\n'
        )
        process.exit(1)
      }

      try {
        await runScanFixRescan({
          url: urlArg,
          src: path.resolve(process.cwd(), pathArg || '.'),
          apiKey: apiKey ?? '',
          glob: opts.glob,
          scanOnly: opts.scanOnly,
          rescan: opts.rescan,
          json: opts.json,
          provider,
          project,
          location,
          grounding: opts.grounding,
          caching: opts.caching,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        process.stderr.write(`Error: ${message}\n`)
        process.exit(1)
      }
    })

  program.parse()
}
