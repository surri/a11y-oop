import { Command } from 'commander'
import { runScanFixRescan } from './commands/scan-fix-rescan.js'

export function run(): void {
  const program = new Command()

  program
    .name('a11y-oop')
    .description('Automatically scan and fix accessibility issues in your web app')
    .version('0.0.1')
    .requiredOption('--url <url>', 'URL to scan for accessibility issues')
    .option('--src <dir>', 'Source directory containing component files (local mode)')
    .option('--api-key <key>', 'Gemini API key (falls back to GEMINI_API_KEY env var)')
    .option('--glob <pattern>', 'File glob pattern', '**/*.tsx')
    .option('--scan-only', 'Only scan, do not apply fixes', false)
    .option('--no-rescan', 'Skip the rescan step after fixing')
    .option('--json', 'Output results as JSON', false)
    .option('--github <owner/repo>', 'GitHub repository (enables GitHub mode, e.g. owner/repo)')
    .option('--branch <branch>', 'GitHub branch (default: main)', 'main')
    .option('--src-path <path>', 'Source path within the GitHub repo', 'src')
    .option('--provider <genai|vertex>', 'AI provider (default: genai)', 'genai')
    .option('--project <id>', 'GCP project ID (for vertex provider)')
    .option('--location <region>', 'GCP region (default: us-central1)', 'us-central1')
    .option('--no-grounding', 'Disable Google Search grounding (vertex only)')
    .option('--no-caching', 'Disable context caching (vertex only)')
    .action(async (opts) => {
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

      if (!opts.github && !opts.src) {
        process.stderr.write(
          'Error: Either --src (local mode) or --github (GitHub mode) is required.\n'
        )
        process.exit(1)
      }

      if (opts.github && !process.env['GITHUB_TOKEN']) {
        process.stderr.write(
          'Error: GITHUB_TOKEN env var is required for GitHub mode.\n'
        )
        process.exit(1)
      }

      try {
        await runScanFixRescan({
          url: opts.url,
          src: opts.src,
          apiKey: apiKey ?? '',
          glob: opts.glob,
          scanOnly: opts.scanOnly,
          rescan: opts.rescan,
          json: opts.json,
          github: opts.github,
          branch: opts.branch,
          srcPath: opts.srcPath,
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
