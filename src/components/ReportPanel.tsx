import { useState } from 'react'
import { AnomalyCategory } from '../types/game'

interface ReportPanelProps {
  onReport: (category: AnomalyCategory) => void
  disabled?: boolean
}

const CATEGORIES: { category: AnomalyCategory; icon: string; color: string }[] =
  [
    { category: 'Camera', icon: '📹', color: 'text-blue-400' },
    { category: 'Object', icon: '📦', color: 'text-yellow-400' },
    { category: 'Environment', icon: '🌆', color: 'text-green-400' },
    { category: 'Person', icon: '🚶', color: 'text-purple-400' },
    { category: 'Surreal', icon: '👁️', color: 'text-red-400' },
  ]

export const ReportPanel = ({ onReport, disabled }: ReportPanelProps) => {
  const [showCategories, setShowCategories] = useState(false)

  const handleReport = (category: AnomalyCategory) => {
    onReport(category)
    setShowCategories(false)
  }

  return (
    <div className="report-panel w-full bg-black/90 p-4">
      {!showCategories ? (
        <button
          onClick={() => setShowCategories(true)}
          disabled={disabled}
          className="w-full rounded-lg border-2 border-red-500 bg-red-900/30 py-4 font-mono text-lg font-bold text-red-500 uppercase transition-all hover:bg-red-900/50 active:scale-95 disabled:opacity-50"
        >
          [ REPORT ANOMALY ]
        </button>
      ) : (
        <div className="space-y-2">
          <div className="mb-3 text-center font-mono text-sm text-gray-400">
            SELECT ANOMALY TYPE
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ category, icon, color }) => (
              <button
                key={category}
                onClick={() => handleReport(category)}
                className={`rounded-lg border border-gray-700 bg-gray-900/50 p-3 font-mono text-sm transition-all hover:border-white hover:bg-gray-800 active:scale-95 ${color}`}
              >
                <div className="text-2xl">{icon}</div>
                <div className="mt-1 text-xs uppercase">{category}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCategories(false)}
            className="mt-2 w-full rounded border border-gray-700 bg-black/50 py-2 font-mono text-xs text-gray-500 hover:text-white"
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  )
}
