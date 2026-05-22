/**
 * カラー定数 (elevator-gurl テンプレ初期版)。
 *
 * amanuma の `src/constants/colors.ts` をベースにしているが、
 * ブロック色 (落ち物パズル用) は持ち込まない。UI のグラスボタンや背景に使う
 * Violet / Cyan / 白だけを抽出した最小セット。
 */

/** 画面背景 (`bg`)。`PIXI.Application` の background と一致させる。 */
export const UI_BG = 0x0f0f1a

/** ボード枠線・グラスボタンの塗りに使う Violet (`primary`)。 */
export const UI_PRIMARY = 0x7c3aed

/** ハイライト用 Cyan (`secondary`)。hover 時の枠線色など。 */
export const UI_SECONDARY = 0x06b6d4

/** 本文テキストに使う白 (`text-primary`)。 */
export const UI_TEXT_PRIMARY = 0xffffff

/** 時刻ごとのビル背景色・環境光色 */
export const TIME_PALETTE: Record<string, { bg: number; ambient: number }> = {
  midnight: { bg: 0x050308, ambient: 0x1a0a2e },
  dawn: { bg: 0x0d0a1a, ambient: 0x3d1c52 },
  morning: { bg: 0x1a1008, ambient: 0x7a4a10 },
  noon: { bg: 0x1a1208, ambient: 0x5a3a18 },
  evening: { bg: 0x0f0804, ambient: 0x8a3010 },
  night: { bg: 0x080510, ambient: 0x0a0a2a },
  // rain は時刻に重ねてオーバーレイする（ビル背景を暗青に寄せる）
  rain: { bg: 0x060810, ambient: 0x1a2a3a },
}

/** 時刻ごとのシャフト色（ambient をベースに少し暗くした値） */
export const SHAFT_PALETTE: Record<string, number> = {
  midnight: 0x0d0d1a,
  dawn: 0x0a0d1e,
  morning: 0x0f1218,
  noon: 0x0f1218,
  evening: 0x0d0a14,
  night: 0x0d0d1a,
  rain: 0x080c14,
}
