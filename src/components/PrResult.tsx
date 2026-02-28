'use client'

import type { GitHubPrResult } from '@/shared/types'

interface PrResultProps {
  prResult: GitHubPrResult
}

export default function PrResult({ prResult }: PrResultProps) {
  return (
    <div className="bg-gray-900 border border-emerald-800/60 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-600/40 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-100">Pull Request Created</h3>
          <p className="text-xs text-gray-500">Accessibility fixes are ready for review</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* PR link */}
        <a
          href={prResult.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-700/40 rounded-lg px-4 py-3 transition group"
        >
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="text-emerald-300 text-sm font-medium group-hover:text-emerald-200 truncate">
            {prResult.prUrl}
          </span>
        </a>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            PR <span className="text-gray-300 font-mono">#{prResult.prNumber}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span>
            Branch{' '}
            <span className="text-gray-300 font-mono">{prResult.branchName}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span>
            <span className="text-gray-300 font-medium">{prResult.filesChanged}</span>{' '}
            {prResult.filesChanged === 1 ? 'file' : 'files'} changed
          </span>
        </div>
      </div>
    </div>
  )
}
