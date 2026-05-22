/**
 * ゲームロジックのユニットテスト。
 *
 * PixiJS 非依存なので jsdom なしで動く。
 */
import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  boardPassengers,
  playerPressFloor,
  finalizeInput,
  updateElevator,
  floorToY,
  timeOfDay,
  BOARDING_MS,
  DOOR_OPEN_MS,
  MINUTES_PER_TRIP,
} from './logic'
import { FLOOR_COUNT } from './types'

// ─── timeOfDay ───────────────────────────────────────────────

describe('timeOfDay', () => {
  it.each([
    [0, 'midnight'],
    [299, 'midnight'],
    [300, 'dawn'],
    [419, 'dawn'],
    [420, 'morning'],
    [659, 'morning'],
    [660, 'noon'],
    [899, 'noon'],
    [900, 'evening'],
    [1139, 'evening'],
    [1140, 'night'],
    [1439, 'night'],
  ])('timeOfDay(%i) === %s', (minutes, expected) => {
    expect(timeOfDay(minutes)).toBe(expected)
  })
})

// ─── boardPassengers 時刻進行 ─────────────────────────────────

describe('boardPassengers 時刻進行', () => {
  it('gameTimeMinutes が MINUTES_PER_TRIP 分進む', () => {
    const state = createInitialState() // gameTimeMinutes: 420
    const next = boardPassengers(state)
    expect(next.gameTimeMinutes).toBe(420 + MINUTES_PER_TRIP)
  })

  it('gameTimeMinutes が 1440 でラップアラウンドする', () => {
    const state = { ...createInitialState(), gameTimeMinutes: 1430 }
    const next = boardPassengers(state)
    expect(next.gameTimeMinutes).toBe((1430 + MINUTES_PER_TRIP) % 1440)
  })
})

// ─── floorToY ────────────────────────────────────────────────

describe('floorToY', () => {
  it('1階は建物下端になる', () => {
    const top = 48
    const fh = 10
    expect(floorToY(1, top, fh)).toBe(top + (FLOOR_COUNT - 1) * fh)
  })

  it('最上階は建物上端になる', () => {
    const top = 48
    const fh = 10
    expect(floorToY(FLOOR_COUNT, top, fh)).toBe(top)
  })
})

// ─── createInitialState ──────────────────────────────────────

describe('createInitialState', () => {
  it('初期フェーズは boarding', () => {
    const state = createInitialState()
    expect(state.elevator.phase).toBe('boarding')
  })

  it('初期エレベータは1階', () => {
    const state = createInitialState()
    expect(state.elevator.currentFloor).toBe(1)
  })

  it('初期乗客は0人', () => {
    const state = createInitialState()
    expect(state.passengers).toHaveLength(0)
  })

  it('スコア・ミスは0', () => {
    const state = createInitialState()
    expect(state.score).toBe(0)
    expect(state.mistakes).toBe(0)
  })
})

// ─── boardPassengers ────────────────────────────────────────

describe('boardPassengers', () => {
  it('フェーズが input に遷移する', () => {
    const state = createInitialState()
    const next = boardPassengers(state)
    expect(next.elevator.phase).toBe('input')
  })

  it('乗客が乗り込む', () => {
    const state = createInitialState()
    const next = boardPassengers(state)
    expect(next.passengers.length).toBeGreaterThan(0)
  })

  it('乗客の pressedBy は全員 null（未入力）', () => {
    const state = createInitialState()
    const next = boardPassengers(state)
    expect(next.passengers.every(p => p.pressedBy === null)).toBe(true)
  })

  it('totalTrips が1増える', () => {
    const state = createInitialState()
    const next = boardPassengers(state)
    expect(next.totalTrips).toBe(1)
  })
})

// ─── playerPressFloor ────────────────────────────────────────

describe('playerPressFloor', () => {
  it('input フェーズ以外では何も変わらない', () => {
    const state = createInitialState() // boarding フェーズ
    const next = playerPressFloor(state, 3)
    expect(next).toBe(state)
  })

  it('正しい階を押すと pressedBy が player になる', () => {
    const state = boardPassengers(createInitialState())
    // 乗客が向かう階を取得
    const targetFloor = state.passengers[0]!.targetFloor
    const next = playerPressFloor(state, targetFloor)
    const pressed = next.passengers.find(
      p => p.targetFloor === targetFloor && p.pressedBy === 'player'
    )
    expect(pressed).toBeDefined()
  })

  it('乗客がいない階を押しても状態は変わらない', () => {
    const state = boardPassengers(createInitialState())
    // 乗客が向かわない階を探す
    const usedFloors = new Set(state.passengers.map(p => p.targetFloor))
    let emptyFloor = 2
    while (usedFloors.has(emptyFloor) && emptyFloor <= FLOOR_COUNT) emptyFloor++
    if (emptyFloor > FLOOR_COUNT) return // 全階埋まっている場合はスキップ
    const next = playerPressFloor(state, emptyFloor)
    expect(next.passengers).toEqual(state.passengers)
  })
})

// ─── finalizeInput ──────────────────────────────────────────

describe('finalizeInput', () => {
  it('未入力の客は pressedBy が self になる', () => {
    const state = boardPassengers(createInitialState())
    // 何も押さずに finalizeInput
    const next = finalizeInput(state)
    const selfPressed = next.passengers.filter(p => p.pressedBy === 'self')
    expect(selfPressed.length).toBeGreaterThan(0)
  })

  it('フェーズが moving_up に遷移する', () => {
    const state = boardPassengers(createInitialState())
    const next = finalizeInput(state)
    expect(next.elevator.phase).toBe('moving_up')
  })

  it('ミス数が増える', () => {
    const state = boardPassengers(createInitialState())
    const next = finalizeInput(state)
    expect(next.mistakes).toBeGreaterThan(0)
  })
})

// ─── updateElevator ─────────────────────────────────────────

describe('updateElevator', () => {
  it('boarding タイマーが進む', () => {
    const state = createInitialState()
    const next = updateElevator(state, 100)
    expect(next.elevator.doorTimerMs).toBeLessThan(state.elevator.doorTimerMs)
  })

  it('boarding タイマーが切れると input フェーズになる', () => {
    const state = createInitialState()
    const next = updateElevator(state, BOARDING_MS + 1)
    expect(next.elevator.phase).toBe('input')
  })

  it('moving_up 中はエレベータが上昇する', () => {
    let state = boardPassengers(createInitialState())
    state = finalizeInput(state)
    expect(state.elevator.phase).toBe('moving_up')
    const next = updateElevator(state, 200)
    expect(next.elevator.currentFloor).toBeGreaterThan(1)
  })

  it('door_open タイマーが切れると次のフェーズに遷移する', () => {
    let state = boardPassengers(createInitialState())
    state = finalizeInput(state)
    // 目的階まで一気に移動させる
    const target = state.elevator.nextStopFloor!
    state = {
      ...state,
      elevator: {
        ...state.elevator,
        phase: 'door_open',
        currentFloor: target,
        doorTimerMs: DOOR_OPEN_MS,
      },
    }
    const next = updateElevator(state, DOOR_OPEN_MS + 1)
    expect(['moving_up', 'moving_down']).toContain(next.elevator.phase)
  })
})
