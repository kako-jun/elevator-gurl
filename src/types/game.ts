export type AnomalyCategory =
  | 'Camera'
  | 'Object'
  | 'Environment'
  | 'Person'
  | 'Surreal'

export type GamePhase = 'early' | 'mid' | 'late'

export type GameState = 'idle' | 'playing' | 'win' | 'lose'

export interface Anomaly {
  id: string
  category: AnomalyCategory
  cameraId: number
  description: string
  detectedAt?: number
  phase: GamePhase
  // Meta property: some anomalies will break expected rules
  isMeta?: boolean
}

export interface Camera {
  id: number
  name: string
  location: string
  hasAnomaly: boolean
  currentAnomalyId?: string
}

export interface GameConfig {
  totalDurationMs: number // 6 minutes = 360000ms
  anomalyIntervalMs: number // 45 seconds average
  maxMisreports: number // 3 strikes
  minCorrectReports: number // Minimum to win
}

export interface GameStats {
  currentTime: number // 0-360000ms
  correctReports: number
  misreports: number
  totalAnomalies: number
  detectedAnomalies: number
}
