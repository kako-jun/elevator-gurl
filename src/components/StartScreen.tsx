interface StartScreenProps {
  onStart: () => void
}

export const StartScreen = ({ onStart }: StartScreenProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-white">
      <div className="max-w-md space-y-8 text-center">
        {/* Title */}
        <div>
          <h1 className="mb-2 font-mono text-4xl font-bold text-red-500">
            ANOMALY²
          </h1>
          <h2 className="font-mono text-2xl text-gray-400">Corona Road</h2>
        </div>

        {/* Subtitle */}
        <div className="border-y border-gray-800 py-4 font-mono text-sm text-gray-500">
          Underground Surveillance System
          <br />
          Night Shift: 00:00 - 06:00
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-left font-mono text-sm text-gray-400">
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
            <div className="mb-2 text-green-500">OBJECTIVE:</div>
            <p>
              Monitor security cameras and report any anomalies detected in
              Corona Road underground corridor. Survive until dawn.
            </p>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
            <div className="mb-2 text-yellow-500">CONTROLS:</div>
            <ul className="space-y-1">
              <li>• Swipe left/right to switch cameras</li>
              <li>• Tap REPORT ANOMALY when detected</li>
              <li>• Select correct anomaly category</li>
            </ul>
          </div>

          <div className="rounded-lg border border-red-900 bg-red-950/30 p-4">
            <div className="mb-2 text-red-500">WARNING:</div>
            <ul className="space-y-1">
              <li>• 3 false reports will terminate your shift</li>
              <li>• Missing anomalies may have consequences</li>
              <li>• Trust your instincts</li>
            </ul>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          className="w-full rounded-lg border-2 border-green-500 bg-green-900/30 py-4 font-mono text-lg font-bold text-green-500 uppercase transition-all hover:bg-green-900/50 active:scale-95"
        >
          [ BEGIN SHIFT ]
        </button>

        <div className="pt-4 font-mono text-xs text-gray-700">
          v1.0.0 - Anomaly Detection System
        </div>
      </div>
    </div>
  )
}
