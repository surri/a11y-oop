'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GitHubRepoConfig } from '@/shared/types'

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
      setError(err instanceof Error ? err.message : 'Failed to load repos')
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

  const handleSelect = (repo: Repo) => {
    onGitHubConfigChange({
      ...githubConfig,
      owner: repo.owner,
      repo: repo.name,
      branch: repo.default_branch,
    })
  }

  const handleClear = () => {
    onGitHubConfigChange({
      ...githubConfig,
      owner: '',
      repo: '',
      branch: 'main',
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
            disabled={disabled}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Change
          </button>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Branch</label>
            <input
              type="text"
              value={githubConfig.branch}
              onChange={(e) => onGitHubConfigChange({ ...githubConfig, branch: e.target.value })}
              placeholder="main"
              disabled={disabled}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Source path</label>
            <input
              type="text"
              value={githubConfig.srcPath}
              onChange={(e) => onGitHubConfigChange({ ...githubConfig, srcPath: e.target.value })}
              placeholder="src"
              disabled={disabled}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition text-sm"
            />
          </div>
        </div>
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
          disabled={disabled}
        />
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            disabled={disabled}
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
                    disabled={disabled}
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
      const res = await fetch('/api/github/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
      })
      const data = await res.json() as { valid: boolean; defaultBranch: string }
      if (data.valid) {
        setValidationState('valid')
        setValidationMessage(`Repository found. Default branch: ${data.defaultBranch}`)
        onGitHubConfigChange({
          ...githubConfig,
          owner: parsed.owner,
          repo: parsed.repo,
          branch: data.defaultBranch,
        })
      } else {
        setValidationState('invalid')
        setValidationMessage('Repository not found or not accessible.')
      }
    } catch {
      setValidationState('invalid')
      setValidationMessage('Validation failed.')
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
