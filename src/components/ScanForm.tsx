'use client'

import { useState } from 'react'

interface ScanFormProps {
  onScan: (url: string) => void
  isScanning: boolean
}

export default function ScanForm({ onScan, isScanning }: ScanFormProps) {
  const [url, setUrl] = useState('http://localhost:5173')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    onScan(trimmed)
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Run Lighthouse Scan</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter a URL to render the page and collect Lighthouse accessibility findings.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={isScanning}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition"
          />

          <button
            type="submit"
            disabled={isScanning || !url.trim()}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-violet-500/25"
          >
            {isScanning ? 'Scanning...' : 'Scan with Lighthouse'}
          </button>
        </form>
      </div>
    </div>
  )
}
