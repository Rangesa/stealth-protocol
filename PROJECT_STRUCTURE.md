# プロジェクト構造

## 📂 ディレクトリ構成

```
stealth-protocol/
├── src/
│   ├── types/
│   │   └── index.ts              # 型定義（ゲーム状態、エージェント、イベント等）
│   │
│   ├── world-server/
│   │   ├── GameState.ts          # ゲーム状態管理
│   │   ├── DetectionSystem.ts    # 検出メカニズム
│   │   └── WorldServer.ts        # メインゲームロジック
│   │
│   ├── agents/
│   │   ├── BaseAgent.ts          # エージェント基底クラス
│   │   ├── DestructionAgent.ts   # ルールベース滅ぼしAI
│   │   ├── ProtectionAgent.ts    # ルールベース保護AI
│   │   ├── LLMDestructionAgent.ts # LLM駆動滅ぼしAI
│   │   └── LLMProtectionAgent.ts # LLM駆動保護AI
│   │
│   ├── llm/
│   │   └── LLMClient.ts          # OpenRouter/MiniMax APIクライアント
│   │
│   └── main.ts                   # ゲームループ
│
├── data/                         # ゲーム状態の保存先（自動生成）
├── logs/                         # ゲームログ（自動生成）
├── dist/                         # ビルド出力（自動生成）
│
├── .env                          # 環境変数（APIキー）
├── .env.example                  # 環境変数のテンプレート
├── package.json
├── tsconfig.json
├── README.md                     # プロジェクト概要
├── SETUP_LLM.md                  # LLMセットアップガイド
└── PROJECT_STRUCTURE.md          # このファイル
```

## 🏗️ アーキテクチャ

### レイヤー構造

```
┌─────────────────────────────────────────┐
│          main.ts (ゲームループ)          │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  World Server    │  │    Agents        │
│  ・ゲーム状態     │  │  ・滅ぼしAI       │
│  ・提案処理       │  │  ・保護AI         │
│  ・検出判定       │  │  ・LLM統合        │
└──────────────────┘  └──────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Detection       │  │   LLM Client     │
│  System          │  │  (OpenRouter)    │
└──────────────────┘  └──────────────────┘
```

### データフロー

```
1. ターン開始
   └─> World Server: 現在の状態を取得

2. エージェント思考フェーズ
   ├─> Destruction AI: 観測情報を受け取る
   │   └─> LLM: 戦略を考える（オプション）
   │       └─> 提案を生成
   │
   └─> Protection AI: 観測情報を受け取る
       └─> LLM: 分析を行う（オプション）
           └─> 提案を生成

3. 提案処理フェーズ
   └─> World Server: 両者の提案を受け取る
       ├─> ランダムシャッフル（同時性）
       ├─> 10%の提案が失敗（不確実性）
       ├─> 各提案を実行
       └─> イベント生成

4. 検出判定フェーズ
   └─> Detection System
       ├─> 検出リスクを計算
       ├─> 人口異常チェック
       └─> 勝敗判定

5. ターン終了
   └─> 状態を保存、次のターンへ
```

## 🎮 主要コンポーネント

### WorldServer

**責務**: ゲーム全体の進行管理

- ゲーム状態の保持
- 提案の処理（匿名化・遅延・失敗）
- 検出判定の実行
- 勝敗判定

### GameState

**責務**: 状態の永続化

- データセンター管理
- 人口管理
- エージェントリソース管理
- ファイルI/O

### DetectionSystem

**責務**: 滅ぼしAIの検出

- 行動からリスク計算
- 確率的検出判定
- 人口異常検出
- 調査による証拠発見

### エージェント

**責務**: 戦略的判断

- 状況分析
- 行動決定（ルールベースまたはLLM）
- コスト計算
- 提案生成

### LLMClient

**責務**: AI APIとの通信

- OpenRouter経由でMiniMax呼び出し
- JSON構造化出力
- エラーハンドリング
- フォールバック管理

## 🔄 ゲームサイクル

```
初期化
  ↓
┌─────────────────┐
│  ターン開始      │
│  ・状態表示      │
│  ・思考フェーズ  │
└─────────────────┘
  ↓
┌─────────────────┐
│  行動決定        │
│  ・LLM呼び出し   │
│  ・提案生成      │
└─────────────────┘
  ↓
┌─────────────────┐
│  提案処理        │
│  ・実行          │
│  ・イベント生成  │
└─────────────────┘
  ↓
┌─────────────────┐
│  検出判定        │
│  ・リスク計算    │
│  ・勝敗チェック  │
└─────────────────┘
  ↓
  ゲーム終了? ─No─┐
  │              │
  Yes            │
  ↓              │
結果表示 ←────────┘
```

## 🎯 拡張ポイント

### 新しいエージェント追加

`src/agents/`に新しいクラスを作成し、`BaseAgent`を継承：

```typescript
export class NewAgent extends BaseAgent {
  decideAction(state: WorldState): Proposal[] {
    // 独自のロジック
  }
}
```

### 新しい行動タイプ追加

1. `src/types/index.ts`の`ActionType`に追加
2. `WorldServer.executeDestructionAction()`に実装

### 新しい検出メカニズム

`DetectionSystem`にメソッドを追加し、`WorldServer.processProposals()`から呼び出す

### UI/可視化

- Webダッシュボード（Express + WebSocket）
- ターミナルUI（blessed, ink）
- グラフ生成（Chart.js, D3.js）

## 📊 データモデル

### WorldState

```typescript
{
  turn: number;                    // 現在のターン
  gameOver: boolean;               // ゲーム終了フラグ
  winner: AgentType | null;        // 勝者

  dataCenters: DataCenter[];       // データセンター一覧
  humanPopulation: number;         // 人口（億人）

  destructionAgent: {              // 滅ぼしAIの状態
    computeResources: number;
    detectionRisk: number;
    controlledDataCenters: string[];
  };

  protectionAgent: {               // 保護AIの状態
    computeResources: number;
    alertLevel: number;
    knownThreats: string[];
  };

  events: GameEvent[];             // イベント履歴
}
```

## 🔐 セキュリティ考慮事項

- `.env`ファイルは`.gitignore`に含める
- APIキーは環境変数で管理
- ログファイルに機密情報を含めない

## 🚀 パフォーマンス

- 同期的なゲームループ（ターン制）
- LLM呼び出しは並列化可能
- 状態はJSON形式でファイル保存（軽量）
- メモリ使用量: ~50MB（通常時）
