/**
 * elevator-gurl ゲームロジック: 型定義
 *
 * ゲームフロー:
 * 1. エレベータが1階に戻ると待機客（最大MAX_WAITING）が乗り込む
 * 2. 出発前フェーズ: プレイヤーが各客の行き先ボタンを押す
 *    - 押せなかった客は客自身が違う色でボタンを押す
 *    - 各ボタンに「誰が押したか」を表示
 * 3. 上昇しながら順番に各階に止まり客を降ろす
 * 4. 上の階で乗ってくる客は全員1階行き（行き先固定）
 *    - 乗降時に名前・階数を表示（「この人は○階の人」と覚えるため）
 * 5. 1階に戻ったら繰り返す
 */

/** 時刻帯 */
export type TimeOfDay =
  | 'midnight'
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'evening'
  | 'night'

/** 天気 */
export type Weather = 'clear' | 'rain'

/** ビルの総階数 */
export const FLOOR_COUNT = 8

/** 1階の待機客の上限 */
export const MAX_WAITING = 10

/** 住民データ */
export interface Resident {
  /** 広東語ローマ字読み (例: "Chan Tai-Man") */
  name: string
  /** 漢字表記 (例: "陳大文") */
  nameZh: string
  /** 居住階 (2〜FLOOR_COUNT。1階は出発点なので居住階にしない) */
  floor: number
}

/**
 * エレベータ内の乗客1人分
 * - 1階から乗った客: floor = 居住階、pressedBy = 'player' | 'self' | null
 * - 上の階から乗った客: floor = 1（1階行き固定）、pressedBy = 'auto'
 */
export interface Passenger {
  resident: Resident
  /** 降りる目標階 */
  targetFloor: number
  /**
   * ボタンを誰が押したか
   * - null: まだ押されていない（出発前フェーズ中）
   * - 'player': プレイヤーが押した（正解）
   * - 'self': 客自身が押した（プレイヤーが押せなかった → 不正解）
   * - 'auto': 上の階から乗った客（1階行き自動）
   */
  pressedBy: 'player' | 'self' | 'auto' | null
}

/** エレベータのフェーズ */
export type ElevatorPhase =
  | 'boarding' // 1階: 乗客が乗り込む演出中
  | 'input' // 1階: プレイヤーがボタンを入力するフェーズ
  | 'moving_up' // 上昇中
  | 'door_open' // 扉が開いている（乗降演出中）
  | 'moving_down' // 下降して1階へ戻る中

/** エレベータの状態 */
export interface ElevatorState {
  phase: ElevatorPhase
  /** 現在の階 (1〜FLOOR_COUNT、小数あり = 移動中) */
  currentFloor: number
  /** 次に止まる目標階（上昇中に使う） */
  nextStopFloor: number | null
  /** 扉開閉の残り時間 (ms) */
  doorTimerMs: number
}

/** ゲーム全体の状態 */
export interface GameState {
  /** 住民リスト（シャッフル済み、以後不変） */
  residents: Resident[]
  /** 1階の待機客リスト（エレベータが1階に戻るたびに補充される） */
  waitingQueue: Resident[]
  /** エレベータ内の乗客リスト */
  passengers: Passenger[]
  /** エレベータ状態 */
  elevator: ElevatorState
  /** スコア（正解数） */
  score: number
  /** ミス数（客自身がボタンを押した回数） */
  mistakes: number
  /** 総ターン数（1階出発の回数） */
  totalTrips: number
  /** ゲームオーバーかどうか */
  isGameOver: boolean
  /** クリアかどうか（学費達成） */
  isClear: boolean
  /** 現在の所持金（円） */
  money: number
  /** ゲーム内時刻（分）。0=00:00、420=07:00、720=12:00、1439=23:59 */
  gameTimeMinutes: number
  /** 天気 */
  weather: Weather
}

/** 住民データベース（固定）— 九龍城ウォールド風の広東人住民 */
export const RESIDENTS_DB: Resident[] = [
  { name: 'Chan Siu-Ming', nameZh: '陳小明', floor: 2 },
  { name: 'Wong Wai-Keung', nameZh: '黃偉強', floor: 5 },
  { name: 'Lee Fong', nameZh: '李芳', floor: 7 },
  { name: 'Lam Kwok-Wah', nameZh: '林國華', floor: 3 },
  { name: 'Ng Yuk-Ling', nameZh: '吳玉玲', floor: 8 },
  { name: 'Cheung Ho', nameZh: '張浩', floor: 4 },
  { name: 'Chow Mei-Yee', nameZh: '周美儀', floor: 6 },
  { name: 'Ho Kam-Fai', nameZh: '何錦輝', floor: 3 },
  { name: 'Yip Siu-Wan', nameZh: '葉少雲', floor: 7 },
  { name: 'Tsang Chi-Wai', nameZh: '曾志偉', floor: 2 },
  { name: 'Kwok Lai-Ha', nameZh: '郭麗霞', floor: 5 },
  { name: 'Mak Tin-Yau', nameZh: '麥天佑', floor: 8 },
  { name: 'Tang Po-Shan', nameZh: '鄧寶珊', floor: 4 },
  { name: 'Pang Wai-Man', nameZh: '彭偉民', floor: 6 },
  { name: 'Hui Chun-Keung', nameZh: '許振強', floor: 3 },
  { name: 'Yuen Siu-Fong', nameZh: '袁小鳳', floor: 7 },
  { name: 'Tse Kwok-Hung', nameZh: '謝國雄', floor: 2 },
  { name: 'Ma Wai-Ying', nameZh: '馬惠英', floor: 5 },
  { name: 'Fung Kin-Man', nameZh: '馮建民', floor: 4 },
  { name: 'Sin Mei-Kwan', nameZh: '冼美君', floor: 6 },
]
