import { useState, useEffect, useCallback, useRef } from 'react'
import { GameState, GameStats, Anomaly, Camera } from '../types/game'
import {
  DEFAULT_CONFIG,
  CAMERAS,
  msToGameTime,
  getGamePhase,
} from '../utils/gameConfig'
import { generateAnomaly } from '../utils/anomalyData'

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [stats, setStats] = useState<GameStats>({
    currentTime: 0,
    correctReports: 0,
    misreports: 0,
    totalAnomalies: 0,
    detectedAnomalies: 0,
  })
  const [cameras, setCameras] = useState<Camera[]>(CAMERAS)
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [activeAnomalies, setActiveAnomalies] = useState<Anomaly[]>([])
  const [lastAnomalyTime, setLastAnomalyTime] = useState(0)

  const gameLoopRef = useRef<number>()
  const startTimeRef = useRef<number>(0)

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing')
    setStats({
      currentTime: 0,
      correctReports: 0,
      misreports: 0,
      totalAnomalies: 0,
      detectedAnomalies: 0,
    })
    setCameras(CAMERAS.map(cam => ({ ...cam, hasAnomaly: false })))
    setActiveAnomalies([])
    setLastAnomalyTime(0)
    setCurrentCameraIndex(0)
    startTimeRef.current = Date.now()
  }, [])

  // Switch camera
  const switchCamera = useCallback(
    (direction: 'next' | 'prev') => {
      setCurrentCameraIndex(prev => {
        if (direction === 'next') {
          return (prev + 1) % cameras.length
        } else {
          return prev === 0 ? cameras.length - 1 : prev - 1
        }
      })
    },
    [cameras.length]
  )

  // Report anomaly
  const reportAnomaly = useCallback(
    (category: string) => {
      const currentCamera = cameras[currentCameraIndex]
      const anomalyOnCamera = activeAnomalies.find(
        a => a.cameraId === currentCamera.id && !a.detectedAt
      )

      if (anomalyOnCamera && anomalyOnCamera.category === category) {
        // Correct report
        setStats(prev => ({
          ...prev,
          correctReports: prev.correctReports + 1,
          detectedAnomalies: prev.detectedAnomalies + 1,
        }))

        setActiveAnomalies(prev =>
          prev.map(a =>
            a.id === anomalyOnCamera.id
              ? { ...a, detectedAt: stats.currentTime }
              : a
          )
        )

        setCameras(prev =>
          prev.map(cam =>
            cam.id === currentCamera.id ? { ...cam, hasAnomaly: false } : cam
          )
        )
      } else {
        // Misreport
        setStats(prev => {
          const newMisreports = prev.misreports + 1
          if (newMisreports >= DEFAULT_CONFIG.maxMisreports) {
            setGameState('lose')
          }
          return {
            ...prev,
            misreports: newMisreports,
          }
        })
      }
    },
    [cameras, currentCameraIndex, activeAnomalies, stats.currentTime]
  )

  // Spawn anomaly
  const spawnAnomaly = useCallback((currentTime: number) => {
    const phase = getGamePhase(currentTime)
    const randomCameraId =
      CAMERAS[Math.floor(Math.random() * CAMERAS.length)].id
    const newAnomaly = generateAnomaly(phase, randomCameraId, true)

    setActiveAnomalies(prev => [...prev, newAnomaly])
    setStats(prev => ({ ...prev, totalAnomalies: prev.totalAnomalies + 1 }))
    setCameras(prev =>
      prev.map(cam =>
        cam.id === randomCameraId ? { ...cam, hasAnomaly: true } : cam
      )
    )
  }, [])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const loop = () => {
      const elapsed = Date.now() - startTimeRef.current
      setStats(prev => ({ ...prev, currentTime: elapsed }))

      // Check win condition
      if (elapsed >= DEFAULT_CONFIG.totalDurationMs) {
        if (stats.correctReports >= DEFAULT_CONFIG.minCorrectReports) {
          setGameState('win')
        } else {
          setGameState('lose')
        }
        return
      }

      // Spawn anomalies
      if (
        elapsed - lastAnomalyTime >= DEFAULT_CONFIG.anomalyIntervalMs &&
        activeAnomalies.filter(a => !a.detectedAt).length < 2
      ) {
        spawnAnomaly(elapsed)
        setLastAnomalyTime(elapsed)
      }

      gameLoopRef.current = requestAnimationFrame(loop)
    }

    gameLoopRef.current = requestAnimationFrame(loop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [
    gameState,
    lastAnomalyTime,
    activeAnomalies,
    spawnAnomaly,
    stats.correctReports,
  ])

  return {
    gameState,
    stats,
    cameras,
    currentCamera: cameras[currentCameraIndex],
    activeAnomalies,
    startGame,
    switchCamera,
    reportAnomaly,
    gameTime: msToGameTime(stats.currentTime),
  }
}
