/**
 * elevator-gurl エントリーポイント (Issue #10 テンプレ初期版)。
 *
 * - 1 個の `Application` (PixiJS) を初期化。スマホ縦比率 (9:16) で固定。
 * - 1 個の `KeyboardManager` を window に attach (全シーンで共有)。
 * - `SceneManager` に title / play / result の 3 シーンを登録し、
 *   Title → Play → Result → Title の遷移だけ通すミニマル版。
 *
 * ゲームロジックそのものは未実装。各シーンの中身は後続 Issue で詰める。
 */
import { Application } from 'pixi.js'
import { SceneManager, type SceneKey } from './scenes/SceneManager'
import { TitleScene } from './scenes/TitleScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'
import { KeyboardManager } from './input/KeyboardManager'
import { TouchManager } from './input/TouchManager'
import { SoundManager } from './audio/SoundManager'
import { MuteButton } from './audio/MuteButton'
import { UI_BG } from './constants/colors'
import './index.css'

/** スマホ縦比率 (9:16)。 */
const VIEW_W = 360
const VIEW_H = 640

/** 誌面 (world) 上の各シーンの絶対座標。 */
const SCENE_TRANSFORMS = {
  title: { x: VIEW_W / 2, y: VIEW_H / 2, scale: 1 },
  play: { x: VIEW_W / 2 + 800, y: VIEW_H / 2, scale: 1 },
  result: { x: VIEW_W / 2 + 1600, y: VIEW_H / 2, scale: 1 },
} as const

async function bootstrap(): Promise<void> {
  const container = document.getElementById('root')
  if (!container) {
    throw new Error('Mount element #root not found in index.html')
  }

  const app = new Application()
  await app.init({
    width: VIEW_W,
    height: VIEW_H,
    background: UI_BG,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  })
  container.appendChild(app.canvas)

  // ---------------------------------------------------------------------
  // 入力 Manager (全シーン共有)
  // ---------------------------------------------------------------------
  const keyboard = new KeyboardManager()
  keyboard.attach(window)
  const touch = new TouchManager()
  if (app.canvas instanceof HTMLCanvasElement) {
    touch.attach(app.canvas)
  }

  // ---------------------------------------------------------------------
  // SoundManager
  // ---------------------------------------------------------------------
  const sound = new SoundManager()
  sound.loadPersisted()

  let unlocked = false
  const unlockOnce = (): void => {
    if (unlocked) return
    unlocked = true
    sound.unlock()
    window.removeEventListener('pointerdown', unlockOnce)
    window.removeEventListener('keydown', unlockOnce)
    window.removeEventListener('touchstart', unlockOnce)
  }
  window.addEventListener('pointerdown', unlockOnce, { once: false })
  window.addEventListener('keydown', unlockOnce, { once: false })
  window.addEventListener('touchstart', unlockOnce, { once: false })

  // M キー (mute toggle) はシーン非依存で受ける。
  keyboard.onCommand(cmd => {
    if (cmd === 'mute') sound.toggleMute()
  })

  // ---------------------------------------------------------------------
  // SceneManager + シーン群
  // ---------------------------------------------------------------------
  const sceneManager = new SceneManager(VIEW_W, VIEW_H)
  app.stage.addChild(sceneManager.world)

  // ミュートボタンは canvas 右上に固定 (world ではなく stage 直下)。
  const muteButton = new MuteButton(sound, 32)
  const MUTE_MARGIN = 8
  muteButton.x = VIEW_W - 32 - MUTE_MARGIN
  muteButton.y = MUTE_MARGIN
  app.stage.addChild(muteButton)

  let activeUnsub: (() => void) | null = null
  let resultScene: ResultScene | null = null

  // --- Title ---
  const titleScene = new TitleScene(() => startPlay(), sound)
  titleScene.x = SCENE_TRANSFORMS.title.x
  titleScene.y = SCENE_TRANSFORMS.title.y
  sceneManager.world.addChild(titleScene)

  // --- Play ---
  const playScene = new PlayScene()
  playScene.x = SCENE_TRANSFORMS.play.x
  playScene.y = SCENE_TRANSFORMS.play.y
  sceneManager.world.addChild(playScene)

  // SceneManager に登録。
  sceneManager.registerScene('title', SCENE_TRANSFORMS.title)
  sceneManager.registerScene('play', SCENE_TRANSFORMS.play)
  sceneManager.registerScene('result', SCENE_TRANSFORMS.result)
  // 初期カメラは title にスナップ。
  void sceneManager.navigateTo('title', 0)
  setActiveScene('title')

  // 1 個の Ticker で全部を回す。
  app.ticker.add(ticker => {
    sceneManager.update(ticker.deltaMS)
  })

  // --------------------------------------------------------------------
  // シーン遷移ハンドラ
  // --------------------------------------------------------------------

  function setActiveScene(key: SceneKey): void {
    activeUnsub?.()
    activeUnsub = null
    switch (key) {
      case 'title':
        activeUnsub = titleScene.attachInputs(keyboard)
        break
      case 'play':
        activeUnsub = playScene.attachInputs(keyboard, touch, () => {
          // Esc でタイトルへ戻る。
          setActiveScene('title')
          void sceneManager.navigateTo('title', 800)
        })
        break
      case 'result':
        if (resultScene) activeUnsub = resultScene.attachInputs(keyboard)
        break
    }
  }

  function startPlay(): void {
    setActiveScene('play')
    void sceneManager.navigateTo('play', 800)
  }

  // showResult はテンプレ段階では keyboard ショートカット (Issue #10 では未使用) や
  // PlayScene 側からの呼び出し用に用意しておく。タイトル → Play 遷移後に Play から
  // Result へ向かう導線は後続 Issue で実装する。
  // 現在の golden path は: Title → Play → (Esc) → Title。
  void showResult
  function showResult(score?: number): void {
    if (resultScene && !resultScene.destroyed) {
      resultScene.destroy()
    }
    resultScene = new ResultScene({
      score,
      soundManager: sound,
      onRestart: () => {
        startPlay()
      },
      onTitle: () => {
        setActiveScene('title')
        void sceneManager.navigateTo('title', 800)
      },
    })
    resultScene.x = SCENE_TRANSFORMS.result.x
    resultScene.y = SCENE_TRANSFORMS.result.y
    sceneManager.world.addChild(resultScene)

    setActiveScene('result')
    void sceneManager.navigateTo('result', 800)
  }
}

void bootstrap()
