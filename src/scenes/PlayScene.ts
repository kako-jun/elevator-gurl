/**
 * PlayScene — elevator-gurl 新仕様実装
 *
 * レイアウト (360×640):
 *
 *   [ エレベータシャフト | ビル断面（各階に行き先ボタン縦並び） ]
 *   ─────────────────────────────────────────────────────────
 *   |      | 8F [  8F  ]                                    |
 *   |      | 7F [  7F  ]                                    |
 *   | ELV  | 6F [  6F  ] 陳小明                             |
 *   |      | 5F [  5F  ]                                    |
 *   |      | 4F [  4F  ]                                    |
 *   |      | 3F [  3F  ] 李芳（赤）                          |
 *   |      | 2F [  2F  ]                                    |
 *   |      | 1F  待機列（乗り込み中 / input フェーズ）         |
 *   ────────────────────────────────────────────────────────
 *   [ HUD: ○N ×N / フェーズ表示 ]
 *
 * 階数が多い場合（FLOOR_COUNT > 8）は吹き出しオーバーレイに切り替える（将来対応）。
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import type { TouchManager } from '../input/TouchManager'
import { UI_PRIMARY, UI_SECONDARY, UI_TEXT_PRIMARY } from '../constants/colors'
import {
  FLOOR_COUNT,
  MAX_WAITING,
  type ElevatorPhase,
  type GameState,
  type Passenger,
} from '../game/types'
import {
  createInitialState,
  updateElevator,
  playerPressFloor,
  floorToY,
  INPUT_TIMEOUT_MS,
} from '../game/logic'

// ─── レイアウト定数 ────────────────────────────────────────────
const VIEW_W = 360
const VIEW_H = 640

/** エレベータシャフト幅 */
const SHAFT_W = 36
/** ビル右端X */
const BUILDING_RIGHT = VIEW_W - 8
/** ビル上端Y（HUDの下） */
const BUILDING_TOP = 48
/** ビル下端Y */
const BUILDING_BOTTOM = VIEW_H - 8
/** 1フロアの高さ */
const FLOOR_H = (BUILDING_BOTTOM - BUILDING_TOP) / FLOOR_COUNT

/** エレベータ箱のサイズ */
const ELEV_W = 28
const ELEV_H = FLOOR_H * 0.82

/** 行き先ボタンの領域 */
const BTN_X = SHAFT_W + 4 // ボタン左端X
const BTN_W = 72 // ボタン幅
const BTN_H = FLOOR_H * 0.62 // ボタン高さ
const BTN_RADIUS = 4
/** ボタン右端からビル右端までのスペース（乗客名表示エリア） */
const NAME_X = BTN_X + BTN_W + 6

// ─── カラー ────────────────────────────────────────────────────
const COLOR_BUILDING_BG = 0x1a1208
const COLOR_FLOOR_LINE = 0x4a3820
const COLOR_SHAFT_BG = 0x0d0d1a
const COLOR_ELEV_BODY = 0xc8a85a
const COLOR_ELEV_DOOR = 0x8b6914
const COLOR_HUD_BG = 0x111111
const COLOR_BTN_EMPTY = 0x2a1f0e // 未押し
const COLOR_BTN_PLAYER = UI_PRIMARY // プレイヤーが押した
const COLOR_BTN_SELF = 0xaa2222 // 客自身が押した（不正解）
const COLOR_BTN_AUTO = 0x1a4a2a // 上の階から乗ってくる客（1階行き自動）
const COLOR_DOOR_OPEN = 0x3a6a8a // 扉が開いているときの背景

/** inputフェーズのタイムバー色 */
const COLOR_TIMER_BAR = 0x44cc88
const COLOR_TIMER_LOW = 0xcc4444

export class PlayScene extends Container {
  private state: GameState

  // ─── フェーズ変化検知 ──────────────────────────────────────────
  private prevPhase: ElevatorPhase | null = null
  private prevPassengers: Passenger[] = []

  // ─── 乗降ログ ─────────────────────────────────────────────────
  private readonly logLines: string[] = []

