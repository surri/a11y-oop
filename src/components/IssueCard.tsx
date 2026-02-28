'use client'

import { useState } from 'react'
import type { A11yIssue } from '@/shared/types'
import CodeDiff from './CodeDiff'

interface IssueCardProps {
  issue: A11yIssue
}

const severityBorder: Record<string, string> = {
  critical: 'border-red-700',
  serious: 'border-orange-700',
  moderate: 'border-yellow-700',
  minor: 'border-blue-700',
}

const severityChip: Record<string, string> = {
  critical: 'bg-red-950 text-red-400 border border-red-800',
  serious: 'bg-orange-950 text-orange-400 border border-orange-800',
  moderate: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
  minor: 'bg-blue-950 text-blue-400 border border-blue-800',
}

export default function IssueCard({ issue }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasCodeDiff = Boolean(issue.currentCode && issue.fixedCode)

  return (
    <div
      className={`bg-gray-900 border ${severityBorder[issue.severity] ?? 'border-gray-700'} rounded-xl overflow-hidden transition-all`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${severityChip[issue.severity]}`}>
              {issue.component || issue.selector || 'Runtime Finding'}
            </span>
            {issue.wcagCriteria && (
              <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">
                {issue.wcagCriteria}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 leading-snug">{issue.description}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-3">
          {hasCodeDiff ? (
            <CodeDiff currentCode={issue.currentCode!} fixedCode={issue.fixedCode!} />
          ) : (
            <div className="text-xs text-gray-400 leading-relaxed">
              <p className="mb-2">
                Source mapping is not generated yet. Select repository/local source at fix time to generate concrete code changes.
              </p>
              {issue.currentCode && (
                <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-300 whitespace-pre-wrap overflow-auto">
                  {issue.currentCode}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
