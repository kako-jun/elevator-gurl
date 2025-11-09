import { GameStats } from '../types/game'

interface GameOverScreenProps {
  victory: boolean
  stats: GameStats
  onRestart: () => void
}

export const GameOverScreen = ({
  victory,
  stats,
  onRestart,
}: GameOverScreenProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-white">
      <div className="max-w-md space-y-6 text-center">
        {/* Title */}
        <div>
          {victory ? (
            <>
              <h1 className="mb-2 font-mono text-4xl font-bold text-green-500">
                SHIFT COMPLETE
              </h1>
              <p className="font-mono text-sm text-gray-400">
                You survived until dawn
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 font-mono text-4xl font-bold text-red-500">
                SHIFT TERMINATED
              </h1>
              <p className="font-mono text-sm text-gray-400">
                {stats.misreports >= 3
                  ? 'Too many false reports'
                  : 'Insufficient anomaly detection'}
              </p>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/50 p-6 font-mono text-sm">
          <div className="mb-4 text-xs text-gray-500 uppercase">
            Performance Report
          </div>

          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Anomalies Detected:</span>
            <span
              className={victory ? 'text-green-500' : 'text-yellow-500'}
            >{`${stats.detectedAnomalies} / ${stats.totalAnomalies}`}</span>
          </div>

          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Correct Reports:</span>
            <span className="text-green-500">{stats.correctReports}</span>
          </div>

          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">False Reports:</span>
            <span
              className={
                stats.misreports > 0 ? 'text-red-500' : 'text-gray-500'
              }
            >
              {stats.misreports}
            </span>
          </div>

          <div className="flex justify-between pt-2">
            <span className="text-gray-400">Shift Duration:</span>
            <span className="text-white">
              {Math.floor(stats.currentTime / 60000)} min{' '}
              {Math.floor((stats.currentTime % 60000) / 1000)} sec
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4 font-mono text-xs text-gray-400">
          {victory ? (
            <>
              Your vigilance has been noted. The anomalies in Corona Road
              continue to manifest, but you have proven yourself capable of
              detecting them.
              <br />
              <br />
              <span className="text-yellow-500">
                Or have you truly seen everything...?
              </span>
            </>
          ) : (
            <>
              The anomalies of Corona Road have overwhelmed your perception.
              Further training is required before you can resume monitoring
              duties.
              <br />
              <br />
              <span className="text-red-500">Remember: trust your eyes.</span>
            </>
          )}
        </div>

        {/* Restart button */}
        <button
          onClick={onRestart}
          className="w-full rounded-lg border-2 border-blue-500 bg-blue-900/30 py-4 font-mono text-lg font-bold text-blue-500 uppercase transition-all hover:bg-blue-900/50 active:scale-95"
        >
          [ RESTART SHIFT ]
        </button>
      </div>
    </div>
  )
}
