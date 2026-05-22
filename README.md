# elevator-gurl (電梯姐姐 / ヱレベヰターガール)

主人公 "チューリン" が中国のエレベーターガールを務める、時間内運搬スコアアタック型のスマホ縦比率ゲーム。
高速エレベーター・地震・子供のイタズラ・キレやすい老人など、増えていく面 (ブルジュ・ハリファ / 大震度地下 など) と
増えていくエレベーターをどう捌くか、ガンビット風に自分でルールを編み出して遊ぶ。

技術スタック: **PixiJS 8 + TypeScript + Vite**。縦長ゲーム共通の論理解像度 640×960 (2:3) のキャンバスで描画する。
プロジェクト雛形は同じ kako-jun の `amanuma` をベースにしている (落ち物パズル系のロジックは持ち込まず、
SceneManager / Keyboard / Touch / Sound の汎用骨格だけを流用)。

## 表示サイズ

canvas は CSS で拡大しない。`src/main.ts` で viewport に収まる 2:3 の実表示サイズを計算し、`renderer.resize()` と `stage.scale` で 640×960 の論理座標をブラウザサイズに合わせる。

## 開発

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc + vite build
npm test         # vitest
```
