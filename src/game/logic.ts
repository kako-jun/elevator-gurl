/**
 * elevator-gurl ゲームロジック: 状態更新
 *
 * PixiJS に依存せず、純粋な状態変換関数のみ。
 */

import {
  FLOOR_COUNT,
  FLOOR_COUNT_MAX,
  MAX_WAITING,
  RESIDENTS_DB,
  type GameState,
  type ElevatorState,
  type EventKind,
  type Passenger,
  type RandomEvent,
  type Resident,
  type TimeOfDay,
} from './types'

// ─── 定数 ────────────────────────────────────────────────────
/** エレベータの移動速度（階/秒） */
export const FLOOR_MOVE_SPEED = 2.0
/** 扉が開いている時間（ms） */
export const DOOR_OPEN_MS = 1200
/** 1階で乗客が乗り込む演出時間（ms） */
export const BOARDING_MS = 800
/** inputフェーズのタイムリミット（ms）。過ぎると未入力客が自押し */
export const INPUT_TIMEOUT_MS = 8000
/** ゲームオーバーのミス上限 */
export const MAX_MISTAKES = 5
/** 1トリップ完了ごとの固定給（円）*/
export const WAGE_PER_TRIP = 50
/** クリア目標金額（学費）*/
export const TUITION_GOAL = 10000

/** 1トリップで進むゲーム内時間（分） */
export const MINUTES_PER_TRIP = 30

// ─── ランダムイベント ────────────────────────────────────────────

const EVENT_TEMPLATES: Record<
  EventKind,
  { texts: string[]; moneyBonus: number }
> = {
  gift_food: {
    texts: ['これ、食べな', 'お腹すいてるやろ？', '作りすぎたから'],
    moneyBonus: 30,
  },
  gift_book: {
    texts: ['この本、あげるよ', '読み終わったから', '勉強頑張りや'],
    moneyBonus: 0,
  },
  cheer: {
    texts: ['いつもありがとう', '助かってるよ', 'あんたは偉い'],
    moneyBonus: 0,
  },
  complaint: {
    texts: ['また遅い！', 'もっと早くしてよ', 'やる気あるの？'],
    moneyBonus: 0,
  },
}

/**
 * door_open フェーズ終了時に低確率でランダムイベントを発生させる。
 * 確率: 15%
 */
export function tryRandomEvent(residents: Resident[]): RandomEvent | null {
  if (Math.random() > 0.15) return null
  const kinds: EventKind[] = ['gift_food', 'gift_book', 'cheer', 'complaint']
  const kind = kinds[Math.floor(Math.random() * kinds.length)]
  const resident = residents[Math.floor(Math.random() * residents.length)]
  const templates = EVENT_TEMPLATES[kind]
  const text =
    templates.texts[Math.floor(Math.random() * templates.texts.length)]
  return {
    kind,
    residentName: resident.nameZh,
    text,
    moneyBonus: templates.moneyBonus,
  }
}

// ─── 時刻ヘルパ ──────────────────────────────────────────────

/**
 * ゲーム内時刻（分）から時刻帯を返す
 * @param minutes 0〜1439
 */
export function timeOfDay(minutes: number): TimeOfDay {
  if (minutes < 300) return 'midnight' // 00:00〜05:00
  if (minutes < 420) return 'dawn' // 05:00〜07:00
  if (minutes < 660) return 'morning' // 07:00〜11:00
  if (minutes < 900) return 'noon' // 11:00〜15:00
  if (minutes < 1140) return 'evening' // 15:00〜19:00
  if (minutes < 1440) return 'night' // 19:00〜24:00
  return 'midnight'
}

// ─── 座標変換 ────────────────────────────────────────────────

/** 階をY座標に変換（1階が下、floorCount階が上） */
export function floorToY(
  floor: number,
  buildingTop: number,
  floorHeight: number,
  floorCount: number
): number {
  return buildingTop + (floorCount - floor) * floorHeight
}

// ─── 初期化 ──────────────────────────────────────────────────

function createIdleElevator(): ElevatorState {
  return {
    phase: 'boarding',
    currentFloor: 1,
    nextStopFloor: null,
    doorTimerMs: BOARDING_MS,
  }
}

/** 住民リストをシャッフルして待機キューを作る（現在の floorCount 以下の階の住民のみ） */
function buildWaitingQueue(
  residents: Resident[],
  floorCount: number
): Resident[] {
  return [...residents]
    .filter(r => r.floor <= floorCount)
    .sort(() => Math.random() - 0.5)
}

/** 初期ゲーム状態を生成 */
export function createInitialState(): GameState {
  const residents = [...RESIDENTS_DB].sort(() => Math.random() - 0.5)
  const waitingQueue = buildWaitingQueue(residents, FLOOR_COUNT)

  return {
    residents,
    waitingQueue,
    passengers: [],
    elevator: createIdleElevator(),
    score: 0,
    mistakes: 0,
    totalTrips: 0,
    isGameOver: false,
    isClear: false,
    money: 0,
    gameTimeMinutes: 420, // 朝7時スタート
    weather: 'clear',
    floorCount: FLOOR_COUNT,
    pendingEvent: null,
  }
}

