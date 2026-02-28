'use client'

import ScoreGauge from './ScoreGauge'

interface BeforeAfterProps {
  before: {
    screenshot: string
    score: number
    lighthouseScore: number | null
  }
  after: {
    screenshot: string
    score: number
    lighthouseScore: number | null
  }
  issuesFixed: number
}

export default function BeforeAfter({ before, after, issuesFixed }: BeforeAfterProps) {
  const scoreDelta = after.score - before.score
  const deltaColor = scoreDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
  const deltaPrefix = scoreDelta > 0 ? '+' : ''

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="text-sm font-semibold text-gray-400 px-3">Results</span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      {/* Fixed count */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl font-bold text-emerald-400">{issuesFixed}</span>
        <span className="text-sm text-gray-400">issues fixed</span>
        {scoreDelta !== 0 && (
          <span className={`text-sm font-semibold ${deltaColor}`}>
            Score {deltaPrefix}{scoreDelta} points
          </span>
        )}
      </div>

      {/* Before / After columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Before */}
        <div className="flex flex-col gap-4 items-center">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Before</div>
          <ScoreGauge score={before.score} lighthouseScore={before.lighthouseScore} />
          <div className="w-full rounded-xl overflow-hidden border border-gray-800">
            <img
              src={`data:image/png;base64,${before.screenshot}`}
              alt="Before fix screenshot"
              className="w-full block"
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden" />

        {/* After */}
        <div className="flex flex-col gap-4 items-center">
          <div className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">After</div>
          <ScoreGauge score={after.score} lighthouseScore={after.lighthouseScore} />
          <div className="w-full rounded-xl overflow-hidden border border-emerald-900/50">
            <img
              src={`data:image/png;base64,${after.screenshot}`}
              alt="After fix screenshot"
              className="w-full block"
            />
          </div>
        </div>
      </div>

      {/* Arrow overlay between columns */}
      <div className="flex justify-center -mt-2">
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-full px-4 py-2 shadow-lg">
          <span className="text-gray-400 text-sm">Before</span>
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="text-emerald-400 text-sm font-semibold">After</span>
        </div>
      </div>
    </div>
  )
}
