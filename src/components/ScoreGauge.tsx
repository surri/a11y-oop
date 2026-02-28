'use client'

import { useEffect, useRef, useState } from 'react'

interface ScoreGaugeProps {
  score: number
  lighthouseScore?: number | null
}

function getColor(score: number): string {
  if (score < 50) return '#ef4444' // red-500
  if (score < 80) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

export default function ScoreGauge({ score, lighthouseScore }: ScoreGaugeProps) {
  const radius = 80
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  const [animatedOffset, setAnimatedOffset] = useState(circumference)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const targetOffset = circumference - (score / 100) * circumference
    const startOffset = circumference
    const duration = 1000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = startOffset + (targetOffset - startOffset) * eased
      setAnimatedOffset(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    }
  }, [score, circumference])

  const color = getColor(score)
  const size = (radius + strokeWidth) * 2
  const lhColor = lighthouseScore != null ? getColor(lighthouseScore) : '#6b7280'
  const showLighthouseBadge = lighthouseScore != null && lighthouseScore !== score
  const primaryLabel = lighthouseScore != null ? 'Lighthouse Score' : 'Score'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke 0.3s' }}
          />
          {/* Score text */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize="36"
            fontWeight="700"
            dy="-8"
          >
            {score}
          </text>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#6b7280"
            fontSize="14"
            dy="18"
          >
            /100
          </text>
        </svg>

        {/* Lighthouse badge */}
        {showLighthouseBadge && (
          <div
            className="absolute -right-2 -bottom-1 flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 shadow-lg"
            title="Lighthouse Accessibility Score"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" fill={lhColor} opacity="0.2" />
              <path d="M12 2L4 7v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke={lhColor} strokeWidth="1.5" fill="none" />
            </svg>
            <span className="text-xs font-bold" style={{ color: lhColor }}>{lighthouseScore}</span>
          </div>
        )}
      </div>
      <span className="text-sm text-gray-400 font-medium">{primaryLabel}</span>
    </div>
  )
}
