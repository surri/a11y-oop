'use client'

import { useState } from 'react'
import type { ScanResult, RescanResult, ScanStep, SourceMode, GitHubRepoConfig, LocalSourceConfig, GitHubPrResult } from '@/shared/types'
import ScanForm from '@/components/ScanForm'
import ScanProgress from '@/components/ScanProgress'
import ScoreGauge from '@/components/ScoreGauge'
import ScreenshotViewer from '@/components/ScreenshotViewer'
import IssueList from '@/components/IssueList'
import FixButton from '@/components/FixButton'
import BeforeAfter from '@/components/BeforeAfter'
import PrResult from '@/components/PrResult'
import UserMenu from '@/components/UserMenu'
import SourceModeSelector from '@/components/SourceModeSelector'

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanStep, setScanStep] = useState<ScanStep>('idle')
  const [isFixing, setIsFixing] = useState(false)
  const [rescanResult, setRescanResult] = useState<RescanResult | null>(null)
  const [sourceMode, setSourceMode] = useState<SourceMode>('local')
  const [githubConfig, setGitHubConfig] = useState<GitHubRepoConfig>({
    owner: '',
    repo: '',
    branch: undefined,
    srcPath: undefined,
    filePattern: undefined,
  })
  const [localConfig, setLocalConfig] = useState<LocalSourceConfig>({
    srcPath: '',
  })
  const [scanError, setScanError] = useState<string | null>(null)
  const [fixPrResult, setFixPrResult] = useState<GitHubPrResult | null>(null)
  const [showFixSourceConfig, setShowFixSourceConfig] = useState(false)
  const [fixConfigError, setFixConfigError] = useState<string | null>(null)

  const isSourceConfigured = () =>
    sourceMode === 'github'
      ? Boolean(githubConfig.owner && githubConfig.repo)
      : Boolean(localConfig.srcPath.trim())

  const handleScan = async (targetUrl: string) => {
    const runtimeUrl = targetUrl.trim()
    if (!runtimeUrl) return

    setUrl(runtimeUrl)
    setScanResult(null)
    setRescanResult(null)
    setFixPrResult(null)
    setScanError(null)
    setScanStep('capturing')

    try {
      const steps: ScanStep[] = ['capturing', 'scanning', 'analyzing']
      let stepIdx = 0

      const stepTimer = setInterval(() => {
        stepIdx += 1
        if (stepIdx < steps.length) {
          setScanStep(steps[stepIdx])
        }
      }, 2000)

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: runtimeUrl }),
      })

      clearInterval(stepTimer)

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const detail = body?.details ?? body?.error ?? res.statusText
        throw new Error(detail)
      }

      const data: ScanResult = await res.json()
      setScanResult(data)
      setScanStep('complete')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setScanError(message)
      setScanStep('error')
    }
  }

  const runFixWithCurrentSource = async () => {
    if (!scanResult) return
    setIsFixing(true)
    setFixConfigError(null)
    const currentSourceMode: SourceMode = sourceMode

    try {
      const fixRes = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceMode: currentSourceMode,
          github: currentSourceMode === 'github' ? githubConfig : undefined,
          local: currentSourceMode === 'local' ? localConfig : undefined,
          scanContext: {
            screenshot: scanResult.screenshot,
            lighthouseReport: scanResult.lighthouseReport,
          },
        }),
      })

      if (!fixRes.ok) {
        const body = await fixRes.json().catch(() => null)
        if (fixRes.status === 400 || fixRes.status === 401) {
          setShowFixSourceConfig(true)
        }
        throw new Error(body?.error ?? fixRes.statusText)
      }

      const fixData = await fixRes.json()

      if (currentSourceMode === 'github') {
        if (fixData.pr) {
          setFixPrResult(fixData.pr)
        } else if (fixData.errors?.length) {
          setFixConfigError(String(fixData.errors[0]))
        }
        return
      }

      if (!url.trim() || fixData.applied === 0) {
        if (fixData.errors?.length) {
          setFixConfigError(String(fixData.errors[0]))
        }
        return
      }

      const rescanRes = await fetch('/api/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          beforeScreenshot: scanResult.screenshot,
          beforeScore: scanResult.score,
          beforeLighthouseScore: scanResult.lighthouseScore,
          beforeIssueCount: scanResult.issues.length,
          sourceMode: currentSourceMode,
          local: localConfig,
        }),
      })

      if (!rescanRes.ok) {
        throw new Error(`Rescan failed: ${rescanRes.statusText}`)
      }

      const rescan: RescanResult = await rescanRes.json()
      setRescanResult(rescan)
    } catch (error) {
      setFixConfigError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsFixing(false)
    }
  }

  const handleFix = async () => {
    if (!scanResult) return
    if (!isSourceConfigured()) {
      setShowFixSourceConfig(true)
      return
    }
    await runFixWithCurrentSource()
  }

  const isScanning = scanStep !== 'idle' && scanStep !== 'complete' && scanStep !== 'error'
  const showProgress = isScanning
  const showResults = scanStep === 'complete' && scanResult !== null && rescanResult === null && fixPrResult === null
  const showRescan = rescanResult !== null && scanResult !== null
  const showPrResult = fixPrResult !== null

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100 leading-none">A11y Oop</h1>
            <p className="text-xs text-gray-500 mt-0.5">Accessibility DevTool</p>
          </div>
          <UserMenu />
          {scanStep === 'complete' && scanResult && (
            <button
              type="button"
              onClick={() => {
                setScanStep('idle')
                setScanResult(null)
                setRescanResult(null)
                setFixPrResult(null)
                setFixConfigError(null)
                setUrl('')
              }}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5"
            >
              New Scan
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {scanStep === 'idle' && (
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-3">
              Lighthouse-first accessibility analysis
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Scan URL first. Connect repository/local source only when generating fixes.
            </p>
          </div>
        )}

        {scanStep === 'idle' && (
          <ScanForm
            onScan={handleScan}
            isScanning={false}
          />
        )}

        {showProgress && (
          <ScanProgress currentStep={scanStep} />
        )}

        {scanStep === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <div className="text-red-400 text-lg font-semibold">Scan failed</div>
            {scanError && (
              <div className="max-w-md w-full bg-red-950/50 border border-red-900/50 rounded-lg px-4 py-3 text-sm text-red-300">
                {scanError.includes('ECONNREFUSED') || scanError.includes('ERR_CONNECTION_REFUSED')
                  ? `대상 URL에 연결할 수 없습니다. 웹 서버가 실행 중인지 확인해 주세요.`
                  : scanError.includes('ENOTFOUND')
                    ? `대상 URL을 찾을 수 없습니다. 주소를 다시 확인해 주세요.`
                    : scanError}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setScanStep('idle'); setScanError(null) }}
              className="text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg px-4 py-2 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {showResults && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <ScoreGauge score={scanResult.score} lighthouseScore={scanResult.lighthouseScore} />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-100 mb-1">
                  {scanResult.issues.length} issue{scanResult.issues.length !== 1 ? 's' : ''} found
                </h2>
                <p className="text-gray-400 text-sm mb-2">{scanResult.summary}</p>
                <p className="text-xs text-gray-500 mb-1">
                  Mode: {scanResult.mode === 'runtime-dom' ? 'Runtime + Lighthouse' : scanResult.mode}
                </p>
                {scanResult.url && (
                  <p className="text-xs text-gray-600 font-mono">{scanResult.url}</p>
                )}
              </div>
            </div>

            <ScreenshotViewer screenshot={scanResult.screenshot} issues={scanResult.issues} />
            <IssueList issues={scanResult.issues} />
            {fixConfigError && (
              <div className="text-sm text-amber-300 bg-amber-950/40 border border-amber-900/40 rounded-lg px-4 py-3">
                {fixConfigError}
              </div>
            )}
            <FixButton
              issueCount={scanResult.issues.length}
              onFix={handleFix}
              isFixing={isFixing}
              sourceMode={sourceMode}
            />
          </div>
        )}

        {showPrResult && fixPrResult && (
          <div className="flex flex-col gap-8">
            <PrResult prResult={fixPrResult} />
          </div>
        )}

        {showRescan && (
          <BeforeAfter
            before={rescanResult!.before}
            after={rescanResult!.after}
            issuesFixed={rescanResult!.issuesFixed}
          />
        )}
      </main>

      {showFixSourceConfig && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Connect Source for Fix</h3>
            <p className="text-sm text-gray-400 mb-5">
              Select GitHub repository or local source path. Gemini will generate patches using Lighthouse findings and this source.
            </p>

            <SourceModeSelector
              sourceMode={sourceMode}
              onSourceModeChange={setSourceMode}
              githubConfig={githubConfig}
              onGitHubConfigChange={setGitHubConfig}
              localConfig={localConfig}
              onLocalConfigChange={setLocalConfig}
              disabled={isFixing}
            />

            {fixConfigError && (
              <p className="mt-4 text-xs text-amber-300">{fixConfigError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFixSourceConfig(false)}
                className="text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg px-4 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFixing}
                onClick={async () => {
                  if (!isSourceConfigured()) {
                    setFixConfigError('Select GitHub repository or local source path first.')
                    return
                  }
                  setShowFixSourceConfig(false)
                  await runFixWithCurrentSource()
                }}
                className="text-sm text-white bg-violet-600 hover:bg-violet-500 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                Continue to Fix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