  // ─── PixiJS オブジェクト ──────────────────────────────────────
  private readonly hudGfx = new Graphics()
  private readonly buildingGfx = new Graphics()
  private readonly elevGfx = new Graphics()
  private readonly btnLayerGfx = new Graphics() // ボタン背景
  private readonly timerGfx = new Graphics() // inputタイマーバー
  private readonly waitingLayerGfx = new Graphics()
  private readonly logGfx = new Graphics()

  private readonly hudText: Text
  private readonly phaseText: Text
  private readonly floorIndicatorText: Text
  private readonly passengerCountText: Text

  private waitingTextPool: Text[] = []
  private logTextPool: Text[] = []

  /**
   * 各階のボタン情報（2階〜FLOOR_COUNT階）
   * 1階は「待機列・乗降エリア」なのでボタンなし
   */
  private readonly floorBtns: Array<{
    floor: number
    gfx: Graphics
    labelText: Text // "NF"
    nameText: Text // 押した客の名前
  }> = []

  constructor() {
    super()
    this.state = createInitialState()

    const baseStyle = {
      fontFamily: 'monospace',
      fill: UI_TEXT_PRIMARY,
    }

    // HUD
    this.addChild(this.hudGfx)

    this.hudText = new Text({
      text: '○ 0  × 0',
      style: { ...baseStyle, fontSize: 13 },
    })
    this.hudText.anchor.set(0, 0.5)
    this.hudText.x = 8
    this.hudText.y = BUILDING_TOP / 2
    this.addChild(this.hudText)

    this.phaseText = new Text({
      text: '',
      style: { ...baseStyle, fontSize: 11, fill: 0xaaaaaa },
    })
    this.phaseText.anchor.set(1, 0.5)
    this.phaseText.x = VIEW_W - 8
    this.phaseText.y = BUILDING_TOP / 2
    this.addChild(this.phaseText)

    // ビル断面（静的）
    this.addChild(this.buildingGfx)
    this.drawBuilding()

    // ボタン層
    this.addChild(this.btnLayerGfx)

    // エレベータ（毎フレーム再描画）
    this.addChild(this.elevGfx)

    // タイマーバー
    this.addChild(this.timerGfx)

    // 待機列レイヤー
    this.addChild(this.waitingLayerGfx)

    // 乗降ログレイヤー
    this.addChild(this.logGfx)

    // 現在階インジケータ
    this.floorIndicatorText = new Text({
      text: '1F',
      style: { ...baseStyle, fontSize: 10 },
    })
    this.floorIndicatorText.anchor.set(0.5, 1)
    this.floorIndicatorText.x = SHAFT_W / 2
    this.addChild(this.floorIndicatorText)

    // 乗客数インジケータ（エレベータ箱内に重ねて表示）
    this.passengerCountText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 9, fill: 0x111111 },
    })
    this.passengerCountText.anchor.set(0.5, 0.5)
    this.addChild(this.passengerCountText)

    // 各階のボタンを生成（2階〜FLOOR_COUNT階）
    this.buildFloorButtons()
  }

  // ─── 静的描画 ──────────────────────────────────────────────────

  private drawBuilding(): void {
    const g = this.buildingGfx
    g.clear()

    // ビル本体背景
    g.rect(
      SHAFT_W,
      BUILDING_TOP,
      BUILDING_RIGHT - SHAFT_W,
      BUILDING_BOTTOM - BUILDING_TOP
    )
    g.fill(COLOR_BUILDING_BG)

    // シャフト
    g.rect(0, BUILDING_TOP, SHAFT_W, BUILDING_BOTTOM - BUILDING_TOP)
    g.fill(COLOR_SHAFT_BG)

    // 各階の床ライン
    for (let f = 1; f <= FLOOR_COUNT; f++) {
      const y = floorToY(f, BUILDING_TOP, FLOOR_H) + FLOOR_H
      g.rect(0, y - 1, BUILDING_RIGHT, 2)
      g.fill(COLOR_FLOOR_LINE)
    }

    // 建物外枠
    g.rect(0, BUILDING_TOP, BUILDING_RIGHT, BUILDING_BOTTOM - BUILDING_TOP)
    g.stroke({ color: COLOR_FLOOR_LINE, width: 2 })

    // 各階番号ラベルと窓
    for (let f = 1; f <= FLOOR_COUNT; f++) {
      const floorMidY = floorToY(f, BUILDING_TOP, FLOOR_H) + FLOOR_H / 2

      // 窓（1階は待機エリアなのでなし）
      if (f > 1) {
        for (let w = 0; w < 2; w++) {
          const wx = NAME_X + 10 + w * 50
          const wy = floorMidY - 7
          g.rect(wx, wy, 14, 14)
          g.fill(0x3a5a7a)
          g.rect(wx, wy, 14, 14)
          g.stroke({ color: 0x5a8aaa, width: 1 })
        }
      }
    }
  }

  private buildFloorButtons(): void {
    for (let floor = 2; floor <= FLOOR_COUNT; floor++) {
      const by = floorToY(floor, BUILDING_TOP, FLOOR_H) + (FLOOR_H - BTN_H) / 2

      const gfx = new Graphics()
      this.drawFloorBtn(gfx, by, 'empty', null)
      gfx.eventMode = 'static'
      gfx.cursor = 'pointer'
      gfx.on('pointerdown', () => {
        this.onPlayerPressFloor(floor)
      })
      this.addChild(gfx)

      const labelText = new Text({
        text: `${floor}F`,
        style: {
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 'bold',
          fill: UI_TEXT_PRIMARY,
        },
      })
      labelText.anchor.set(0.5, 0.5)
      labelText.x = BTN_X + BTN_W / 2
      labelText.y = by + BTN_H / 2
      this.addChild(labelText)

      const nameText = new Text({
        text: '',
        style: { fontFamily: 'monospace', fontSize: 10, fill: UI_TEXT_PRIMARY },
      })
      nameText.anchor.set(0, 0.5)
      nameText.x = NAME_X
      nameText.y = by + BTN_H / 2
      this.addChild(nameText)

      this.floorBtns.push({ floor, gfx, labelText, nameText })
    }
  }

  private drawFloorBtn(
    gfx: Graphics,
    by: number,
    state: 'empty' | 'player' | 'self' | 'auto',
    _passenger: Passenger | null
  ): void {
    gfx.clear()
    const color =
      state === 'player'
        ? COLOR_BTN_PLAYER
        : state === 'self'
          ? COLOR_BTN_SELF
          : state === 'auto'
            ? COLOR_BTN_AUTO
            : COLOR_BTN_EMPTY

    gfx.roundRect(BTN_X, by, BTN_W, BTN_H, BTN_RADIUS)
    gfx.fill(color)
    const borderColor = state !== 'empty' ? UI_SECONDARY : COLOR_FLOOR_LINE
    gfx.roundRect(BTN_X, by, BTN_W, BTN_H, BTN_RADIUS)
    gfx.stroke({ color: borderColor, width: 1 })
  }

  // ─── 入力処理 ──────────────────────────────────────────────────

  private onPlayerPressFloor(floor: number): void {
    if (this.state.elevator.phase !== 'input') return
    this.state = playerPressFloor(this.state, floor)
    this.refreshButtons()
  }

  // ─── ボタン更新 ────────────────────────────────────────────────

  private refreshButtons(): void {
    for (const btn of this.floorBtns) {
      const by =
        floorToY(btn.floor, BUILDING_TOP, FLOOR_H) + (FLOOR_H - BTN_H) / 2

      // この階に向かっている乗客を探す
      const passenger =
        this.state.passengers.find(p => p.targetFloor === btn.floor) ?? null

      const btnState =
        passenger?.pressedBy === 'player'
          ? 'player'
          : passenger?.pressedBy === 'self'
            ? 'self'
            : passenger?.pressedBy === 'auto'
              ? 'auto'
              : 'empty'

      this.drawFloorBtn(btn.gfx, by, btnState, passenger)

      // 名前表示
      if (passenger && passenger.pressedBy !== null) {
        btn.nameText.text = passenger.resident.nameZh
        btn.nameText.style.fill =
          passenger.pressedBy === 'self'
            ? COLOR_BTN_SELF
            : passenger.pressedBy === 'auto'
              ? 0x88cc88
              : UI_TEXT_PRIMARY
      } else {
        btn.nameText.text = ''
      }
    }
  }

  // ─── 毎フレーム更新 ────────────────────────────────────────────

  update(deltaMS: number): void {
    this.state = updateElevator(this.state, deltaMS)

    this.drawElevator()
    this.drawHUD()
    this.drawTimerBar()
    this.refreshButtons()
    this.detectPhaseChange()
    this.refreshWaitingList()
    this.refreshLogArea()

    this.prevPhase = this.state.elevator.phase
    this.prevPassengers = [...this.state.passengers]
  }

  private drawElevator(): void {
    const g = this.elevGfx
    g.clear()

    const elev = this.state.elevator
    const elevY = floorToY(elev.currentFloor, BUILDING_TOP, FLOOR_H)

    // 扉開放時の背景ハイライト
    if (elev.phase === 'door_open') {
      const floorY = floorToY(
        Math.round(elev.currentFloor),
        BUILDING_TOP,
        FLOOR_H
      )
      g.rect(0, floorY, BUILDING_RIGHT, FLOOR_H)
      g.fill({ color: COLOR_DOOR_OPEN, alpha: 0.18 })
    }

    // エレベータ箱
    const ex = (SHAFT_W - ELEV_W) / 2
    const ey = elevY + (FLOOR_H - ELEV_H) / 2
    g.roundRect(ex, ey, ELEV_W, ELEV_H, 3)
    g.fill(COLOR_ELEV_BODY)
    g.roundRect(ex, ey, ELEV_W, ELEV_H, 3)
    g.stroke({ color: COLOR_ELEV_DOOR, width: 1 })

    // ドアの縦線
    g.moveTo(ex + ELEV_W / 2, ey)
    g.lineTo(ex + ELEV_W / 2, ey + ELEV_H)
    g.stroke({ color: COLOR_ELEV_DOOR, width: 1 })

    // 現在階インジケータ
    const floor = Math.round(elev.currentFloor)
    this.floorIndicatorText.text = `${floor}F`
    this.floorIndicatorText.x = SHAFT_W / 2
    this.floorIndicatorText.y = elevY - 2

    // チューリン（エレベータガール）の人影
    const gx = ex + ELEV_W / 2
    const gy = ey + ELEV_H * 0.2
    g.circle(gx, gy, 4)
    g.fill(0xf5c888)
    g.rect(gx - 4, gy + 4, 8, ELEV_H * 0.4)
    g.fill(0x2244aa)

    // 乗客数インジケータ
    const count = this.state.passengers.length
    this.passengerCountText.text = count > 0 ? String(count) : ''
    this.passengerCountText.x = ex + ELEV_W / 2
    this.passengerCountText.y = ey + ELEV_H - 6
  }

  private drawHUD(): void {
    const g = this.hudGfx
    g.clear()
    g.rect(0, 0, VIEW_W, BUILDING_TOP)
    g.fill(COLOR_HUD_BG)

    this.hudText.text = `○ ${this.state.score}  × ${this.state.mistakes}`

    const phase = this.state.elevator.phase
    const phaseLabel: Record<typeof phase, string> = {
      boarding: '乗車中',
      input: '行き先を押せ',
      moving_up: '上昇中',
      door_open: '扉開',
      moving_down: '下降中',
    }
    this.phaseText.text = phaseLabel[phase]
  }

  private drawTimerBar(): void {
    const g = this.timerGfx
    g.clear()

    if (this.state.elevator.phase !== 'input') return

    const ratio = Math.max(
      0,
      this.state.elevator.doorTimerMs / INPUT_TIMEOUT_MS
    )
    const barW = (VIEW_W - 16) * ratio
    const color = ratio < 0.3 ? COLOR_TIMER_LOW : COLOR_TIMER_BAR

    g.rect(8, BUILDING_TOP - 4, barW, 3)
    g.fill(color)
  }

  // ─── フェーズ変化検知・ログ追記 ────────────────────────────────

  private detectPhaseChange(): void {
    const phase = this.state.elevator.phase
    if (this.prevPhase === phase) return
    if (phase !== 'door_open') return

    const currentFloor = Math.round(this.state.elevator.currentFloor)

    // 降りた客: prevPassengers の中で targetFloor === currentFloor の人
    const prevNames = new Set(this.prevPassengers.map(p => p.resident.name))
    for (const p of this.prevPassengers) {
      if (p.targetFloor === currentFloor) {
        this.addLog(`${currentFloor}F: ${p.resident.nameZh} ↓`)
      }
    }

    // 乗ってきた客: 新しい passengers にいて prevPassengers にいない人
    for (const p of this.state.passengers) {
      if (!prevNames.has(p.resident.name) && p.pressedBy === 'auto') {
        this.addLog(`${currentFloor}F: ${p.resident.nameZh} ↑1F`)
      }
    }
  }

  private addLog(line: string): void {
    this.logLines.push(line)
    if (this.logLines.length > 3) this.logLines.shift()
  }

  // ─── 待機列UI ─────────────────────────────────────────────────

  private refreshWaitingList(): void {
    const g = this.waitingLayerGfx
    g.clear()

    // 既存テキストを非表示に
    for (const t of this.waitingTextPool) {
      t.visible = false
    }

    const queue = this.state.waitingQueue
    if (queue.length === 0) return

    // 1階のY範囲
    const floor1Y = floorToY(1, BUILDING_TOP, FLOOR_H)
    const floor1Bottom = floor1Y + FLOOR_H
    const midY = floor1Y + FLOOR_H / 2

    // 表示可能な行数（1行 = 約11px）
    const lineH = 11
    const maxVisible = Math.floor((floor1Bottom - midY) / lineH)
    const displayCount = Math.min(queue.length, MAX_WAITING, maxVisible)
    const hasMore = queue.length > displayCount

    for (let i = 0; i < displayCount; i++) {
      const resident = queue[i]
      const y = midY + i * lineH

      let t = this.waitingTextPool[i]
      if (!t) {
        t = new Text({
          text: '',
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0xddcc88 },
        })
        t.anchor.set(0, 0.5)
        this.addChild(t)
        this.waitingTextPool.push(t)
      }
      t.text = resident.nameZh
      t.x = BTN_X
      t.y = y
      t.visible = true
    }

    if (hasMore) {
      const moreIdx = displayCount
      const extra = queue.length - displayCount
      const y = midY + moreIdx * lineH

      let t = this.waitingTextPool[moreIdx]
      if (!t) {
        t = new Text({
          text: '',
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x888866 },
        })
        t.anchor.set(0, 0.5)
        this.addChild(t)
        this.waitingTextPool.push(t)
      }
      t.text = `...他${extra}人`
      t.x = BTN_X
      t.y = y
      t.visible = true
    }
  }

  // ─── 乗降ログUI ───────────────────────────────────────────────

  private refreshLogArea(): void {
    this.logGfx.clear()

    for (const t of this.logTextPool) {
      t.visible = false
    }

    if (this.logLines.length === 0) return

    // 1階エリアの右側（NAME_X より右）に縦に表示
    const floor1Y = floorToY(1, BUILDING_TOP, FLOOR_H)
    const lineH = 12

    for (let i = 0; i < this.logLines.length; i++) {
      const y = floor1Y + 6 + i * lineH

      let t = this.logTextPool[i]
      if (!t) {
        t = new Text({
          text: '',
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0xaaccff },
        })
        t.anchor.set(0, 0.5)
        this.addChild(t)
        this.logTextPool.push(t)
      }
      t.text = this.logLines[i]
      t.x = NAME_X
      t.y = y
      t.visible = true
    }
  }

  // ─── 入力アタッチ ──────────────────────────────────────────────

  attachInputs(
    keyboard: KeyboardManager,
    _touch: TouchManager,
    onExit: () => void
  ): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      if (cmd === 'cancel') onExit()
    }
    return keyboard.onCommand(handler)
  }

  reset(): void {
    this.state = createInitialState()
    this.refreshButtons()
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
