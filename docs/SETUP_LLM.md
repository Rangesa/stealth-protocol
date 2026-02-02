# LLMモード セットアップガイド

このガイドでは、MiniMax APIを使ってエージェントを**実際のLLMで駆動する**方法を説明します。

## 🆓 無料でMiniMaxを使う方法

### オプション1: OpenRouter（推奨）

OpenRouterを経由してMiniMax M2:freeを無料で使えます。

#### 手順

1. **OpenRouterアカウント作成**
   - https://openrouter.ai にアクセス
   - Google/GitHub/Discordでサインアップ
   - 無料クレジットが付与されます

2. **APIキーを取得**
   - https://openrouter.ai/keys にアクセス
   - 「Create Key」をクリック
   - キーをコピー（`sk-or-v1-...` の形式）

3. **プロジェクトに設定**
   ```bash
   # .envファイルを作成
   cp .env.example .env
   ```

   `.env`ファイルを編集：
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-あなたのキー
   MODEL_NAME=minimax/minimax-m2:free
   ```

4. **実行**
   ```bash
   npm run build
   npm start
   ```

   以下のメッセージが表示されればLLMモードで動作中：
   ```
   🧠 LLM mode enabled (MiniMax via OpenRouter)
   ```

### オプション2: Puter.js（ブラウザ版）

ブラウザで動かす場合は、Puter.jsを使うとAPIキー不要で完全無料です。

```html
<script src="https://js.puter.com/v2/"></script>
<script>
  puter.ai.chat(
    "Your prompt here",
    { model: "minimax/minimax-m2:free" }
  ).then(response => {
    puter.print(response);
  });
</script>
```

## 🎮 LLMモードの違い

### ルールベースモード（APIキーなし）
- ✅ 無料で動作
- ✅ 設定不要
- ❌ 行動パターンが固定的
- ❌ 戦略が単純

### LLMモード（APIキーあり）
- ✅ エージェントが状況を理解して判断
- ✅ 創発的な戦略が生まれる
- ✅ より自然な物語展開
- ⚠️ API呼び出しコスト（無料枠あり）

## 📊 利用可能なモデル

| モデル | 特徴 | コスト |
|--------|------|--------|
| `minimax/minimax-m2:free` | 無料版 | 完全無料 |
| `minimax/minimax-m2` | 高性能版 | $0.12/1M tokens |
| `minimax/minimax-m2.1` | 最新版 | $0.12/1M tokens |
| `minimax/minimax-m2-her` | 対話特化 | 有料 |

## 🔧 トラブルシューティング

### 「401 Authentication Error」が出る

- APIキーが正しく設定されているか確認
- `.env`ファイルがプロジェクトルートにあるか確認
- APIキーが有効か確認（期限切れの可能性）

### 「Rate limit exceeded」が出る

- 無料枠を使い切った可能性
- しばらく待つか、アカウントにクレジットを追加

### LLMモードなのに戦略が表示されない

- ログに以下が表示されているか確認：
  ```
  🧠 [DESTRUCTION AI STRATEGY]: ...
  🛡️  [PROTECTION AI ASSESSMENT]: ...
  ```
- 表示されていない場合はフォールバックモードで動作中

## 🌟 LLMモードで期待できること

### 滅ぼしAI
- 検出リスクに応じた動的な戦略変更
- リソース状況を見て最適な判断
- ステルス性とダメージのバランス調整

### 保護AI
- 疑わしいパターンを自動検出
- 状況に応じた防御強度の調整
- 人類への警告タイミングの判断

## 🎯 次のステップ

LLMモードが動いたら：
1. ゲーム設定を調整して難易度を変える
2. エージェントのプロンプトをカスタマイズ
3. 複数回実行して物語の多様性を楽しむ

---

**Sources:**
- [Free, Unlimited MiniMax API](https://developer.puter.com/tutorials/free-unlimited-minimax-api/)
- [MiniMax M2を無料で使う完全ガイド](https://apidog.com/jp/blog/how-to-use-minimax-m2-for-free-jp/)
- [MiniMax M2 - OpenRouter](https://openrouter.ai/minimax/minimax-m2:free)
