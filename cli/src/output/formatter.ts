import chalk from 'chalk'
import type { ScanResult, FixResult, RescanResult, A11yIssue } from '../../../src/shared/types'

function scoreColor(score: number): string {
  if (score >= 80) return chalk.green(score.toString())
  if (score >= 50) return chalk.yellow(score.toString())
  return chalk.red(score.toString())
}

function severityColor(severity: A11yIssue['severity']): string {
  switch (severity) {
    case 'critical': return chalk.red(severity)
    case 'serious': return chalk.yellow(severity)
    case 'moderate': return chalk.blue(severity)
    case 'minor': return chalk.gray(severity)
  }
}

export function formatScanResult(result: ScanResult): string {
  const lines: string[] = []

  lines.push('')
  lines.push(chalk.bold('Scan Results'))
  lines.push(chalk.dim(`URL: ${result.url}`))
  lines.push(chalk.dim(`Timestamp: ${result.timestamp}`))
  lines.push('')

  const lhPart = result.lighthouseScore !== null
    ? `  Lighthouse: ${scoreColor(result.lighthouseScore)}/100`
    : ''
  lines.push(`  Gemini Score: ${scoreColor(result.score)}/100${lhPart}`)
  lines.push(`  Axe violations: ${chalk.bold(result.axeViolationCount.toString())}`)
  lines.push(`  Issues found: ${chalk.bold(result.issues.length.toString())}`)
  lines.push('')

  if (result.summary) {
    lines.push(chalk.dim('Summary:'))
    lines.push(`  ${result.summary}`)
    lines.push('')
  }

  const bySeverity = (s: A11yIssue['severity']) =>
    result.issues.filter((i) => i.severity === s).length

  lines.push('  ' + chalk.red(`critical: ${bySeverity('critical')}`) +
    '  ' + chalk.yellow(`serious: ${bySeverity('serious')}`) +
    '  ' + chalk.blue(`moderate: ${bySeverity('moderate')}`) +
    '  ' + chalk.gray(`minor: ${bySeverity('minor')}`))

  return lines.join('\n')
}

export function formatIssues(issues: A11yIssue[]): string {
  if (issues.length === 0) {
    return chalk.green('  No issues found.')
  }

  const lines: string[] = []
  lines.push('')
  lines.push(chalk.bold('Issues:'))

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w)

  const header =
    '  ' +
    chalk.bold(col('Component', 24)) + '  ' +
    chalk.bold(col('Severity', 10)) + '  ' +
    chalk.bold(col('WCAG', 12)) + '  ' +
    chalk.bold('Description')
  lines.push(header)
  lines.push('  ' + chalk.dim('-'.repeat(90)))

  for (const issue of issues) {
    const row =
      '  ' +
      col(issue.component, 24) + '  ' +
      col(severityColor(issue.severity), 10 + 10) + '  ' +
      col(issue.wcagCriteria, 12) + '  ' +
      issue.description.slice(0, 60)
    lines.push(row)
  }

  return lines.join('\n')
}

export function formatFixResult(result: FixResult): string {
  const lines: string[] = []
  lines.push('')
  lines.push(chalk.bold('Fix Results'))
  lines.push(`  Applied: ${chalk.green(result.applied.toString())}`)
  lines.push(`  Failed:  ${result.failed > 0 ? chalk.red(result.failed.toString()) : chalk.gray('0')}`)

  if (result.errors.length > 0) {
    lines.push('')
    lines.push(chalk.red('  Errors:'))
    for (const err of result.errors) {
      lines.push(chalk.red(`    - ${err}`))
    }
  }

  return lines.join('\n')
}

export function formatRescanResult(result: RescanResult): string {
  const lines: string[] = []
  lines.push('')
  lines.push(chalk.bold('Rescan Results'))

  const scoreDelta = result.after.score - result.before.score
  const deltaStr = scoreDelta >= 0
    ? chalk.green(`+${scoreDelta}`)
    : chalk.red(scoreDelta.toString())

  lines.push(`  Score:  ${scoreColor(result.before.score)} -> ${scoreColor(result.after.score)}  (${deltaStr})`)

  if (result.before.lighthouseScore !== null && result.after.lighthouseScore !== null) {
    const lhDelta = result.after.lighthouseScore - result.before.lighthouseScore
    const lhDeltaStr = lhDelta >= 0
      ? chalk.green(`+${lhDelta}`)
      : chalk.red(lhDelta.toString())
    lines.push(`  Lighthouse: ${scoreColor(result.before.lighthouseScore)} -> ${scoreColor(result.after.lighthouseScore)}  (${lhDeltaStr})`)
  }

  lines.push(`  Issues fixed:     ${chalk.green(result.issuesFixed.toString())}`)
  lines.push(`  Issues remaining: ${result.issuesRemaining > 0 ? chalk.yellow(result.issuesRemaining.toString()) : chalk.green('0')}`)

  return lines.join('\n')
}