// ─── 乗客ロジック ────────────────────────────────────────────

/**
 * 1階の待機客を乗り込ませる（boarding 完了時に呼ぶ）
 * 待機キューから最大 MAX_WAITING 人を passengers に移す
 */
export function boardPassengers(state: GameState): GameState {
  const count = Math.min(state.waitingQueue.length, MAX_WAITING)
  const boarding = state.waitingQueue.slice(0, count)
  const remaining = state.waitingQueue.slice(count)

  const passengers: Passenger[] = boarding.map(resident => ({
    resident,
    targetFloor: resident.floor,
    pressedBy: null, // まだ誰も押していない
  }))

  const newMoney = state.money + WAGE_PER_TRIP
  // !state.isGameOver: 既にゲームオーバー（ミス超過）の状態でクリア扱いにしない
  const isClear = newMoney >= TUITION_GOAL && !state.isGameOver

  const newTotalTrips = state.totalTrips + 1
  // 20トリップごとに1階増加（上限 FLOOR_COUNT_MAX）
  const newFloorCount = Math.min(
    state.floorCount + (newTotalTrips % 20 === 0 && newTotalTrips > 0 ? 1 : 0),
    FLOOR_COUNT_MAX
  )

  return {
    ...state,
    waitingQueue: remaining,
    passengers,
    elevator: {
      ...state.elevator,
      phase: 'input',
      doorTimerMs: INPUT_TIMEOUT_MS,
    },
    totalTrips: newTotalTrips,
    gameTimeMinutes: (state.gameTimeMinutes + MINUTES_PER_TRIP) % 1440,
    money: newMoney,
    isGameOver: isClear ? true : state.isGameOver,
    isClear,
    floorCount: newFloorCount,
  }
}

/**
 * プレイヤーが行き先ボタンを押す
 * @param targetFloor プレイヤーが押した階
 */
export function playerPressFloor(
  state: GameState,
  targetFloor: number
): GameState {
  if (state.elevator.phase !== 'input') return state

  // 悪戯ボタン（pressedBy === 'child'）がある場合はキャンセル（除去）して return。
  // 同じ階に本物の client（pressedBy === null）がいても、このタップではまだ割り当てない。
  // 「子供の悪戯を解除する」という1アクションを意図的に要求するゲームデザイン。
  const childIdx = state.passengers.findIndex(
    p => p.targetFloor === targetFloor && p.pressedBy === 'child'
  )
  if (childIdx !== -1) {
    const passengers = state.passengers.filter((_, i) => i !== childIdx)
    return { ...state, passengers }
  }

  // その階の客でまだ誰も押していない最初の1人に割り当てる
  const idx = state.passengers.findIndex(
    p => p.targetFloor === targetFloor && p.pressedBy === null
  )
  if (idx === -1) return state

  const passengers = state.passengers.map((p, i) =>
    i === idx ? { ...p, pressedBy: 'player' as const } : p
  )

  return { ...state, passengers }
}

/**
 * inputフェーズ終了: 未入力の客が自分でボタンを押す
 * mistakes を加算し、出発する
 */
export function finalizeInput(state: GameState): GameState {
  if (state.elevator.phase !== 'input') return state

  let mistakes = state.mistakes
  const passengers = state.passengers.map(p => {
    if (p.pressedBy === null) {
      const missCount = p.resident.type === 'elder' ? 2 : 1
      mistakes += missCount
      return { ...p, pressedBy: 'self' as const }
    }
    return p
  })

  // 子供の悪戯ボタン: 50% の確率でランダムな空き階に仮想 Passenger を追加
  const childPassenger = passengers.find(p => p.resident.type === 'child')
  let finalPassengers = passengers
  if (childPassenger && Math.random() < 0.5) {
    const occupiedFloors = new Set(passengers.map(p => p.targetFloor))
    const freeFloors: number[] = []
    for (let f = 2; f <= state.floorCount; f++) {
      if (!occupiedFloors.has(f)) freeFloors.push(f)
    }
    if (freeFloors.length > 0) {
      const randFloor =
        freeFloors[Math.floor(Math.random() * freeFloors.length)]
      const trickPassenger: Passenger = {
        resident: childPassenger.resident,
        targetFloor: randFloor,
        pressedBy: 'child',
      }
      finalPassengers = [...passengers, trickPassenger]
    }
  }

  // 止まる必要がある階を昇順に並べる
  const nextStop = calcNextStop(1, finalPassengers)

  return {
    ...state,
    passengers: finalPassengers,
    mistakes,
    isGameOver: mistakes >= MAX_MISTAKES,
    elevator: {
      ...state.elevator,
      phase: 'moving_up',
      nextStopFloor: nextStop,
    },
  }
}

/** 現在階より上で最初に止まる階を求める */
function calcNextStop(
  fromFloor: number,
  passengers: Passenger[]
): number | null {
  const stops = passengers
    .map(p => p.targetFloor)
    .filter(f => f > fromFloor)
    .sort((a, b) => a - b)
  return stops[0] ?? null
}

