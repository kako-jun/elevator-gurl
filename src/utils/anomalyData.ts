import { Anomaly, GamePhase, AnomalyCategory } from '../types/game'

// Anomaly templates for each phase and category
export const ANOMALY_TEMPLATES: Record<
  GamePhase,
  Record<AnomalyCategory, string[]>
> = {
  early: {
    Camera: [
      'Camera feed flickering',
      'Image quality degraded',
      'Timestamp frozen',
    ],
    Object: [
      'Shop sign disappeared',
      'Vending machine relocated',
      'Bench missing',
    ],
    Environment: [
      'Fluorescent light flickering',
      'Floor tiles pattern changed',
      'Wall poster removed',
    ],
    Person: ['Shadow in corridor', 'Figure standing still'],
    Surreal: ['Walls slightly tilted', 'Perspective distorted'],
  },
  mid: {
    Camera: [
      'Camera switched view angle',
      'Static noise increasing',
      'Recording loop detected',
    ],
    Object: [
      'All signs turned backwards',
      'Shop windows darkened',
      'Objects multiplied',
    ],
    Environment: [
      'Corridor extended longer',
      'Emergency lights activated',
      'Shutter halfway closed',
    ],
    Person: [
      'Person facing wrong direction',
      'Multiple identical figures',
      'Person moving backwards',
    ],
    Surreal: [
      'Ceiling merged with floor',
      'Reflections mismatched',
      'Gravity appears reversed',
    ],
  },
  late: {
    Camera: [
      'All cameras showing same view',
      'Camera feed from impossible angle',
      'Recording timestamp goes backwards',
    ],
    Object: [
      'All objects disappeared',
      'Everything turned upside down',
      'Objects merged together',
    ],
    Environment: [
      'Corridor became endless',
      'Walls breathing',
      'Space folding on itself',
    ],
    Person: [
      'Person without shadow',
      'Face distorted beyond recognition',
      'Multiple people merged',
    ],
    Surreal: [
      'Reality glitching visually',
      'Multiple corridors overlapping',
      'Time flowing backwards',
    ],
  },
}

// Meta anomalies that break the game rules themselves
export const META_ANOMALIES = [
  {
    description: 'Report button disappeared',
    category: 'Surreal' as AnomalyCategory,
    phase: 'late' as GamePhase,
    isMeta: true,
  },
  {
    description: 'Camera labels randomized',
    category: 'Camera' as AnomalyCategory,
    phase: 'late' as GamePhase,
    isMeta: true,
  },
  {
    description: 'Timer running backwards',
    category: 'Surreal' as AnomalyCategory,
    phase: 'late' as GamePhase,
    isMeta: true,
  },
  {
    description: 'UI text corrupted',
    category: 'Surreal' as AnomalyCategory,
    phase: 'late' as GamePhase,
    isMeta: true,
  },
]

export const generateAnomaly = (
  phase: GamePhase,
  cameraId: number,
  allowMeta: boolean = false
): Anomaly => {
  // 10% chance for meta anomaly in late phase
  if (allowMeta && phase === 'late' && Math.random() < 0.1) {
    const metaTemplate =
      META_ANOMALIES[Math.floor(Math.random() * META_ANOMALIES.length)]
    return {
      id: `anomaly-${Date.now()}-${Math.random()}`,
      category: metaTemplate.category,
      cameraId,
      description: metaTemplate.description,
      phase,
      isMeta: true,
    }
  }

  // Normal anomaly generation
  const categories: AnomalyCategory[] = [
    'Camera',
    'Object',
    'Environment',
    'Person',
    'Surreal',
  ]

  // Weight categories based on phase
  let categoryWeights: number[]
  if (phase === 'early') {
    categoryWeights = [0.3, 0.35, 0.3, 0.05, 0.0] // Camera, Object, Environment, Person, Surreal
  } else if (phase === 'mid') {
    categoryWeights = [0.2, 0.25, 0.25, 0.2, 0.1]
  } else {
    categoryWeights = [0.15, 0.15, 0.2, 0.25, 0.25]
  }

  const random = Math.random()
  let cumulative = 0
  let selectedCategory: AnomalyCategory = 'Object'

  for (let i = 0; i < categories.length; i++) {
    cumulative += categoryWeights[i]
    if (random < cumulative) {
      selectedCategory = categories[i]
      break
    }
  }

  const descriptions = ANOMALY_TEMPLATES[phase][selectedCategory]
  const description =
    descriptions[Math.floor(Math.random() * descriptions.length)]

  return {
    id: `anomaly-${Date.now()}-${Math.random()}`,
    category: selectedCategory,
    cameraId,
    description,
    phase,
    isMeta: false,
  }
}
