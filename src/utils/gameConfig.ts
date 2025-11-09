import { GameConfig, Camera } from '../types/game'

export const DEFAULT_CONFIG: GameConfig = {
  totalDurationMs: 360000, // 6 minutes
  anomalyIntervalMs: 45000, // 45 seconds
  maxMisreports: 3,
  minCorrectReports: 4, // Need to catch at least 4 out of 6-8 anomalies
}

export const CAMERAS: Camera[] = [
  {
    id: 1,
    name: 'Camera 01',
    location: 'Corona Road - North Entrance',
    hasAnomaly: false,
  },
  {
    id: 2,
    name: 'Camera 02',
    location: 'Corona Road - Main Corridor',
    hasAnomaly: false,
  },
  {
    id: 3,
    name: 'Camera 03',
    location: 'Corona Road - South Exit',
    hasAnomaly: false,
  },
  {
    id: 4,
    name: 'Camera 04',
    location: 'Underground Junction',
    hasAnomaly: false,
  },
]

// Convert milliseconds to game time (00:00 - 06:00)
export const msToGameTime = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// Determine game phase based on current time
export const getGamePhase = (ms: number): 'early' | 'mid' | 'late' => {
  if (ms < 120000) return 'early' // 0:00 - 2:00
  if (ms < 240000) return 'mid' // 2:00 - 4:00
  return 'late' // 4:00 - 6:00
}
