'use client'

import { useState } from 'react'
import type { A11yIssue } from '@/shared/types'
import IssueCard from './IssueCard'

interface IssueListProps {
  issues: A11yIssue[]
}

type Severity = 'critical' | 'serious' | 'moderate' | 'minor'

const severityOrder: Severity[] = ['critical', 'serious', 'moderate', 'minor']

const severityDot: Record<Severity, string> = {
  critical: 'bg-red-500',
  serious: 'bg-orange-500',
  moderate: 'bg-yellow-500',
  minor: 'bg-blue-500',
}

const severityBadge: Record<Severity, string> = {
  critical: 'bg-red-950 text-red-400',
  serious: 'bg-orange-950 text-orange-400',
  moderate: 'bg-yellow-950 text-yellow-400',
  minor: 'bg-blue-950 text-blue-400',
}

export default function IssueList({ issues }: IssueListProps) {
  const grouped = severityOrder.reduce<Record<Severity, A11yIssue[]>>(
    (acc, sev) => ({
      ...acc,
      [sev]: issues.filter((i) => i.severity === sev),
    }),
    { critical: [], serious: [], moderate: [], minor: [] }
  )

  const defaultExpanded = new Set<Severity>(['critical', 'serious'])
  const [expanded, setExpanded] = useState<Set<Severity>>(defaultExpanded)

  const toggleSection = (sev: Severity) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(sev)) {
        next.delete(sev)
      } else {
        next.add(sev)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-100">Issues Found</h3>
      {severityOrder.map((sev) => {
        const group = grouped[sev]
        if (group.length === 0) return null
        const isExpanded = expanded.has(sev)

        return (
          <div key={sev} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleSection(sev)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${severityDot[sev]}`} />
              <span className="text-sm font-semibold text-gray-200 capitalize">{sev}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBadge[sev]}`}>
                {group.length}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="flex flex-col gap-2 pl-4">
                {group.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
