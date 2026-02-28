'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { A11yIssue } from '@/shared/types'

interface ScreenshotViewerProps {
  screenshot: string
  issues: A11yIssue[]
}

const severityColors: Record<string, string> = {
  critical: 'border-red-500',
  serious: 'border-orange-500',
  moderate: 'border-yellow-500',
  minor: 'border-blue-500',
}

export default function ScreenshotViewer({ screenshot, issues }: ScreenshotViewerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)
  const issuesWithBox = issues.filter((i) => i.boundingBox)

  const updateScale = useCallback(() => {
    const img = imgRef.current
    if (!img || img.naturalWidth === 0) return
    setScale(img.clientWidth / img.naturalWidth)
  }, [])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new ResizeObserver(updateScale)
    observer.observe(img)
    return () => observer.disconnect()
  }, [updateScale])

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-gray-500 font-mono">screenshot</span>
      </div>
      <div className="relative">
        <img
          ref={imgRef}
          src={`data:image/png;base64,${screenshot}`}
          alt="Page screenshot"
          className="w-full block"
          onLoad={updateScale}
        />
        {/* Overlay boxes */}
        <div className="absolute inset-0">
          {issuesWithBox.map((issue) => {
            const box = issue.boundingBox!
            const isHovered = hoveredId === issue.id
            const colorClass = severityColors[issue.severity] ?? 'border-gray-400'
            return (
              <div
                key={issue.id}
                style={{
                  position: 'absolute',
                  left: `${box.x * scale}px`,
                  top: `${box.y * scale}px`,
                  width: `${box.width * scale}px`,
                  height: `${box.height * scale}px`,
                }}
                className={`border-2 ${colorClass} cursor-pointer transition-all duration-200 ${isHovered ? 'animate-pulse opacity-100' : 'opacity-60'}`}
                onMouseEnter={() => setHoveredId(issue.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isHovered && (
                  <div className="absolute top-full left-0 z-10 mt-1 max-w-xs bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-xl text-xs text-gray-200 pointer-events-none">
                    <div className="font-semibold text-gray-100 mb-1">{issue.component}</div>
                    <div>{issue.description}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
