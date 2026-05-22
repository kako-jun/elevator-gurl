/**
 * リザルト画面 (elevator-gurl テンプレ初期版)。
 *
 * - 「お疲れさま」見出し + 任意の score 表示
 * - 「もう一度」「タイトルへ」のグラスボタン
 * - キーボード R / Enter / Space で「もう一度」、Escape で「タイトルへ」
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import {
  UI_PRIMARY,
  UI_SECONDARY,
  UI_TEXT_PRIMARY,
  COLOR_ENDING_TEXT,
} from '../constants/colors'
import type { SoundManager } from '../audio/SoundManager'

/**
 * リザルトの種別。
 * - `gameover`: 失敗終了 (デフォルト)
 * - `clear`: クリア終了
 *
 * 種別ごとに見出しを変える。
 */
export type ResultKind = 'gameover' | 'clear'

export interface ResultSceneOptions {
  onRestart: () => void
  onTitle: () => void
  /**
   * 任意の SoundManager 注入。
   * ボタン操作時に `ui-select` を鳴らす。
   */
  soundManager?: SoundManager | null
}

const HEADLINE_TEXT: Record<ResultKind, string> = {
  gameover: 'ゲームオーバー',
  clear: 'クリア！',
}

interface ButtonAction {
  key: 'restart' | 'title'
  label: string
  centerX: number
  centerY: number
  graphics: Graphics
  hovered: boolean
}

const BUTTON_WIDTH = 220
const BUTTON_HEIGHT = 56
const BUTTON_GAP = 24
const BUTTON_RADIUS = 8

const HEADLINE_OFFSET_Y = -120
const SCORE_OFFSET_Y = -40
const BUTTONS_START_Y = 40

const ENDING_SCRIPT = [
  'チューリンは学費を稼ぎ切った。',
  '積み上げた本の山は、天井に届きそうだった。',
  '──旅に出よう。',
  '港行きの列車の切符を、',
  'ポケットに忍ばせて。',
  '',
  'おわり',
]

export class ResultScene extends Container {
  private readonly opts: ResultSceneOptions
  private readonly buttons: ButtonAction[] = []
  private readonly soundManager: SoundManager | null
  private readonly headline: Text
  private readonly scoreText: Text
  private currentKind: ResultKind = 'gameover'
  private readonly endingLines: Text[] = []
  private endingTimer = 0
  private endingLineIndex = 0

