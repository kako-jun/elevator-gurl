# elevator-gurl (電梯姐姐 / ヱレベヰターガール)

主人公 "チューリン" が中国のエレベーターガールを務める、時間内運搬スコアアタック型のスマホ縦比率ゲーム。
高速エレベーター・地震・子供のイタズラ・キレやすい老人など、増えていく面 (ブルジュ・ハリファ / 大震度地下 など) と
増えていくエレベーターをどう捌くか、ガンビット風に自分でルールを編み出して遊ぶ。

技術スタック: **PixiJS 8 + TypeScript + Vite**。スマホ縦比率 (9:16) のキャンバスで描画する。
プロジェクト雛形は同じ kako-jun の `amanuma` をベースにしている (落ち物パズル系のロジックは持ち込まず、
SceneManager / Keyboard / Touch / Sound の汎用骨格だけを流用)。

## 開発

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc + vite build
npm test         # vitest
```
