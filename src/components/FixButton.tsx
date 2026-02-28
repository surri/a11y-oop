'use client'

import type { SourceMode } from '@/shared/types'

interface FixButtonProps {
  issueCount: number
  onFix: () => void
  isFixing: boolean
  sourceMode?: SourceMode
}

export default function FixButton({ issueCount, onFix, isFixing, sourceMode }: FixButtonProps) {
  const disabled = issueCount === 0 || isFixing
  const isGitHub = sourceMode === 'github'

  return (
    <button
      type="button"
      onClick={onFix}
      disabled={disabled}
      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-3 text-lg"
    >
      {isFixing ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {isGitHub ? 'Creating PR...' : 'Applying Fixes...'}
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isGitHub ? `Create PR with ${issueCount} Fix${issueCount !== 1 ? 'es' : ''}` : `Auto-Fix All ${issueCount} Issues`}
        </>
      )}
    </button>
  )
}