  constructor(opts: ResultSceneOptions) {
    super()
    this.opts = opts
    this.soundManager = opts.soundManager ?? null

    // 見出し (種別に応じて setResult で差し替える)。
    this.headline = new Text({
      text: HEADLINE_TEXT[this.currentKind],
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 48,
        fontWeight: '700',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    this.headline.anchor.set(0.5)
    this.headline.x = 0
    this.headline.y = HEADLINE_OFFSET_Y
    this.addChild(this.headline)

    // スコア (任意、setResult で更新)。
    this.scoreText = new Text({
      text: '',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 24,
        fontWeight: '700',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    this.scoreText.anchor.set(0.5)
    this.scoreText.alpha = 0.85
    this.scoreText.x = 0
    this.scoreText.y = SCORE_OFFSET_Y
    this.scoreText.visible = false
    this.addChild(this.scoreText)

    // ボタン定義。
    const defs: { key: 'restart' | 'title'; label: string }[] = [
      { key: 'restart', label: 'もう一度 (R)' },
      { key: 'title', label: 'タイトルへ (Esc)' },
    ]
    for (let i = 0; i < defs.length; i++) {
      const cy = BUTTONS_START_Y + i * (BUTTON_HEIGHT + BUTTON_GAP)
      this.addButton(defs[i].key, defs[i].label, 0, cy)
    }
  }

  /**
   * リザルト内容を更新する。
   *
   * シーンを破棄せず常駐させたまま見出しとスコアだけ差し替える。
   * `score` を渡さない (または undefined) なら SCORE 行は非表示にする。
   */
  setResult(opts: {
    kind: ResultKind
    money?: number
    score?: number
    mistakes?: number
  }): void {
    this.currentKind = opts.kind
    this.headline.text = HEADLINE_TEXT[opts.kind]
    for (const t of this.endingLines) t.destroy()
    this.endingLines.length = 0
    this.endingTimer = 0
    this.endingLineIndex = 0
    if (opts.kind === 'clear') {
      this.scoreText.y = -180
    } else {
      this.scoreText.y = SCORE_OFFSET_Y
    }
    if (opts.money !== undefined || opts.score !== undefined) {
      const lines: string[] = []
      if (opts.money !== undefined) lines.push(`賃金: ¥${opts.money}`)
      if (opts.score !== undefined)
        lines.push(`賢さ: ${Math.floor(opts.score / 1000)}`)
      if (opts.mistakes !== undefined) lines.push(`ミス: ${opts.mistakes}`)
      this.scoreText.text = lines.join('\n')
      this.scoreText.visible = true
    } else {
      this.scoreText.text = ''
      this.scoreText.visible = false
    }
  }

  update(dt: number): void {
    if (this.currentKind !== 'clear') return
    if (this.endingLineIndex >= ENDING_SCRIPT.length) return

    this.endingTimer += dt
    if (this.endingTimer < 800) return
    this.endingTimer = 0

    const line = ENDING_SCRIPT[this.endingLineIndex]
    this.endingLineIndex++

    const t = new Text({
      text: line,
      style: {
        fontFamily: 'Noto Serif SC, serif',
        fontSize: 15,
        fill: COLOR_ENDING_TEXT,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 280,
      },
    })
    t.anchor.set(0.5)
    t.x = 0
    t.y = -100 + this.endingLines.length * 28
    t.alpha = 0
    this.addChild(t)
    this.endingLines.push(t)

    let elapsed = 0
    const fade = (): void => {
      if (t.destroyed || t.alpha >= 1) return
      elapsed += 16
      t.alpha = Math.min(elapsed / 400, 1)
      if (t.alpha < 1) requestAnimationFrame(fade)
    }
    requestAnimationFrame(fade)
  }

  /**
   * KeyboardManager の購読。
   * - confirm (Enter / Space) / restart (R) → onRestart
   * - cancel (Escape) → onTitle
   */
  attachInputs(keyboard: KeyboardManager): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      switch (cmd) {
        case 'restart':
        case 'confirm':
          this.soundManager?.playSfx('ui-select')
          this.opts.onRestart()
          break
        case 'cancel':
          this.soundManager?.playSfx('ui-select')
          this.opts.onTitle()
          break
        default:
          break
      }
    }
    return keyboard.onCommand(handler)
  }

  private addButton(
    key: 'restart' | 'title',
    label: string,
    cx: number,
    cy: number
  ): void {
    const g = new Graphics()
    g.eventMode = 'static'
    g.cursor = 'pointer'

    const text = new Text({
      text: label,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: '600',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    text.anchor.set(0.5)
    text.x = cx
    text.y = cy

    const entry: ButtonAction = {
      key,
      label,
      centerX: cx,
      centerY: cy,
      graphics: g,
      hovered: false,
    }
    this.buttons.push(entry)
    this.addChild(g)
    this.addChild(text)
    this.drawButton(entry)

    g.on('pointerover', () => {
      entry.hovered = true
      this.drawButton(entry)
    })
    g.on('pointerout', () => {
      entry.hovered = false
      this.drawButton(entry)
    })
    g.on('pointertap', () => {
      this.soundManager?.playSfx('ui-select')
      if (entry.key === 'restart') this.opts.onRestart()
      else this.opts.onTitle()
    })
  }

  private drawButton(entry: ButtonAction): void {
    const { graphics: g, centerX, centerY, hovered } = entry
    const x = centerX - BUTTON_WIDTH / 2
    const y = centerY - BUTTON_HEIGHT / 2
    const fillAlpha = hovered ? 0.35 : 0.2
    const borderAlpha = hovered ? 0.9 : 0.5
    const borderColor = hovered ? UI_SECONDARY : UI_PRIMARY
    g.clear()
    g.roundRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS)
      .fill({ color: UI_PRIMARY, alpha: fillAlpha })
      .stroke({ color: borderColor, width: 1, alpha: borderAlpha })
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
