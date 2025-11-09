import './App.css'
import { useGameState } from './hooks/useGameState'
import { StartScreen } from './components/StartScreen'
import { GameHUD } from './components/GameHUD'
import { CameraView } from './components/CameraView'
import { ReportPanel } from './components/ReportPanel'
import { GameOverScreen } from './components/GameOverScreen'

function App() {
  const {
    gameState,
    stats,
    currentCamera,
    startGame,
    switchCamera,
    reportAnomaly,
    gameTime,
  } = useGameState()

  // Idle screen
  if (gameState === 'idle') {
    return <StartScreen onStart={startGame} />
  }

  // Game over screens
  if (gameState === 'win' || gameState === 'lose') {
    return (
      <GameOverScreen
        victory={gameState === 'win'}
        stats={stats}
        onRestart={() => window.location.reload()}
      />
    )
  }

  // Playing state
  return (
    <div className="App min-h-screen bg-black">
      <GameHUD gameTime={gameTime} stats={stats} />
      <CameraView camera={currentCamera} onSwipe={switchCamera} />
      <ReportPanel
        onReport={reportAnomaly}
        disabled={!currentCamera.hasAnomaly}
      />
    </div>
  )
}

export default App