// ─── エレベータ更新 ──────────────────────────────────────────

/** エレベータの状態を deltaMS 分進める */
export function updateElevator(state: GameState, deltaMS: number): GameState {
  const elev = state.elevator

  // ── boarding フェーズ（乗り込み演出） ──
  if (elev.phase === 'boarding') {
    const remaining = elev.doorTimerMs - deltaMS
    if (remaining <= 0) {
      return boardPassengers({
        ...state,
        elevator: { ...elev, doorTimerMs: 0 },
      })
    }
    return { ...state, elevator: { ...elev, doorTimerMs: remaining } }
  }

  // ── input フェーズ（タイムアウト管理） ──
  if (elev.phase === 'input') {
    const remaining = elev.doorTimerMs - deltaMS
    if (remaining <= 0) {
      return finalizeInput({ ...state, elevator: { ...elev, doorTimerMs: 0 } })
    }
    return { ...state, elevator: { ...elev, doorTimerMs: remaining } }
  }

  // ── moving_up フェーズ ──
  if (elev.phase === 'moving_up') {
    const target = elev.nextStopFloor
    if (target === null) {
      // 止まる階がない → 1階に戻る
      return { ...state, elevator: { ...elev, phase: 'moving_down' } }
    }

    const floorsPerMs = FLOOR_MOVE_SPEED / 1000
    const step = floorsPerMs * deltaMS
    const diff = target - elev.currentFloor

    if (diff <= step) {
      // 目標階に到着 → 扉を開ける
      return {
        ...state,
        elevator: {
          ...elev,
          currentFloor: target,
          phase: 'door_open',
          doorTimerMs: DOOR_OPEN_MS,
        },
      }
    }

    return {
      ...state,
      score: state.score + deltaMS,
      elevator: { ...elev, currentFloor: elev.currentFloor + step },
    }
  }

  // ── door_open フェーズ（乗降演出） ──
  if (elev.phase === 'door_open') {
    const remaining = elev.doorTimerMs - deltaMS
    if (remaining <= 0) {
      return afterDoorClose(state)
    }
    return { ...state, elevator: { ...elev, doorTimerMs: remaining } }
  }

  // ── moving_down フェーズ ──
  if (elev.phase === 'moving_down') {
    const floorsPerMs = FLOOR_MOVE_SPEED / 1000
    const step = floorsPerMs * deltaMS
    const diff = elev.currentFloor - 1

    if (diff <= step) {
      // 1階に到着 → boarding へ
      // 待機キューが空なら補充
      const nextQueue =
        state.waitingQueue.length === 0
          ? buildWaitingQueue(state.residents, state.floorCount)
          : state.waitingQueue

      return {
        ...state,
        waitingQueue: nextQueue,
        elevator: {
          ...elev,
          currentFloor: 1,
          phase: 'boarding',
          doorTimerMs: BOARDING_MS,
          nextStopFloor: null,
        },
      }
    }

    return {
      ...state,
      score: state.score + deltaMS,
      elevator: { ...elev, currentFloor: elev.currentFloor - step },
    }
  }

  return state
}

/**
 * 扉が閉まった後の処理
 * - 現在階の客を降ろす（上の階から乗ってきた客も含む）
 * - 上の階から乗ってくる客を追加（居住階 = 現在階の住民が乗ってくる）
 * - 次の停止階を計算して上昇再開、または下降へ
 */
function afterDoorClose(state: GameState): GameState {
  const currentFloor = state.elevator.currentFloor

  // 現在階で降りる客を除く
  const remaining = state.passengers.filter(p => p.targetFloor !== currentFloor)

  // 現在階の住民が乗ってくる（1階行き）
  // waitingQueue にいない住民（= すでに乗っているか降りた人）は乗ってこない
  // ここでは単純に residents から居住階=currentFloor の人を探して乗せる
  // （既に passengers にいる人は乗らない）
  const alreadyInElevator = new Set(remaining.map(p => p.resident.name))
  const boardingFromFloor: Passenger[] = state.residents
    .filter(r => r.floor === currentFloor && !alreadyInElevator.has(r.name))
    .slice(0, 1) // 1人ずつ乗ってくる
    .map(r => ({
      resident: r,
      targetFloor: 1,
      pressedBy: 'auto' as const,
    }))

  const newPassengers = [...remaining, ...boardingFromFloor]

  // 次の停止階
  const nextStop = calcNextStop(currentFloor, newPassengers)

  const nextPhase =
    nextStop !== null ? ('moving_up' as const) : ('moving_down' as const)

  const event = tryRandomEvent(RESIDENTS_DB)
  const moneyBonus = event ? event.moneyBonus : 0

  return {
    ...state,
    passengers: newPassengers,
    money: state.money + moneyBonus,
    pendingEvent: event,
    elevator: {
      ...state.elevator,
      phase: nextPhase,
      nextStopFloor: nextStop,
    },
  }
}
