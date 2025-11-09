# Anomaly²: Corona Road

> **異変を見つけろ。報告しろ。目を信じろ… それとも信じるな。**

大阪コロナロードの地下街を監視する異変検知ホラーゲーム。

## 🎮 ゲーム概要

監視カメラで地下街を見守り、異変を発見して報告する6分間のサバイバルゲーム。
しかし後半、異変検知のルール自体が崩壊し始める…

### 遊び方

1. **スワイプ**でカメラを切り替える
2. 異変を見つけたら**REPORT ANOMALY**をタップ
3. 正しいカテゴリを選択して報告
4. 午前6:00まで生き残れ

### ゲーム仕様

- **プレイ時間**: 6分（ゲーム内時間 0:00 - 6:00）
- **異変カテゴリ**: 5種類（Camera / Object / Environment / Person / Surreal）
- **勝利条件**: 6:00まで生存 & 4つ以上の異変を正しく報告
- **敗北条件**: 誤報3回 or 検知不足

### 特徴

- 📱 スマホ縦画面に最適化
- 🎬 レトロな監視カメラ映像風
- 🇬🇧 英語UI（監視システム風）
- 👁️ メタホラー要素（後半でルールが崩壊）
- ♿ アクセシビリティ対応（色覚サポート、シンプル操作）

## 🚀 プレイ方法

### オンラインでプレイ（推奨）

現在デプロイ中...
完了後: **https://kako-jun.github.io/anomaly2-corona-road/**

### ローカルで開発

```bash
npm install
npm run dev
```

## 📋 現在の実装状況

### ✅ 実装済み

- ゲームループ（6分間）
- カメラ切り替えシステム
- 異変生成・報告システム
- フェーズ別難易度調整（早期/中期/後期）
- メタ異変テンプレート
- 勝敗判定
- レトロUI演出

### 🚧 未実装（今後の予定）

- 実際のカメラ映像（現在はプレースホルダー）
- 異変画像（50-60枚予定）
- 音響システム
- メタ異変の視覚的演出

詳細は **[CLAUDE.md](./CLAUDE.md)** を参照

## 🛠️ 技術スタック

- React 18 + TypeScript
- Vite
- Tailwind CSS
- GitHub Actions（自動デプロイ）

## 💻 開発

### セットアップ

```bash
npm install
npm run dev
```

### ビルド

```bash
npm run build
npm run preview
```

### コード整形

```bash
npm run lint      # ESLintチェック
npm run format    # Prettierフォーマット
```

## 🚀 デプロイ

`main`ブランチにpushすると自動的にGitHub Pagesにデプロイされます。

### 初回セットアップ

1. GitHubリポジトリの **Settings** → **Pages**
2. **Source** を **GitHub Actions** に設定
3. `main`ブランチにpush

デプロイ状況は **Actions** タブで確認できます。

## 📄 ドキュメント

- **[CLAUDE.md](./CLAUDE.md)** - 詳細な仕様書と開発ロードマップ

## 📝 ライセンス

MIT License

## 👤 Author

kako-jun
