'use client'

import { useState } from 'react'
import type { SourceMode, GitHubRepoConfig, LocalSourceConfig } from '@/shared/types'
import SourceModeSelector from './SourceModeSelector'

interface ScanFormProps {
  onScan: (url: string) => void
  isScanning: boolean
  sourceMode: SourceMode
  onSourceModeChange: (mode: SourceMode) => void
  githubConfig: GitHubRepoConfig
  onGitHubConfigChange: (config: GitHubRepoConfig) => void
  localConfig: LocalSourceConfig
  onLocalConfigChange: (config: LocalSourceConfig) => void
}

export default function ScanForm({
  onScan,
  isScanning,
  sourceMode,
  onSourceModeChange,
  githubConfig,
  onGitHubConfigChange,
  localConfig,
  onLocalConfigChange,
}: ScanFormProps) {
  const [url, setUrl] = useState('http://localhost:5173')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onScan(url.trim())
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Scan a URL</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter a URL to detect and fix WCAG accessibility violations automatically.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SourceModeSelector
            sourceMode={sourceMode}
            onSourceModeChange={onSourceModeChange}
            githubConfig={githubConfig}
            onGitHubConfigChange={onGitHubConfigChange}
            localConfig={localConfig}
            onLocalConfigChange={onLocalConfigChange}
            disabled={isScanning}
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={isScanning}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition"
          />
          <button
            type="submit"
            disabled={isScanning || !url.trim()}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-violet-500/25"
          >
            {isScanning ? 'Scanning...' : 'Scan for Issues'}
          </button>
        </form>
      </div>
    </div>
  )
}
