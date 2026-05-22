/**
 * ゲームロジックのユニットテスト。
 *
 * PixiJS 非依存なので jsdom なしで動く。
 */
import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import {
  createInitialState,
  boardPassengers,
  playerPressFloor,
  finalizeInput,
  updateElevator,
  floorToY,
  timeOfDay,
  tryRandomEvent,
  BOARDING_MS,
  DOOR_OPEN_MS,
  MINUTES_PER_TRIP,
  WAGE_PER_TRIP,
  TUITION_GOAL,
  MAX_MISTAKES,
} from './logic'
import { FLOOR_COUNT, FLOOR_COUNT_MAX } from './types'
import type { GameState, Passenger, Resident } from './types'

// ─── テストヘルパー ───────────────────────────────────────────

/** input フェーズに遷移した最小ステートを作る */
function inputState(): GameState {
  return boardPassengers(createInitialState())
}

/** 指定 passengers を持つ input フェーズのステートを作る */
function stateWithPassengers(passengers: Passenger[]): GameState {
  return { ...inputState(), passengers }
}

const RESIDENT_NORMAL: Resident = {
  name: 'Test Normal',
  nameZh: '正常',
  floor: 3,
}
const RESIDENT_ELDER: Resident = {
  name: 'Test Elder',
  nameZh: '老人',
  floor: 3,
  type: 'elder',
}
const RESIDENT_CHILD: Resident = {
  name: 'Test Child',
  nameZh: '子供',
  floor: 3,
  type: 'child',
}

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
    [1440, 'midnight'], // 防御ガード（% 1440 で通常は到達しないが関数単独テスト）
  ])('timeOfDay(%i) === %s', (minutes, expected) => {
    expect(timeOfDay(minutes)).toBe(expected)
  })
})

// ─── boardPassengers 時刻進行 ─────────────────────────────────

