'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GitHubRepoConfig, GitHubResolvedConfig } from '@/shared/types'

interface Repo {
  full_name: string
  name: string
  owner: string
  default_branch: string
  private: boolean
  description: string | null
}

interface RepoPickerProps {
  githubConfig: GitHubRepoConfig
  onGitHubConfigChange: (config: GitHubRepoConfig) => void
  disabled?: boolean
}

async function resolveGitHubConfig(payload: GitHubRepoConfig): Promise<GitHubResolvedConfig> {
  const response = await fetch('/api/github/resolve-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const detail = data?.error ?? response.statusText
    throw new Error(detail)
  }

  return response.json() as Promise<GitHubResolvedConfig>
}

export default function RepoPicker({
  githubConfig,
  onGitHubConfigChange,
  disabled,
}: RepoPickerProps) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')

  const selectedRepo = githubConfig.owner && githubConfig.repo
    ? `${githubConfig.owner}/${githubConfig.repo}`
    : ''

  const fetchRepos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/github/repos')
      if (!res.ok) throw new Error('Failed to load repositories')
      const data: Repo[] = await res.json()
      setRepos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRepos()
  }, [fetchRepos])

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const applyResolvedConfig = (resolved: GitHubResolvedConfig) => {
    onGitHubConfigChange({
      owner: resolved.owner,
      repo: resolved.repo,
      branch: resolved.branch,
      srcPath: resolved.srcPath,
      filePattern: resolved.filePattern,
    })
  }

  const selectRepo = async (payload: GitHubRepoConfig) => {
    setResolving(true)
    setResolveError('')
    try {
      const resolved = await resolveGitHubConfig(payload)
      applyResolvedConfig(resolved)
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Failed to resolve repository configuration')
    } finally {
      setResolving(false)
    }
  }

  const handleSelect = async (repo: Repo) => {
    await selectRepo({
      owner: repo.owner,
      repo: repo.name,
      branch: repo.default_branch,
      srcPath: undefined,
      filePattern: undefined,
    })
  }

  const handleClear = () => {
    setResolveError('')
    onGitHubConfigChange({
      owner: '',
      repo: '',
      branch: undefined,
      srcPath: undefined,
      filePattern: undefined,
    })
  }

  if (selectedRepo && !showManualInput) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-gray-200 font-mono flex-1">{selectedRepo}</span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || resolving}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            Change
          </button>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2.5 text-xs text-gray-400 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Branch</span>
            <code className="text-gray-200">{githubConfig.branch ?? 'auto'}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Source</span>
            <code className="text-gray-200">{githubConfig.srcPath ?? '(repository root fallback)'}</code>
          </div>
        </div>

        {resolving && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            Resolving repository defaults...
          </div>
        )}

        {resolveError && (
          <p className="text-xs text-red-400">{resolveError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Select a repository</span>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {showManualInput ? 'Pick from list' : 'Enter URL manually'}
        </button>
      </div>

      {showManualInput ? (
        <ManualRepoInput
          githubConfig={githubConfig}
          onGitHubConfigChange={onGitHubConfigChange}
          disabled={disabled || resolving}
        />
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            disabled={disabled || resolving}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition text-sm"
          />

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-400">Loading repositories...</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 py-2">{error}</p>
          )}

          {!loading && !error && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-800">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No repositories found</div>
              ) : (
                filtered.slice(0, 50).map((repo) => (
                  <button
                    key={repo.full_name}
                    type="button"
                    onClick={() => handleSelect(repo)}
                    disabled={disabled || resolving}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-800/60 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate">{repo.full_name}</div>
                      {repo.description && (
                        <div className="text-xs text-gray-500 truncate">{repo.description}</div>
                      )}
                    </div>
                    {repo.private && (
                      <span className="text-[10px] text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">private</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {resolving && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Resolving repository defaults...
            </div>
          )}

          {resolveError && (
            <p className="text-xs text-red-400">{resolveError}</p>
          )}
        </>
      )}
    </div>
  )
}

function ManualRepoInput({
  githubConfig,
  onGitHubConfigChange,
  disabled,
}: {
  githubConfig: GitHubRepoConfig
  onGitHubConfigChange: (config: GitHubRepoConfig) => void
  disabled?: boolean
}) {
  const [repoUrl, setRepoUrl] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [validationMessage, setValidationMessage] = useState('')

  const parseGitHubUrl = (rawUrl: string): { owner: string; repo: string } | null => {
    try {
      const url = new URL(rawUrl)
      if (url.hostname !== 'github.com') return null
      const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/')
      if (parts.length < 2) return null
      return { owner: parts[0], repo: parts[1] }
    } catch {
      return null
    }
  }

  const handleValidate = async () => {
    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      setValidationState('invalid')
      setValidationMessage('Enter a valid GitHub URL (e.g. https://github.com/owner/repo)')
      return
    }

    setValidating(true)
    setValidationState('idle')
    try {
      const resolved = await resolveGitHubConfig({
        owner: parsed.owner,
        repo: parsed.repo,
        branch: undefined,
        srcPath: undefined,
        filePattern: undefined,
      })
      onGitHubConfigChange({
        owner: resolved.owner,
        repo: resolved.repo,
        branch: resolved.branch,
        srcPath: resolved.srcPath,
        filePattern: resolved.filePattern,
      })
      setValidationState('valid')
      setValidationMessage(
        `Repository ready. Branch: ${resolved.branch}, source: ${resolved.srcPath ?? 'repository root fallback'}`
      )
    } catch {
      setValidationState('invalid')
      setValidationMessage('Repository not found or not accessible.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value)
            setValidationState('idle')
          }}
          placeholder="https://github.com/owner/repo"
          disabled={disabled}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition text-sm"
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={disabled || validating || !repoUrl.trim()}
          className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {validating ? 'Checking...' : 'Validate'}
        </button>
      </div>
      {validationState !== 'idle' && (
        <p className={`text-xs ${validationState === 'valid' ? 'text-emerald-400' : 'text-red-400'}`}>
          {validationMessage}
        </p>
      )}
    </div>
  )
}
