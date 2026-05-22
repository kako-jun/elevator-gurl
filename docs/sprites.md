# Sprite Assets

上書きすれば即反映されるプレースホルダ PNG 一覧。

## ファイル一覧

| ファイル                            | サイズ  | 内容                             |
| ----------------------------------- | ------- | -------------------------------- |
| public/assets/building-bg.png       | 360×584 | ビル外壁ドット絵背景             |
| public/assets/turing-idle.png       | 20×32   | チューリン 待機ポーズ（コマ0）   |
| public/assets/turing-reading.png    | 20×32   | チューリン 読書中ポーズ（コマ1） |
| public/assets/resident-normal-0.png | 16×24   | 一般住民 コマ0                   |
| public/assets/resident-normal-1.png | 16×24   | 一般住民 コマ1                   |
| public/assets/resident-elder-0.png  | 16×24   | 長老タイプ コマ0                 |
| public/assets/resident-elder-1.png  | 16×24   | 長老タイプ コマ1                 |
| public/assets/resident-child-0.png  | 16×24   | 子供タイプ コマ0                 |
| public/assets/resident-child-1.png  | 16×24   | 子供タイプ コマ1                 |

## 差し替え手順

1. 上記パスに同サイズ（推奨）の PNG を上書き
2. `npm run build` または `npm run dev` で確認
3. alpha 値が薄い場合は PlayScene.ts の該当箇所（コメント `プレースホルダは薄く`）を `alpha = 1.0` に変更

## アニメーション仕様

- 住民スプライトは 2 コマ（コマ0 / コマ1）を 400ms 交互に切り替え
- チューリンは待機中 = turing-idle.png、移動中 = turing-reading.png
