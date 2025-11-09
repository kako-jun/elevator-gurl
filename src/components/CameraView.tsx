import { Camera } from '../types/game'

interface CameraViewProps {
  camera: Camera
  onSwipe: (direction: 'next' | 'prev') => void
}

export const CameraView = ({ camera, onSwipe }: CameraViewProps) => {
  let touchStartX = 0

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX

    if (Math.abs(diff) > 50) {
      // Minimum swipe distance
      if (diff > 0) {
        onSwipe('next')
      } else {
        onSwipe('prev')
      }
    }
  }

  return (
    <div
      className="camera-view relative h-[60vh] w-full overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Camera feed placeholder - will be replaced with actual images */}
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <div className="mb-4 font-mono text-lg text-green-500">
            [{camera.name}]
          </div>
          <div className="font-mono text-sm text-green-400">
            {camera.location}
          </div>
          <div className="mt-8 text-xs text-gray-600">
            [CAMERA FEED - SWIPE TO SWITCH]
          </div>
          {camera.hasAnomaly && (
            <div className="mt-4 text-xs text-red-500">
              [ANOMALY DETECTED - REPORT REQUIRED]
            </div>
          )}
        </div>
      </div>

      {/* Scanlines effect for retro feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.3) 2px, rgba(0,255,0,0.3) 4px)',
        }}
      />

      {/* Vignette */}
      <div className="bg-gradient-radial pointer-events-none absolute inset-0 from-transparent via-transparent to-black opacity-40" />

      {/* Camera info overlay */}
      <div className="absolute top-4 left-4 font-mono text-xs text-green-500 opacity-80">
        <div>REC ●</div>
      </div>
    </div>
  )
}
