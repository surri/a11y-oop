'use client'

interface CodeDiffProps {
  currentCode: string
  fixedCode: string
}

function addLineNumbers(code: string): { number: number; text: string }[] {
  return code.split('\n').map((line, i) => ({ number: i + 1, text: line }))
}

export default function CodeDiff({ currentCode, fixedCode }: CodeDiffProps) {
  const beforeLines = addLineNumbers(currentCode)
  const afterLines = addLineNumbers(fixedCode)

  return (
    <div className="flex flex-col gap-2 text-xs font-mono">
      <div>
        <div className="text-red-400 font-semibold px-3 py-1.5 bg-red-950/30 border border-red-900/50 rounded-t-lg">
          Before
        </div>
        <div className="bg-red-950/10 border border-red-900/30 border-t-0 rounded-b-lg overflow-x-auto">
          <pre className="p-3 text-gray-300 leading-5">
            {beforeLines.map((line) => (
              <div key={line.number} className="flex gap-3 hover:bg-red-950/20">
                <span className="select-none text-gray-600 w-6 text-right shrink-0">{line.number}</span>
                <span>{line.text}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
      <div>
        <div className="text-emerald-400 font-semibold px-3 py-1.5 bg-green-950/30 border border-green-900/50 rounded-t-lg">
          After
        </div>
        <div className="bg-green-950/10 border border-green-900/30 border-t-0 rounded-b-lg overflow-x-auto">
          <pre className="p-3 text-gray-300 leading-5">
            {afterLines.map((line) => (
              <div key={line.number} className="flex gap-3 hover:bg-green-950/20">
                <span className="select-none text-gray-600 w-6 text-right shrink-0">{line.number}</span>
                <span>{line.text}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}
