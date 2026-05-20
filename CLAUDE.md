# elevator-gurl - 開発メモ

PixiJS 8 + TypeScript + Vite のスマホ縦比率 (9:16, 360x640) エレベーターゲーム。
プロジェクト構造は `amanuma` の雛形をベースにしている。

- `src/main.ts`: エントリーポイント。Title / Play / Result の 3 シーンを SceneManager に登録
- `src/scenes/`: 各シーン (TitleScene / PlayScene / ResultScene) + SceneManager (カメラ tween)
- `src/input/`: KeyboardManager / TouchManager (両方とも amanuma からそのまま流用)
- `src/audio/`: SoundManager / MuteButton (localStorage キーは `elevator_gurl_muted`)
- `src/constants/colors.ts`: UI 色のみ (落ち物パズル用のブロック色は持ち込まない)

詳細仕様は notes リポの `notes/dev/elevator-gurl.md` 側で管理する。
