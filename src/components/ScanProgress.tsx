'use client'

import type { ScanStep } from '@/shared/types'

interface ScanProgressProps {
  currentStep: ScanStep
}

const steps: { key: ScanStep; label: string }[] = [
  { key: 'capturing', label: 'Taking Screenshot' },
  { key: 'scanning', label: 'Running axe-core' },
  { key: 'reading', label: 'Reading Source Code' },
  { key: 'analyzing', label: 'AI Analysis' },
]

const stepOrder: ScanStep[] = ['capturing', 'scanning', 'reading', 'analyzing', 'complete']

function getStepStatus(stepKey: ScanStep, currentStep: ScanStep): 'completed' | 'current' | 'pending' {
  const stepIdx = stepOrder.indexOf(stepKey)
  const currentIdx = stepOrder.indexOf(currentStep)
  if (currentIdx > stepIdx) return 'completed'
  if (currentIdx === stepIdx) return 'current'
  return 'pending'
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-5 h-5 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function ScanProgress({ currentStep }: ScanProgressProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-100 mb-6 text-center">Scanning...</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => {
            const status = getStepStatus(step.key, currentStep)
            return (
              <li key={step.key} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    status === 'completed'
                      ? 'border-emerald-500 bg-emerald-950'
                      : status === 'current'
                      ? 'border-violet-500 bg-violet-950'
                      : 'border-gray-700 bg-gray-800'
                  }`}>
                    {status === 'completed' && <CheckIcon />}
                    {status === 'current' && <SpinnerIcon />}
                    {status === 'pending' && (
                      <span className="w-2 h-2 rounded-full bg-gray-600" />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${status === 'completed' ? 'bg-emerald-700' : 'bg-gray-700'}`} />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  status === 'completed' ? 'text-emerald-400' :
                  status === 'current' ? 'text-violet-300' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
