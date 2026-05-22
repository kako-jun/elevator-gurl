/**
 * elevator-gurl エントリーポイント (Issues #10, #11)。
 *
 * - 1 個の `Application` (PixiJS) を初期化。縦長 2:3 比率で固定。
 * - 1 個の `KeyboardManager` を window に attach (全シーンで共有)。
 * - `SceneManager` に title / play / result の 3 シーンを登録し、
 *   Title → Play → Result → Title の遷移だけ通すミニマル版。
 *
 * ゲームロジックそのものは未実装。各シーンの中身は後続 Issue で詰める。
 */
import { Application, Assets } from 'pixi.js'
import { RetroFilter } from './filters/RetroFilter'
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

/** 縦長ゲーム共通の論理解像度 (2:3)。 */
const VIEW_W = 640
const VIEW_H = 960
const VIEW_ASPECT = VIEW_W / VIEW_H

/**
 * 誌面 (world) 上の各シーンの絶対座標。
 * 2:3 縦比率に合わせ、シーンも縦に積む (title → play → result を 1 画面分ずつ下へ)。
 */
const SCENE_TRANSFORMS = {
  title: { x: VIEW_W / 2, y: VIEW_H / 2, scale: 1 },
  play: { x: VIEW_W / 2, y: VIEW_H / 2 + VIEW_H, scale: 1 },
  result: { x: VIEW_W / 2, y: VIEW_H / 2 + VIEW_H * 2, scale: 1 },
} as const

const SPRITE_ASSETS = [
  '/assets/turing-idle.png',
  '/assets/turing-reading.png',
  '/assets/building-bg.png',
  '/assets/resident-normal-0.png',
  '/assets/resident-normal-1.png',
  '/assets/resident-elder-0.png',
  '/assets/resident-elder-1.png',
  '/assets/resident-child-0.png',
  '/assets/resident-child-1.png',
]

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
  const resizeCanvas = (): void => {
    const windowAspect = window.innerWidth / window.innerHeight
    const displayH =
      windowAspect > VIEW_ASPECT
        ? Math.floor(window.innerHeight)
        : Math.floor(window.innerWidth / VIEW_ASPECT)
    const displayW = Math.floor(displayH * VIEW_ASPECT)
    app.renderer.resize(displayW, displayH)
    app.stage.scale.set(displayW / VIEW_W)
    app.canvas.style.width = `${displayW}px`
    app.canvas.style.height = `${displayH}px`
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  await Assets.load(SPRITE_ASSETS)

  // RetroFilter (スキャンライン + ビネット)
  const retroFilter = new RetroFilter()
  app.stage.filters = [retroFilter]

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
  }
  window.addEventListener('pointerdown', unlockOnce, { once: true })
  window.addEventListener('keydown', unlockOnce, { once: true })
  window.addEventListener('touchstart', unlockOnce, { once: true })

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
  let isPlayActive = false

  // --- Title ---
  const titleScene = new TitleScene(() => startPlay(), sound)
  titleScene.x = SCENE_TRANSFORMS.title.x
  titleScene.y = SCENE_TRANSFORMS.title.y
  sceneManager.world.addChild(titleScene)

  // --- Play ---
  const playScene = new PlayScene()
  playScene.x = SCENE_TRANSFORMS.play.x - VIEW_W / 2
  playScene.y = SCENE_TRANSFORMS.play.y - VIEW_H / 2
  playScene.visible = false
  sceneManager.world.addChild(playScene)

  playScene.setGameOverCallback((money, score, mistakes) => {
    resultScene.setResult({ kind: 'gameover', money, score, mistakes })
    setActiveScene('result')
    void sceneManager.navigateTo('result', 800)
  })

  playScene.setClearCallback((money, score, mistakes) => {
    resultScene.setResult({ kind: 'clear', money, score, mistakes })
    setActiveScene('result')
    void sceneManager.navigateTo('result', 800)
  })

  // --- Result --- (常駐。setResult で内容だけ差し替える)
  const resultScene = new ResultScene({
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
  resultScene.visible = false
  sceneManager.world.addChild(resultScene)

  // SceneManager に登録。
  sceneManager.registerScene('title', SCENE_TRANSFORMS.title)
  sceneManager.registerScene('play', SCENE_TRANSFORMS.play)
  sceneManager.registerScene('result', SCENE_TRANSFORMS.result)
  // 初期カメラは title にスナップ。
  void sceneManager.navigateTo('title', 0)
  setActiveScene('title')

  // 1 個の Ticker で全部を回す。
  app.ticker.add(ticker => {
    retroFilter.tick(ticker.deltaMS)
    sceneManager.update(ticker.deltaMS)
    resultScene.update(ticker.deltaMS)
    if (isPlayActive) {
      playScene.update(ticker.deltaMS)
    }
  })

  // --------------------------------------------------------------------
  // シーン遷移ハンドラ
  // --------------------------------------------------------------------

  function setActiveScene(key: SceneKey): void {
    activeUnsub?.()
    activeUnsub = null
    isPlayActive = key === 'play'
    playScene.visible = key === 'play'
    resultScene.visible = key === 'result'
    switch (key) {
      case 'title':
        activeUnsub = titleScene.attachInputs(keyboard)
        break
      case 'play':
        activeUnsub = playScene.attachInputs(keyboard, touch, () => {
          // Esc はギブアップ扱いで Result へ遷移する (Issue #11)。
          resultScene.setResult({
            kind: 'gameover',
            money: playScene.getMoney(),
            score: playScene.getScore(),
          })
          setActiveScene('result')
          void sceneManager.navigateTo('result', 800)
        })
        break
      case 'result':
        activeUnsub = resultScene.attachInputs(keyboard)
        break
    }
  }

  function startPlay(): void {
    playScene.reset()
    setActiveScene('play')
    void sceneManager.navigateTo('play', 800)
  }

  // ミニマル経路: Title → Play → Result (Esc) → Title (Esc) / Play (R)。
  // Play 中の Esc はギブアップ扱いで resultScene.setResult({ kind: 'gameover' }) →
  // navigateTo('result') へ送る。Result 側は R/Enter で Play、Esc で Title へ戻す。
}

void bootstrap()
