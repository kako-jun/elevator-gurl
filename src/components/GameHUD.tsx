import { GameStats } from '../types/game'
import { DEFAULT_CONFIG } from '../utils/gameConfig'

interface GameHUDProps {
  gameTime: string
  stats: GameStats
}

export const GameHUD = ({ gameTime, stats }: GameHUDProps) => {
  return (
    <div className="game-hud w-full bg-black/80 p-4 font-mono text-sm text-green-500">
      <div className="flex items-center justify-between">
        {/* Time */}
        <div className="flex items-center gap-2">
          <span className="text-green-400">TIME:</span>
          <span className="text-xl font-bold">{gameTime}</span>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div>
            <span className="text-green-400">REPORTS:</span>{' '}
            <span className="text-white">{stats.correctReports}</span>
          </div>
          <div>
            <span className="text-yellow-400">ERRORS:</span>{' '}
            <span
              className={`${stats.misreports >= 2 ? 'text-red-500' : 'text-white'}`}
            >
              {stats.misreports}/{DEFAULT_CONFIG.maxMisreports}
            </span>
          </div>
        </div>
      </div>

      {/* Anomaly counter */}
      <div className="mt-2 text-xs text-gray-500">
        Detected: {stats.detectedAnomalies} / {stats.totalAnomalies}
      </div>
    </div>
  )
}
