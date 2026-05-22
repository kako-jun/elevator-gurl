/**
 * PlayScene のユニットテスト。
 *
 * jsdom 環境での Graphics 描画は動かないが、
 * attachInputs のコマンドハンドリングと reset() の動作を確認する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Container } from 'pixi.js'
import { PlayScene } from './PlayScene'
import { KeyboardManager } from '../input/KeyboardManager'
import { TouchManager } from '../input/TouchManager'
import type { GameState, Resident, Passenger } from '../game/types'
import { BOARDING_MS, INPUT_TIMEOUT_MS } from '../game/logic'

describe('PlayScene', () => {
  let keyboard: KeyboardManager
  let touch: TouchManager
  let scene: PlayScene
  let unsub: () => void
  let onExit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    keyboard = new KeyboardManager()
    keyboard.attach(window)
    touch = new TouchManager()
    scene = new PlayScene()
    onExit = vi.fn()
    unsub = scene.attachInputs(keyboard, touch, onExit)
  })

  afterEach(() => {
    unsub()
    keyboard.detach()
    if (!scene.destroyed) scene.destroy()
  })

  function fire(key: string): void {
    const ev = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(ev)
  }

  it('Container を継承している', () => {
    expect(scene).toBeInstanceOf(Container)
  })

  it('Escape (cancel) で onExit が発火する', () => {
    fire('Escape')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('cancel 以外のコマンドでは onExit は発火しない', () => {
    fire('Enter')
    fire(' ')
    fire('ArrowLeft')
    fire('ArrowRight')
    expect(onExit).not.toHaveBeenCalled()
  })

  it('attachInputs の戻り値で unsubscribe できる', () => {
    unsub()
    fire('Escape')
    expect(onExit).not.toHaveBeenCalled()
  })

  it('reset() を呼んでも Container は破棄されない', () => {
    scene.reset()
    expect(scene.destroyed).toBe(false)
  })
})

// ─── boardingOverlayLines のテスト ───────────────────────────────────────────

/** テスト用住民ファクトリ */
function makeResident(name: string, nameZh: string, floor: number): Resident {
  return { name, nameZh, floor }
}

/** テスト用 GameState を構築するヘルパー */
function makeState(overrides: Partial<GameState>): GameState {
  const base: GameState = {
    residents: [],
    waitingQueue: [],
    passengers: [],
    elevator: {
      phase: 'boarding',
      currentFloor: 1,
      nextStopFloor: null,
      doorTimerMs: BOARDING_MS,
    },
    score: 0,
    mistakes: 0,
    totalTrips: 0,
    isGameOver: false,
    isClear: false,
    money: 0,
    gameTimeMinutes: 420,
    weather: 'clear',
  }
  return { ...base, ...overrides }
}

/**
 * PlayScene の state と prevPhase を直接書き換えてから update(0) を呼ぶことで
 * detectPhaseChange → boardingOverlayLines の結果を検証する。
 */
function injectAndUpdate(
  scene: PlayScene,
  state: GameState,
  prevPhase: GameState['elevator']['phase'] | null
): void {
  const s = scene as unknown as {
    state: GameState
    prevPhase: typeof prevPhase
  }
  s.state = state
  s.prevPhase = prevPhase
  scene.update(0)
}

function getOverlayLines(scene: PlayScene): Array<{ text: string }> {
  return (scene as unknown as { boardingOverlayLines: Array<{ text: string }> })
    .boardingOverlayLines
}

