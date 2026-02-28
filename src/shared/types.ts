export interface A11yIssue {
  id: string
  component: string
  filePath: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  wcagCriteria: string
  description: string
  currentCode: string
  fixedCode: string
  line: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ScanResult {
  url: string
  timestamp: string
  screenshot: string
  score: number
  lighthouseScore: number | null
  summary: string
  issues: A11yIssue[]
  axeViolationCount: number
}

export interface FixPatch {
  filePath: string
  original: string
  replacement: string
}

export interface FixRequest {
  patches: FixPatch[]
}

export interface GitHubPrResult {
  prUrl: string
  prNumber: number
  branchName: string
  filesChanged: number
}

export interface FixResult {
  applied: number
  failed: number
  errors: string[]
  pr?: GitHubPrResult
}

export interface RescanResult {
  before: {
    screenshot: string
    score: number
    lighthouseScore: number | null
  }
  after: {
    screenshot: string
    score: number
    lighthouseScore: number | null
  }
  issuesFixed: number
  issuesRemaining: number
}

export type ScanStep =
  | 'idle'
  | 'capturing'
  | 'scanning'
  | 'reading'
  | 'analyzing'
  | 'complete'
  | 'error'

export interface GitHubRepoConfig {
  owner: string
  repo: string
  branch: string
  srcPath: string
  filePattern?: string
}

export interface LocalSourceConfig {
  srcPath: string
}

export type SourceMode = 'local' | 'github'
