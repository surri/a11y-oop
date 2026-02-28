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
      {sourceMode === 'github' && session && (
        <>
          <RepoPicker
            githubConfig={githubConfig}
            onGitHubConfigChange={onGitHubConfigChange}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => onSourceModeChange('local')}
            disabled={disabled}
            className="w-fit text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 hover:border-gray-600 rounded-lg px-2.5 py-1 disabled:opacity-50"
          >
            Use local source (advanced)
          </button>
        </>
      )}

      {sourceMode === 'github' && !session && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900/50 rounded-lg px-3 py-2">
            GitHub login is required only when accessing repository source.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className={`text-xs text-gray-200 border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1 transition-colors ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            >
              Sign in with GitHub
            </a>
            <button
              type="button"
              onClick={() => onSourceModeChange('local')}
              disabled={disabled}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 hover:border-gray-600 rounded-lg px-2.5 py-1 disabled:opacity-50"
            >
              Use local source instead
            </button>
          </div>
        </div>
      )}

      {sourceMode === 'local' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Source Path</span>
            <button
              type="button"
              onClick={() => onSourceModeChange('github')}
              disabled={disabled}
              className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              Back to GitHub mode
            </button>
          </div>
          <label htmlFor="local-src-path" className="text-xs text-gray-400 font-medium">
            Local project directory
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
    </div>
  )
}
