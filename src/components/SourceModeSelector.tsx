'use client'

import { useSession } from 'next-auth/react'
import type { SourceMode, GitHubRepoConfig, LocalSourceConfig } from '@/shared/types'
import RepoPicker from './RepoPicker'

interface SourceModeSelectorProps {
  sourceMode: SourceMode
  onSourceModeChange: (mode: SourceMode) => void
  githubConfig: GitHubRepoConfig
  onGitHubConfigChange: (config: GitHubRepoConfig) => void
  localConfig: LocalSourceConfig
  onLocalConfigChange: (config: LocalSourceConfig) => void
  disabled?: boolean
}

export default function SourceModeSelector({
  sourceMode,
  onSourceModeChange,
  githubConfig,
  onGitHubConfigChange,
  localConfig,
  onLocalConfigChange,
  disabled,
}: SourceModeSelectorProps) {
  const { data: session } = useSession()

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSourceModeChange('local')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 disabled:opacity-50 ${
            sourceMode === 'local'
              ? 'bg-violet-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Local
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSourceModeChange('github')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 disabled:opacity-50 ${
            sourceMode === 'github'
              ? 'bg-violet-600 text-white shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          GitHub
        </button>
      </div>

      {/* Local source path input */}
      {sourceMode === 'local' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="local-src-path" className="text-xs text-gray-400 font-medium">
            Source Path
          </label>
          <input
            id="local-src-path"
            type="text"
            value={localConfig.srcPath}
            onChange={(e) => onLocalConfigChange({ ...localConfig, srcPath: e.target.value })}
            placeholder="~/hackerthon/a11y-oop-demo/src"
            disabled={disabled}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition font-mono"
          />
        </div>
      )}

      {/* GitHub repo picker (when authenticated) */}
      {sourceMode === 'github' && session && (
        <RepoPicker
          githubConfig={githubConfig}
          onGitHubConfigChange={onGitHubConfigChange}
          disabled={disabled}
        />
      )}
    </div>
  )
}
