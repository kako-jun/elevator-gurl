/**
 * カラー定数 (elevator-gurl テンプレ初期版)。
 *
 * amanuma の `src/constants/colors.ts` をベースにしているが、
 * ブロック色 (落ち物パズル用) は持ち込まない。UI のグラスボタンや背景に使う
 * Violet / Cyan / 白だけを抽出した最小セット。
 */

import type { TimeOfDay } from '../game/types'

/** 画面背景 (`bg`)。`PIXI.Application` の background と一致させる。 */
export const UI_BG = 0x0f0f1a

/** ボード枠線・グラスボタンの塗りに使う Violet (`primary`)。 */
export const UI_PRIMARY = 0x7c3aed

/** ハイライト用 Cyan (`secondary`)。hover 時の枠線色など。 */
export const UI_SECONDARY = 0x06b6d4

/** 本文テキストに使う白 (`text-primary`)。 */
export const UI_TEXT_PRIMARY = 0xffffff

/** 補助テキスト用の灰色 (`text-dim`)。 */
export const UI_TEXT_DIM = 0xaaaaaa

/** 時刻ごとのビル背景色・環境光色 */
export const TIME_PALETTE: Record<TimeOfDay, { bg: number; ambient: number }> =
  {
    midnight: { bg: 0x050308, ambient: 0x1a0a2e },
    dawn: { bg: 0x0d0a1a, ambient: 0x3d1c52 },
    morning: { bg: 0x1a1008, ambient: 0x7a4a10 },
    noon: { bg: 0x1a1208, ambient: 0x5a3a18 },
    evening: { bg: 0x0f0804, ambient: 0x8a3010 },
    night: { bg: 0x080510, ambient: 0x0a0a2a },
  }

/**
 * 雨天オーバーレイ色。`weather === 'rain'` のときビル背景に重ねる。
 * TODO: Phase 3 でオーバーレイ描画を実装する
 */
export const RAIN_OVERLAY: { bg: number; ambient: number } = {
  bg: 0x060810,
  ambient: 0x1a2a3a,
}

/** ネオン・看板色 */
export const NEON_RED = 0xff2244
export const NEON_YELLOW = 0xffcc00
export const NEON_CYAN = 0x00ddcc
export const NEON_ORANGE = 0xff6600

/** 時刻ごとのシャフト色（ambient をベースに少し暗くした値） */
export const SHAFT_PALETTE: Record<TimeOfDay, number> = {
  midnight: 0x0d0d1a,
  dawn: 0x0a0d1e,
  morning: 0x0f1218,
  noon: 0x0f1218,
  evening: 0x0d0a14,
  night: 0x0d0d1a,
}

/** エンディングテキスト色（古い羊皮紙・蝋燭光） */
export const COLOR_ENDING_TEXT = 0xddccaa