describe('boardPassengers 時刻進行', () => {
  it('gameTimeMinutes が MINUTES_PER_TRIP 分進む', () => {
    const initial = createInitialState()
    const next = boardPassengers(initial)
    expect(next.gameTimeMinutes).toBe(
      (initial.gameTimeMinutes + MINUTES_PER_TRIP) % 1440
    )
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
    expect(floorToY(1, top, fh, FLOOR_COUNT)).toBe(top + (FLOOR_COUNT - 1) * fh)
  })

  it('最上階は建物上端になる', () => {
    const top = 48
    const fh = 10
    expect(floorToY(FLOOR_COUNT, top, fh, FLOOR_COUNT)).toBe(top)
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

  it('money の初期値は 0', () => {
    expect(createInitialState().money).toBe(0)
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
    // finalizeInput でゲームオーバーになっていると updateElevator が早期リターンするため
    // isGameOver=false を明示してエレベータの物理動作だけを検証する
    state = { ...state, isGameOver: false }
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
      isGameOver: false, // finalizeInput でゲームオーバーになっている場合に備えてリセット
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

  it('isGameOver=true の場合 updateElevator は状態を変えずに早期リターンする', () => {
    const state = { ...createInitialState(), isGameOver: true }
    const next = updateElevator(state, 10000)
    expect(next).toBe(state)
  })
})

// ─── boardPassengers / money（固定給） ────────────────────────

describe('boardPassengers / money', () => {
  it('boardPassengers で money が WAGE_PER_TRIP 増える', () => {
    const state = createInitialState()
    const next = boardPassengers(state)
    expect(next.money).toBe(state.money + WAGE_PER_TRIP)
  })
})

// ─── createInitialState / isClear ────────────────────────────

describe('createInitialState / isClear', () => {
  it('初期状態で isClear は false', () => {
    expect(createInitialState().isClear).toBe(false)
  })
})

// ─── boardPassengers / isClear 境界値 ───────────────────────

describe('boardPassengers / isClear 境界値', () => {
  /** money を指定値にセットした初期状態を作るヘルパー */
  function stateWithMoney(money: number) {
    return { ...createInitialState(), money }
  }

  it('money が TUITION_GOAL - WAGE_PER_TRIP - 1 のとき isClear は false（1手前より手前）', () => {
    const state = stateWithMoney(TUITION_GOAL - WAGE_PER_TRIP - 1)
    const next = boardPassengers(state)
    expect(next.money).toBe(TUITION_GOAL - 1)
    expect(next.isClear).toBe(false)
    expect(next.isGameOver).toBe(false)
  })

  it('money が TUITION_GOAL - WAGE_PER_TRIP のとき boardPassengers で TUITION_GOAL に到達して isClear になる（境界: ちょうど）', () => {
    const state = stateWithMoney(TUITION_GOAL - WAGE_PER_TRIP)
    const next = boardPassengers(state)
    expect(next.money).toBe(TUITION_GOAL)
    expect(next.isClear).toBe(true)
    expect(next.isGameOver).toBe(true)
  })

  it('money が TUITION_GOAL - WAGE_PER_TRIP + 1 のとき boardPassengers で TUITION_GOAL を超えて isClear になる（境界: 超過）', () => {
    const state = stateWithMoney(TUITION_GOAL - WAGE_PER_TRIP + 1)
    const next = boardPassengers(state)
    expect(next.money).toBe(TUITION_GOAL + 1)
    expect(next.isClear).toBe(true)
    expect(next.isGameOver).toBe(true)
  })
})

// ─── finalizeInput / elder ミスペナルティ ────────────────────

describe('finalizeInput / elder ミスペナルティ', () => {
  it('elder が pressedBy===null のとき mistakes += 2', () => {
    const passengers: Passenger[] = [
      { resident: RESIDENT_ELDER, targetFloor: 3, pressedBy: null },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    expect(next.mistakes).toBe(state.mistakes + 2)
  })

  it('normal が pressedBy===null のとき mistakes += 1', () => {
    const passengers: Passenger[] = [
      { resident: RESIDENT_NORMAL, targetFloor: 3, pressedBy: null },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    expect(next.mistakes).toBe(state.mistakes + 1)
  })

  it('elder + normal 混在: elder×1 + normal×1 で合計 3 増える', () => {
    const passengers: Passenger[] = [
      { resident: RESIDENT_ELDER, targetFloor: 3, pressedBy: null },
      { resident: RESIDENT_NORMAL, targetFloor: 4, pressedBy: null },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    expect(next.mistakes).toBe(state.mistakes + 3)
  })

  it('elder が pressedBy==="player" の場合はミスを加算しない', () => {
    const passengers: Passenger[] = [
      { resident: RESIDENT_ELDER, targetFloor: 3, pressedBy: 'player' },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    expect(next.mistakes).toBe(state.mistakes)
  })
})

// ─── finalizeInput / MAX_MISTAKES ゲームオーバー ─────────────

describe('finalizeInput / MAX_MISTAKES ゲームオーバー', () => {
  it('elder ミスで mistakes が MAX_MISTAKES に達すると isGameOver になる', () => {
    // elder 1人で +2。mistakes = MAX_MISTAKES - 2 からスタートで境界
    const passengers: Passenger[] = [
      { resident: RESIDENT_ELDER, targetFloor: 3, pressedBy: null },
    ]
    const state = {
      ...stateWithPassengers(passengers),
      mistakes: MAX_MISTAKES - 2,
    }
    const next = finalizeInput(state)
    expect(next.mistakes).toBe(MAX_MISTAKES)
    expect(next.isGameOver).toBe(true)
  })

  it('normal ミスで mistakes が MAX_MISTAKES に達すると isGameOver になる', () => {
    const passengers: Passenger[] = [
      { resident: RESIDENT_NORMAL, targetFloor: 3, pressedBy: null },
    ]
    const state = {
      ...stateWithPassengers(passengers),
      mistakes: MAX_MISTAKES - 1,
    }
    const next = finalizeInput(state)
    expect(next.mistakes).toBe(MAX_MISTAKES)
    expect(next.isGameOver).toBe(true)
  })

  it('elder は mistakes +2 なので normal より早くゲームオーバーになる', () => {
    // mistakes = MAX_MISTAKES - 2 の場合、
    // normal は 1 加算でまだゲームオーバーにならないが elder は 2 加算でなる
    const normalPassengers: Passenger[] = [
      { resident: RESIDENT_NORMAL, targetFloor: 3, pressedBy: null },
    ]
    const elderPassengers: Passenger[] = [
      { resident: RESIDENT_ELDER, targetFloor: 3, pressedBy: null },
    ]
    const base = MAX_MISTAKES - 2

    const normalNext = finalizeInput({
      ...stateWithPassengers(normalPassengers),
      mistakes: base,
    })
    const elderNext = finalizeInput({
      ...stateWithPassengers(elderPassengers),
      mistakes: base,
    })

    expect(normalNext.isGameOver).toBe(false) // +1 → MAX-1、まだ
    expect(elderNext.isGameOver).toBe(true) // +2 → MAX、ゲームオーバー
  })
})

// ─── finalizeInput / 子供の悪戯 Passenger ─────────────────────

describe('finalizeInput / 子供の悪戯 Passenger', () => {
  it('child がいて Math.random < 0.5 の場合、空き階に pressedBy===child の Passenger が追加される', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // 常に発動
    const passengers: Passenger[] = [
      { resident: RESIDENT_CHILD, targetFloor: 3, pressedBy: 'player' },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    const childP = next.passengers.filter(p => p.pressedBy === 'child')
    expect(childP.length).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('child がいても Math.random >= 0.5 の場合、悪戯 Passenger は追加されない', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 常に不発
    const passengers: Passenger[] = [
      { resident: RESIDENT_CHILD, targetFloor: 3, pressedBy: 'player' },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    const childP = next.passengers.filter(p => p.pressedBy === 'child')
    expect(childP.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('悪戯 Passenger の targetFloor は既存 passengers の targetFloor と重複しない', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    // 3階だけ使用中
    const passengers: Passenger[] = [
      { resident: RESIDENT_CHILD, targetFloor: 3, pressedBy: 'player' },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    const childP = next.passengers.find(p => p.pressedBy === 'child')
    expect(childP).toBeDefined()
    expect(childP!.targetFloor).not.toBe(3)
    vi.restoreAllMocks()
  })

  it('child がいない場合、悪戯 Passenger は追加されない', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const passengers: Passenger[] = [
      { resident: RESIDENT_NORMAL, targetFloor: 3, pressedBy: null },
    ]
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    const childP = next.passengers.filter(p => p.pressedBy === 'child')
    expect(childP.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('全階が埋まっている場合、悪戯 Passenger は追加されない', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    // 2〜FLOOR_COUNT をすべて埋める
    const passengers: Passenger[] = []
    passengers.push({
      resident: RESIDENT_CHILD,
      targetFloor: 2,
      pressedBy: 'player',
    })
    for (let f = 3; f <= FLOOR_COUNT; f++) {
      passengers.push({
        resident: RESIDENT_NORMAL,
        targetFloor: f,
        pressedBy: 'player',
      })
    }
    const state = stateWithPassengers(passengers)
    const next = finalizeInput(state)
    const childP = next.passengers.filter(p => p.pressedBy === 'child')
    expect(childP.length).toBe(0)
    vi.restoreAllMocks()
  })
})

// ─── playerPressFloor / child キャンセル ─────────────────────

describe('playerPressFloor / child キャンセル', () => {
  it('child ボタンの階を再タップすると悪戯 Passenger が除去される', () => {
    const childPassenger: Passenger = {
      resident: RESIDENT_CHILD,
      targetFloor: 5,
      pressedBy: 'child',
    }
    const state = stateWithPassengers([childPassenger])
    const next = playerPressFloor(state, 5)
    expect(next.passengers.find(p => p.pressedBy === 'child')).toBeUndefined()
    expect(next.passengers.length).toBe(state.passengers.length - 1)
  })

  it('child ボタンがない状態で playerPressFloor を呼ぶと通常動作（pressedBy === null を player に）', () => {
    const normalPassenger: Passenger = {
      resident: RESIDENT_NORMAL,
      targetFloor: 4,
      pressedBy: null,
    }
    const state = stateWithPassengers([normalPassenger])
    const next = playerPressFloor(state, 4)
    const pressed = next.passengers.find(p => p.targetFloor === 4)
    expect(pressed?.pressedBy).toBe('player')
  })

  it('child キャンセル後、同じ階に null の Passenger がいても除去のみで player 扱いにはならない', () => {
    // child ボタンが先にヒットして除去 → null の Passenger には触れない
    const childPassenger: Passenger = {
      resident: RESIDENT_CHILD,
      targetFloor: 5,
      pressedBy: 'child',
    }
    const normalPassenger: Passenger = {
      resident: RESIDENT_NORMAL,
      targetFloor: 5,
      pressedBy: null,
    }
    const state = stateWithPassengers([childPassenger, normalPassenger])
    const next = playerPressFloor(state, 5)
    // child は除去される
    expect(next.passengers.find(p => p.pressedBy === 'child')).toBeUndefined()
    // null の Passenger は player に変わらず null のまま残る
    const remaining = next.passengers.find(p => p.targetFloor === 5)
    expect(remaining?.pressedBy).toBe(null)
  })
})

// ─── boardPassengers / ゲームオーバーとクリアの排他性 ─────────

describe('boardPassengers / ゲームオーバーとクリアの排他性', () => {
  it('isGameOver=true の状態で TUITION_GOAL に到達しても isClear は false のまま', () => {
    const state = {
      ...createInitialState(),
      money: TUITION_GOAL - WAGE_PER_TRIP,
      isGameOver: true,
    }
    const next = boardPassengers(state)
    expect(next.money).toBe(TUITION_GOAL)
    expect(next.isClear).toBe(false)
    expect(next.isGameOver).toBe(true)
  })
})

// ─── floorCount 動的階数 ─────────────────────────────────────

describe('createInitialState / floorCount', () => {
  it('初期 floorCount は FLOOR_COUNT (=8) である', () => {
    const state = createInitialState()
    expect(state.floorCount).toBe(FLOOR_COUNT)
    expect(state.floorCount).toBe(8)
  })
})

describe('boardPassengers / floorCount 増加', () => {
  /** totalTrips を指定値にして boardPassengers を1回呼ぶヘルパー */
  function stateAtTrips(totalTrips: number, floorCount: number): GameState {
    return { ...createInitialState(), totalTrips, floorCount }
  }

  it('totalTrips 19→20 で floorCount が 1 増える', () => {
    const state = stateAtTrips(19, FLOOR_COUNT)
    const next = boardPassengers(state)
    expect(next.totalTrips).toBe(20)
    expect(next.floorCount).toBe(FLOOR_COUNT + 1)
  })

  it('totalTrips 39→40 で floorCount がさらに 1 増える', () => {
    const state = stateAtTrips(39, FLOOR_COUNT + 1)
    const next = boardPassengers(state)
    expect(next.totalTrips).toBe(40)
    expect(next.floorCount).toBe(FLOOR_COUNT + 2)
  })

  it('20の倍数でないトリップでは floorCount は変わらない', () => {
    const state = stateAtTrips(10, FLOOR_COUNT)
    const next = boardPassengers(state)
    expect(next.floorCount).toBe(FLOOR_COUNT)
  })

  it('floorCount が FLOOR_COUNT_MAX のとき、それ以上増えない', () => {
    const state = stateAtTrips(19, FLOOR_COUNT_MAX)
    const next = boardPassengers(state)
    expect(next.totalTrips).toBe(20)
    expect(next.floorCount).toBe(FLOOR_COUNT_MAX)
  })

  it('初回 trip 0→1 では floorCount は増えない（totalTrips % 20 !== 0）', () => {
    const state = createInitialState() // totalTrips=0, floorCount=FLOOR_COUNT
    const next = boardPassengers(state)
    expect(next.totalTrips).toBe(1)
    expect(next.floorCount).toBe(FLOOR_COUNT)
  })
})

describe('buildWaitingQueue / floorCount フィルタ（boardPassengers 経由）', () => {
  it('floorCount=8 のとき 9F 以上の住民は waitingQueue に入らない', () => {
    // updateElevator(moving_down 到着) → buildWaitingQueue 再呼び出し
    // ここでは waitingQueue を空にして moving_down 到着をシミュレート
    const base = createInitialState()
    const state: GameState = {
      ...base,
      floorCount: 8,
      waitingQueue: [],
      elevator: {
        ...base.elevator,
        phase: 'moving_down',
        currentFloor: 1.01, // step > diff で到着判定される値
        doorTimerMs: 0,
        nextStopFloor: null,
      },
    }
    // deltaMS を大きくして moving_down → boarding 遷移
    const next = updateElevator(state, 5000)
    expect(next.waitingQueue.every(r => r.floor <= 8)).toBe(true)
  })
})

describe('tryRandomEvent', () => {
  const residents = [
    { name: 'Chan Siu-Ming', nameZh: '陳小明', floor: 2 },
    { name: 'Wong Wai-Keung', nameZh: '黃偉強', floor: 5 },
  ]

  it('Math.random > 0.15 のとき null を返す', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(tryRandomEvent(residents)).toBeNull()
    vi.restoreAllMocks()
  })

  it('Math.random <= 0.15 のとき RandomEvent を返す', () => {
    // 最初の呼び出し（確率チェック）は 0.1、以降はイベント種別・住民・テキスト選択用
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const ev = tryRandomEvent(residents)
    expect(ev).not.toBeNull()
    expect(ev!.residentName).toBeDefined()
    expect(ev!.text).toBeDefined()
    vi.restoreAllMocks()
  })

  it('gift_food イベントの moneyBonus は 30', () => {
    // random=0 → 確率OK, kind=gift_food(index 0), resident[0], text[0]
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const ev = tryRandomEvent(residents)
    expect(ev!.kind).toBe('gift_food')
    expect(ev!.moneyBonus).toBe(30)
    vi.restoreAllMocks()
  })

  it('complaint イベントの moneyBonus は 0', () => {
    // random=0 で確率OK、次に kind=complaint になる値（index 3 / 4 = 0.75）
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // 確率チェック (<=0.15 → イベント発生)
      .mockReturnValueOnce(0.9) // kinds[floor(0.9*4)=3] = complaint
      .mockReturnValue(0)
    const ev = tryRandomEvent(residents)
    expect(ev!.kind).toBe('complaint')
    expect(ev!.moneyBonus).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('afterDoorClose / pendingEvent', () => {
  it('door_open 終了時に pendingEvent がセットされることがある', () => {
    // 確率15%なので、確実に発生するよう Math.random をモック
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const base = createInitialState()
    const state: GameState = {
      ...base,
      elevator: {
        ...base.elevator,
        phase: 'door_open',
        currentFloor: 3,
        doorTimerMs: 10,
      },
    }
    const next = updateElevator(state, 5000)
    expect(next.pendingEvent).not.toBeNull()
    vi.restoreAllMocks()
  })

  it('gift_food 発生時に money が +30 される', () => {
    // random=0 → gift_food
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const base = createInitialState()
    const state: GameState = {
      ...base,
      money: 100,
      elevator: {
        ...base.elevator,
        phase: 'door_open',
        currentFloor: 3,
        doorTimerMs: 10,
      },
    }
    const next = updateElevator(state, 5000)
    expect(next.pendingEvent!.kind).toBe('gift_food')
    expect(next.money).toBe(130)
    vi.restoreAllMocks()
  })
})