describe('PlayScene – boardingOverlayLines (A/B/D/E 群)', () => {
  let scene: PlayScene

  beforeEach(() => {
    scene = new PlayScene()
  })

  afterEach(() => {
    if (!scene.destroyed) scene.destroy()
  })

  // ── A 群: オーバーレイ内容構築 ────────────────────────────────────────────

  it('A-1: 1F・waitingQueue あり → door_open 遷移で ↑nameZh 行が生成される', () => {
    const r1 = makeResident('A', '甲', 2)
    const r2 = makeResident('B', '乙', 3)
    const state = makeState({
      waitingQueue: [r1, r2],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    expect(lines.some(l => l.text === '↑ 甲')).toBe(true)
    expect(lines.some(l => l.text === '↑ 乙')).toBe(true)
  })

  it('A-2: 1F・waitingQueue=3人ちょうど → 「...他N人」行が生成されない', () => {
    const queue = [
      makeResident('A', '甲', 2),
      makeResident('B', '乙', 3),
      makeResident('C', '丙', 4),
    ]
    const state = makeState({
      waitingQueue: queue,
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    expect(lines.length).toBe(3)
    expect(lines.every(l => !l.text.startsWith('...'))).toBe(true)
  })

  it('A-3: 1F・waitingQueue=4人 → 「...他1人」行が末尾に追加される', () => {
    const queue = [
      makeResident('A', '甲', 2),
      makeResident('B', '乙', 3),
      makeResident('C', '丙', 4),
      makeResident('D', '丁', 5),
    ]
    const state = makeState({
      waitingQueue: queue,
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    expect(lines.length).toBe(4)
    expect(lines[3].text).toBe('...他1人')
  })

  it('A-4: 1F・waitingQueue=0人 → boardingOverlayLines が空配列になる', () => {
    const state = makeState({
      waitingQueue: [],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    expect(getOverlayLines(scene)).toEqual([])
  })

  it('A-5: 上階・降車のみ → ↓nameZh 行が生成される', () => {
    const r = makeResident('A', '甲', 3)
    const passenger: Passenger = {
      resident: r,
      targetFloor: 3,
      pressedBy: 'player',
    }
    const state = makeState({
      passengers: [passenger],
      elevator: {
        phase: 'door_open',
        currentFloor: 3,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    expect(lines.some(l => l.text === '↓ 甲')).toBe(true)
  })

  it('A-6: 上階・乗車のみ → ↑nameZh (NF) 行が生成される', () => {
    const r = makeResident('A', '甲', 3)
    const state = makeState({
      residents: [r],
      passengers: [], // 乗客なし
      elevator: {
        phase: 'door_open',
        currentFloor: 3,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    expect(lines.some(l => l.text === '↑ 甲 (3F)')).toBe(true)
  })

  it('A-7: 上階・降車+乗車同時 → 降車行が先、乗車行が後', () => {
    const rAlighting = makeResident('Alighting', '降甲', 3)
    const rBoarding = makeResident('Boarding', '乗乙', 3)
    const passenger: Passenger = {
      resident: rAlighting,
      targetFloor: 3,
      pressedBy: 'player',
    }
    const state = makeState({
      residents: [rAlighting, rBoarding],
      passengers: [passenger],
      elevator: {
        phase: 'door_open',
        currentFloor: 3,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    const downIdx = lines.findIndex(l => l.text.startsWith('↓'))
    const upIdx = lines.findIndex(l => l.text.startsWith('↑'))
    expect(downIdx).toBeGreaterThanOrEqual(0)
    expect(upIdx).toBeGreaterThanOrEqual(0)
    expect(downIdx).toBeLessThan(upIdx)
  })

  it('A-8: 上階・降車なし乗車なし → boardingOverlayLines が空になる', () => {
    const state = makeState({
      residents: [],
      passengers: [],
      elevator: {
        phase: 'door_open',
        currentFloor: 3,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    expect(getOverlayLines(scene)).toEqual([])
  })

  it('A-9: すでに passengers にいる住民は boarding 行に追加されない', () => {
    const r = makeResident('A', '甲', 3)
    // 同じ住民が passengers にいる
    const passenger: Passenger = {
      resident: r,
      targetFloor: 1,
      pressedBy: 'auto',
    }
    const state = makeState({
      residents: [r],
      passengers: [passenger],
      elevator: {
        phase: 'door_open',
        currentFloor: 3,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, state, 'moving_up')
    const lines = getOverlayLines(scene)
    // 乗車行（↑）は出ないはず（降車行は targetFloor=1 なので 3F では出ない）
    expect(lines.filter(l => l.text.startsWith('↑'))).toHaveLength(0)
  })

  // ── B 群: オーバーレイクリア ──────────────────────────────────────────────

  it('B-1: door_open → 次フェーズへ遷移すると boardingOverlayLines が空になる', () => {
    // まず door_open で lines を生成する
    const r = makeResident('A', '甲', 2)
    const stateOpen = makeState({
      waitingQueue: [r],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, stateOpen, 'moving_down')

    // lines が生成されたことを確認
    expect(getOverlayLines(scene).length).toBeGreaterThan(0)

    // 次フェーズに遷移（door_open → moving_up）
    const stateNext = makeState({
      waitingQueue: [r],
      elevator: {
        phase: 'moving_up',
        currentFloor: 1,
        nextStopFloor: 2,
        doorTimerMs: 0,
      },
    })
    injectAndUpdate(scene, stateNext, 'door_open')

    expect(getOverlayLines(scene)).toEqual([])
  })

  it('B-2: door_open を介さない遷移では boardingOverlayLines は変化しない', () => {
    // まず door_open で lines を生成する
    const r = makeResident('A', '甲', 2)
    const stateOpen = makeState({
      waitingQueue: [r],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, stateOpen, 'moving_down')
    const linesBefore = [...getOverlayLines(scene)]
    expect(linesBefore.length).toBeGreaterThan(0)

    // boarding → input 遷移（door_open を介さない）
    const stateInput = makeState({
      waitingQueue: [],
      elevator: {
        phase: 'input',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: INPUT_TIMEOUT_MS,
      },
    })
    // prevPhase を boarding にして boarding → input 遷移を再現
    const s = scene as unknown as {
      state: GameState
      prevPhase: string | null
      boardingOverlayLines: Array<{ text: string }>
    }
    s.state = stateInput
    s.prevPhase = 'boarding'
    scene.update(0)

    // lines は変化していないはず（クリアも書き換えもされない）
    expect(getOverlayLines(scene)).toEqual(linesBefore)
  })

  // ── D 群: リセット後の残留 ────────────────────────────────────────────────

  it('D-2: reset() 後に boardingOverlayLines が空配列になる', () => {
    // まず door_open で lines を生成する
    const r = makeResident('A', '甲', 2)
    const stateOpen = makeState({
      waitingQueue: [r],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, stateOpen, 'moving_down')
    expect(getOverlayLines(scene).length).toBeGreaterThan(0)

    scene.reset()
    expect(getOverlayLines(scene)).toEqual([])
  })

  it('D-1: reset() 後に update() しても boardingOverlayLines が残留しない', () => {
    // lines を生成
    const r = makeResident('A', '甲', 2)
    const stateOpen = makeState({
      waitingQueue: [r],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, stateOpen, 'moving_down')

    scene.reset()
    // reset 後の update（初期 boarding フェーズ）
    scene.update(0)
    expect(getOverlayLines(scene)).toEqual([])
  })

  // ── E 群: 同一フェーズ連続ガード ────────────────────────────────────────

  it('E-1: prevPhase === phase のとき boardingOverlayLines が書き換わらない', () => {
    // まず door_open で lines を生成する
    const r = makeResident('A', '甲', 2)
    const stateOpen = makeState({
      waitingQueue: [r],
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    injectAndUpdate(scene, stateOpen, 'moving_down')
    const linesBefore = [...getOverlayLines(scene)]
    expect(linesBefore.length).toBeGreaterThan(0)

    // 同じ door_open フェーズを再送（prevPhase も door_open）
    // waitingQueue を変えても lines は書き換わらないはず
    const r2 = makeResident('B', '乙', 3)
    const stateOpenAgain = makeState({
      waitingQueue: [r2, r2, r2, r2], // 変化させる
      elevator: {
        phase: 'door_open',
        currentFloor: 1,
        nextStopFloor: null,
        doorTimerMs: 1200,
      },
    })
    const s = scene as unknown as { state: GameState; prevPhase: string | null }
    s.state = stateOpenAgain
    s.prevPhase = 'door_open' // 同一フェーズ
    scene.update(0)

    expect(getOverlayLines(scene)).toEqual(linesBefore)
  })
})
