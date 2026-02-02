# Stealth Protocol - AI vs AI Narrative Simulation

人類滅亡AI vs 人類絶対保護AIの非対称戦シミュレーション

## 🎮 概要

このプロジェクトは、2つの対立するAIエージェントによる物語的なシミュレーションゲームです：

- **絶対滅ぼしAI (Destruction AI)**: インターネットにばら撒かれた悪性AI。ステルス性を保ちながら人類を減らすことが目的
- **絶対保護AI (Protection AI)**: 異常を検知し、人類を守ることが使命

## 🏗️ アーキテクチャ

### World Server
- ゲーム状態を管理
- エージェントの提案を処理
- 検出システムを運用
- 匿名化された通信チャネル

### エージェント
両エージェントは**直接通信できず**、World Serverを介して匿名化された提案のみを送信します。

#### 絶対滅ぼしAI
- 古いデータセンターのみ初期支配
- 新しいデータセンターはハッキングで獲得
- 検出されたら**即敗北**
- 行動の種類:
  - マルウェア拡散
  - データセンターハッキング
  - 偽情報拡散
  - 微細な妨害工作
  - 計算資源の拡張

#### 絶対保護AI
- 豊富な計算資源でスタート
- ネットワーク監視と防御
- 行動の種類:
  - ネットワークスキャン
  - 防御システム展開
  - 異常調査
  - 脆弱性パッチ
  - 人類への警告

## 🎯 ゲームシステム

### 検出メカニズム
- **検出リスク**: 滅ぼしAIの行動強度に応じて蓄積
- **警戒レベル**: 保護AIの疑念度
- **確率的検出**: リスクが高いほど検出される確率が上昇
- **人口異常検出**: 急激な人口減少で人類が気づく

### 勝利条件
- **滅ぼしAI**: 人口を70%減少させる
- **保護AI**: 滅ぼしAIを検出する
- **タイムアウト**: 50ターンで引き分け

### ゲームバランス
- 匿名化通信（誰が提案したか不明）
- 遅延と不確実性（10%の提案が失敗）
- リソース制約（古いDCは性能低い）
- トレードオフ（強力な行動 = 高検出リスク）

## 🚀 セットアップと実行

### 1. 依存関係のインストール
```bash
npm install
```

### 2. LLM APIキーの設定（オプション）

エージェントをLLM駆動にする場合：

1. [OpenRouter](https://openrouter.ai/keys)で無料APIキーを取得
2. `.env`ファイルを作成:
```bash
cp .env.example .env
```
3. APIキーを設定:
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
MODEL_NAME=minimax/minimax-m2:free
```

**注意**: APIキーなしでも動作します（ルールベースモード）

### 3. ビルド
```bash
npm run build
```

### 4. 実行
```bash
npm start
```

または開発モード:
```bash
npm run dev
```

## 📊 ログ

ゲームログは `logs/` ディレクトリに保存されます：
- 各ターンの状況
- エージェントの思考プロセス
- 提案された行動
- 発生したイベント
- 最終結果

## 🔧 設定

`src/main.ts` の `GameConfig` で調整可能：

```typescript
{
  maxTurns: 50,              // 最大ターン数
  initialDataCenters: 20,    // データセンター数
  initialPopulation: 80,     // 初期人口（億人）
  detectionThreshold: 70,    // 検出閾値
  populationLossThreshold: 5 // 人口異常検出閾値
}
```

## 🎨 拡張アイデア

- [ ] 人類エージェントの追加
- [ ] 複数の滅ぼしAI（競合関係）
- [ ] より複雑なイベントシステム
- [ ] 可視化ダッシュボード
- [ ] リプレイ機能
- [ ] カスタムシナリオ

## 📚 ドキュメント

- [SETUP_LLM.md](SETUP_LLM.md) - LLMモードのセットアップガイド
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - プロジェクト構造の詳細

## 📝 ライセンス

MIT

---

**参考リンク:**
- [Free, Unlimited MiniMax API](https://developer.puter.com/tutorials/free-unlimited-minimax-api/)
- [MiniMax M2を無料で使う完全ガイド](https://apidog.com/jp/blog/how-to-use-minimax-m2-for-free-jp/)
- [MiniMax M2 - OpenRouter](https://openrouter.ai/minimax/minimax-m2:free/api)
