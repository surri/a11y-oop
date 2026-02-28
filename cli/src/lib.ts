export {
  captureScreenshot,
  runAxeScan,
  readSourceFiles,
  analyzeAccessibility,
  runLighthouseAccessibility,
  applyPatches,
  fixOrphanedClosingTags,
  runScan,
  runFix,
  runRescan,
  runFullPipeline,
  createOctokit,
  readRepoFiles,
  createFixPR,
  validateRepoAccess,
} from '../../src/core'

export type {
  AxeScanResult,
  ScanConfig,
  PatchConfig,
  ViewportConfig,
  PipelineCallbacks,
} from '../../src/core'

export type {
  A11yIssue,
  ScanResult,
  FixPatch,
  FixRequest,
  GitHubPrResult,
  FixResult,
  RescanResult,
  ScanStep,
  GitHubRepoConfig,
  SourceMode,
} from '../../src/shared/types'
