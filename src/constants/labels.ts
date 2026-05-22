/**
 * テキストラベル定数
 *
 * PlayScene・ResultScene など複数シーンで共有するラベル文字列。
 */
import type { TimeOfDay } from '../game/types'

/** 時刻帯の表示ラベル */
export const TOD_LABEL: Record<TimeOfDay, string> = {
  midnight: '[深夜]',
  dawn: '[夜明]',
  morning: '[朝]',
  noon: '[昼]',
  evening: '[夕]',
  night: '[夜]',
}
