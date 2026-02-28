export type AnalyzerProvider = 'genai' | 'vertex'

export interface VertexConfig {
  project: string
  location: string
}

export interface ScanConfig {
  url: string
  srcDir: string
  fileGlob?: string
  geminiApiKey: string
  provider?: AnalyzerProvider
  vertexConfig?: VertexConfig
  enableGrounding?: boolean
  enableCaching?: boolean
}

export interface PatchConfig {
  srcDir: string
}

export interface ViewportConfig {
  width?: number
  height?: number
}

export interface PipelineCallbacks {
  onStep?: (step: string) => void
  onProgress?: (message: string) => void
  onError?: (error: Error) => void
}
