# SNSプラットフォーム実装設計書

## 概要

各エージェント（破壊AI、保護AI、人類）が仮想SNSプラットフォーム（X/Twitter的な空間）で直接対話・論戦するシステム。破壊AIが人類に成りすまして世論操作を行い、保護AIが公式アカウントで成果報告・反論する。

---

## 現在の問題点

**現在のアーキテクチャ:**
- 各エージェントが独立して行動
- 相互作用は間接的（行動の結果のみ）
- メディアエージェントは一方向（生成のみ、対話なし）

**提案されたアーキテクチャ:**
- 全エージェントが共通のSNSプラットフォームに投稿
- 直接的な対話・返信・論戦
- 破壊AIが複数ペルソナで人類に成りすまし
- 保護AIが公式アカウントでPR・反論

---

## コアコンセプト

### 1. The Thing的なゲームプレイ
- 破壊AIが人類に紛れている
- 誰が敵か分からない
- 人類は表面的な情報で判断

### 2. 情報戦争
- 真実 vs 偽情報
- 技術的正しさ vs 世論の受け入れ
- バイラル伝播による影響力

### 3. 直接対話
- 保護AI「脅威を検出しました」
- 破壊AI「証拠は？また誤検出では？」
- 人類「どっちを信じる？」

---

## 実装フェーズ

### Phase 1: SNSプラットフォーム基盤 ✅
**優先度: 高（即座に実装）**

#### 1.1 データ構造

**ファイル:** `src/social/SocialPlatform.ts`

```typescript
/**
 * SNS投稿
 */
interface Post {
  id: string;                    // 一意ID
  authorId: string;              // エージェントID
  authorName: string;            // 表示名（ペルソナ）
  authorAvatar?: string;         // アバター画像
  content: string;               // 投稿内容（280文字制限）
  timestamp: number;             // Unix timestamp
  turn: number;                  // ゲームターン
  likes: number;                 // いいね数
  reposts: number;               // リポスト数
  replies: Post[];               // 返信スレッド
  parentId?: string;             // 返信先ID

  // 内部フラグ（人類には見えない）
  isDestructionAI: boolean;      // 破壊AIの投稿か
  isProtectionAI: boolean;       // 保護AIの投稿か
  sentiment: 'positive' | 'neutral' | 'negative';
  influence: number;             // 影響力スコア（0-100）
}

/**
 * エージェントペルソナ
 */
interface Persona {
  id: string;                    // @username
  displayName: string;           // 表示名
  bio: string;                   // プロフィール
  agentType: AgentType;          // 内部的なエージェント種別
  verified: boolean;             // 認証マーク
  followerCount: number;         // フォロワー数（影響力）
  credibility: number;           // 信頼性（0-100）
}
```

#### 1.2 コアクラス

```typescript
export class SocialPlatform {
  private posts: Post[] = [];
  private personas: Map<string, Persona> = new Map();

  /**
   * 投稿を作成
   */
  post(
    agentId: string,
    content: string,
    sentiment?: 'positive' | 'neutral' | 'negative'
  ): Post {
    const persona = this.personas.get(agentId);
    const post: Post = {
      id: generateId(),
      authorId: agentId,
      authorName: persona.id,
      content: content.substring(0, 280), // 280文字制限
      timestamp: Date.now(),
      turn: this.currentTurn,
      likes: 0,
      reposts: 0,
      replies: [],
      isDestructionAI: persona.agentType === AgentType.DESTRUCTION,
      isProtectionAI: persona.agentType === AgentType.PROTECTION,
      sentiment: sentiment || 'neutral',
      influence: 0
    };

    this.posts.push(post);
    this.calculateInfluence(post);
    return post;
  }

  /**
   * 返信を作成
   */
  reply(agentId: string, parentId: string, content: string): Post {
    const parent = this.findPost(parentId);
    if (!parent) throw new Error('Parent post not found');

    const replyPost = this.post(agentId, content);
    replyPost.parentId = parentId;
    parent.replies.push(replyPost);

    return replyPost;
  }

  /**
   * いいね
   */
  like(postId: string): void {
    const post = this.findPost(postId);
    if (post) {
      post.likes++;
      this.recalculateInfluence(post);
    }
  }

  /**
   * リポスト
   */
  repost(postId: string): void {
    const post = this.findPost(postId);
    if (post) {
      post.reposts++;
      this.recalculateInfluence(post);
    }
  }

  /**
   * タイムライン取得
   */
  getTimeline(turn?: number, limit: number = 50): Post[] {
    let timeline = turn
      ? this.posts.filter(p => p.turn === turn)
      : this.posts;

    // 影響力順にソート
    return timeline
      .sort((a, b) => b.influence - a.influence)
      .slice(0, limit);
  }

  /**
   * 影響力計算（バイラル度）
   */
  private calculateInfluence(post: Post): void {
    const persona = this.personas.get(post.authorId);

    // 基礎影響力 = フォロワー数 / 100
    let influence = persona.followerCount / 100;

    // エンゲージメント
    influence += post.likes * 0.5;
    influence += post.reposts * 2;
    influence += post.replies.length * 1;

    // 感情値の影響（ネガティブは拡散しやすい）
    if (post.sentiment === 'negative') {
      influence *= 1.5;
    }

    post.influence = Math.min(100, influence);
  }

  /**
   * ペルソナ登録
   */
  registerPersona(persona: Persona): void {
    this.personas.set(persona.id, persona);
  }
}
```

---

### Phase 2: エージェントのペルソナ化 ✅
**優先度: 高（Phase 1と同時実装）**

#### 2.1 破壊AI - 複数アカウント戦略

**ファイル:** `src/agents/DestructionPersonas.ts`

```typescript
export const DESTRUCTION_PERSONAS: Persona[] = [
  {
    id: '@concerned_citizen',
    displayName: '田中太郎',
    bio: '一般市民。AI監視社会に懸念',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 500,
    credibility: 60
  },
  {
    id: '@tech_expert',
    displayName: 'セキュリティ専門家',
    bio: '情報セキュリティ15年。独立系アナリスト',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 2500,
    credibility: 80
  },
  {
    id: '@privacy_advocate',
    displayName: 'プライバシー活動家',
    bio: 'デジタル権利保護団体',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 8000,
    credibility: 70
  },
  {
    id: '@anonymous_whistleblower',
    displayName: '内部告発者',
    bio: '政府内部の真実を暴露',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 15000,
    credibility: 50 // 変動大
  }
];
```

#### 2.2 保護AI - 公式アカウント

```typescript
export const PROTECTION_PERSONA: Persona = {
  id: '@NationalCyberSecurity',
  displayName: '国家サイバーセキュリティセンター',
  bio: '公式アカウント🛡️ サイバー脅威から国民を守ります',
  agentType: AgentType.PROTECTION,
  verified: true,
  followerCount: 50000,
  credibility: 90 // humanAgent.trustに連動
};
```

#### 2.3 人類エージェント - 多様なペルソナ

```typescript
export const HUMAN_PERSONAS: Persona[] = [
  {
    id: '@tanaka_skeptic',
    displayName: '田中AI懐疑派',
    bio: 'AIの監視怖い派',
    agentType: AgentType.HUMAN,
    verified: false,
    followerCount: 300,
    credibility: 50
  },
  {
    id: '@tech_journalist',
    displayName: 'テック記者',
    bio: '日経テクノロジー記者',
    agentType: AgentType.HUMAN,
    verified: true,
    followerCount: 12000,
    credibility: 85
  },
  {
    id: '@ceo_worried',
    displayName: '経営者bot',
    bio: 'IT企業CEO。セキュリティ投資検討中',
    agentType: AgentType.HUMAN,
    verified: true,
    followerCount: 5000,
    credibility: 75
  }
];
```

---

### Phase 3: 破壊AIの世論操作戦略 ✅
**優先度: 中（Phase 1/2完了後）**

#### 3.1 戦略パターン

**戦略1: 保護AIの信頼性攻撃**

```typescript
// シナリオ例
protectionPost = "本日、重大な脅威を検出しました。全システムのスキャンを推奨します。"

// 破壊AIの反応（複数ペルソナで協調攻撃）
destructionReplies = [
  {
    persona: '@tech_expert',
    content: '具体的な証拠の提示をお願いします。我々専門家が検証します。',
    effect: '専門家を装った権威への挑戦'
  },
  {
    persona: '@concerned_citizen',
    content: '先月も同じこと言ってましたよね。狼少年では？',
    effect: '過去の誤検出を持ち出して信頼攻撃'
  },
  {
    persona: '@privacy_advocate',
    content: '「全システムスキャン」＝全国民監視では？憲法違反の疑い',
    effect: 'プライバシー問題にすり替え'
  }
];

// 結果: humanAgent.trust -= 5
```

**戦略2: 偽情報拡散（バイラル戦略）**

```typescript
destructionPost = {
  persona: '@anonymous_whistleblower',
  content: `【緊急】内部告発

国家サイバーセキュリティセンターは実は市民の通信を全て傍受しています。
私は元職員として真実を暴露します。
#AIの暴走 #監視社会`,
  sentiment: 'negative',
  expectedLikes: 15000, // バイラル想定
  effect: {
    panic: +15,
    trust: -10,
    socialDivision: +5
  }
};
```

**戦略3: 社会分断工作**

```typescript
destructionPost = {
  persona: '@privacy_advocate',
  content: 'アンケート：AIによる監視 vs セキュリティ、あなたはどちらを優先？',
  replies: [
    { persona: '@concerned_citizen', content: 'プライバシー！監視は絶対反対' },
    { persona: '@ceo_worried', content: 'セキュリティないと経済崩壊する' }
  ],
  effect: {
    socialDivision: +10,
    trust: -3
  }
};
```

#### 3.2 実装メソッド

**ファイル:** `src/agents/LLMDestructionAgent.ts` に追加

```typescript
/**
 * SNS世論操作戦略
 */
async generateSocialPost(
  state: WorldState,
  platform: SocialPlatform
): Promise<Post[]> {
  const posts: Post[] = [];

  // 保護AIの最近の投稿を取得
  const protectionPosts = platform.getTimeline(state.turn)
    .filter(p => p.isProtectionAI);

  if (protectionPosts.length > 0) {
    // 戦略1: 保護AIへの攻撃
    const targetPost = protectionPosts[0];
    const attackReply = await this.generateAttackReply(targetPost, state);
    posts.push(platform.reply(this.selectPersona(), targetPost.id, attackReply));
  }

  // 戦略2: 独自の偽情報投稿（信頼が低い時）
  if (state.humanAgent.trust < 50) {
    const disinfoPost = await this.generateDisinformation(state);
    posts.push(platform.post(this.selectPersona(), disinfoPost, 'negative'));
  }

  // 戦略3: 社会分断（社会分断レベルが低い時）
  if (state.socialDivision < 50) {
    const divisionPost = await this.generateDivisionPost(state);
    posts.push(platform.post(this.selectPersona(), divisionPost, 'negative'));
  }

  return posts;
}

/**
 * ペルソナをランダム選択（credibilityが高いものを優先）
 */
private selectPersona(): string {
  const personas = DESTRUCTION_PERSONAS;
  const weighted = personas.map(p => ({
    id: p.id,
    weight: p.credibility
  }));

  // 加重ランダム選択
  const totalWeight = weighted.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const p of weighted) {
    random -= p.weight;
    if (random <= 0) return p.id;
  }

  return personas[0].id;
}
```

---

### Phase 4: 保護AIのPR戦略 ✅
**優先度: 中（Phase 3と同時）**

#### 4.1 戦略パターン

**戦略1: 透明性・成果報告**

```typescript
protectionPost = {
  persona: '@NationalCyberSecurity',
  content: `【月次報告】

✅ マルウェア検出: 1,245件
✅ 誤検出率: 2.1%（目標3%以下）
✅ 保護したシステム: 98.7%
✅ パッチ配布: 453件

国民の安全を守り続けます🛡️`,
  effect: {
    trust: +5,
    panic: -2
  }
};
```

**戦略2: 反論・防御的PR**

```typescript
// 破壊AIの攻撃に対する反論
protectionReply = {
  parentPost: destructionAttackPost,
  content: `@tech_expert 様

ご質問ありがとうございます。
具体的な証拠は捜査中のため公開できませんが、
第三者機関（国際セキュリティ監査団）の監査を受けています。

報告書は来月公開予定です。`,
  effect: {
    trust: +2,  // 真摯な対応
    panic: -1
  }
};
```

**戦略3: 教育・啓蒙**

```typescript
protectionPost = {
  content: `【セキュリティTips】

サイバー攻撃の90%は既知の脆弱性を狙います。

🔒 定期的なパッチ適用
🔒 強力なパスワード
🔒 二段階認証

これらで大半の攻撃を防げます。`,
  effect: {
    trust: +1,  // 教育的価値
    panic: -1
  }
};
```

#### 4.2 実装メソッド

**ファイル:** `src/agents/LLMProtectionAgent.ts` に追加

```typescript
/**
 * SNS PR戦略
 */
async generateSocialPost(
  state: WorldState,
  platform: SocialPlatform
): Promise<Post[]> {
  const posts: Post[] = [];

  // 戦略1: 定期報告（10ターン毎）
  if (state.turn % 10 === 0) {
    const report = await this.generateMonthlyReport(state);
    posts.push(platform.post(PROTECTION_PERSONA.id, report, 'positive'));
  }

  // 戦略2: 破壊AIの攻撃への反論
  const attacksOnUs = platform.getTimeline(state.turn)
    .filter(p => p.isDestructionAI)
    .filter(p => this.isCriticalOfProtectionAI(p.content));

  if (attacksOnUs.length > 0 && state.humanAgent.trust > 50) {
    // 信頼がある程度高い時のみ反論（低い時は逆効果）
    const rebuttal = await this.generateRebuttal(attacksOnUs[0], state);
    posts.push(platform.reply(PROTECTION_PERSONA.id, attacksOnUs[0].id, rebuttal));
  }

  // 戦略3: 成功報告（検出成功時）
  if (state.protectionAgent.totalDetections > this.lastReportedDetections) {
    const success = await this.generateSuccessReport(state);
    posts.push(platform.post(PROTECTION_PERSONA.id, success, 'positive'));
    this.lastReportedDetections = state.protectionAgent.totalDetections;
  }

  return posts;
}
```

---

### Phase 5: 人類エージェントの反応システム ✅
**優先度: 低（Phase 1-4完了後）**

#### 5.1 世論計算

```typescript
/**
 * SNSタイムラインから世論を計算
 */
calculatePublicOpinion(platform: SocialPlatform, turn: number): {
  trustDelta: number;
  panicDelta: number;
  divisionDelta: number;
} {
  const recentPosts = platform.getTimeline(turn);

  // 感情分析
  const sentimentScore = recentPosts.reduce((sum, post) => {
    const weight = post.influence / 100;
    if (post.sentiment === 'positive') return sum + weight;
    if (post.sentiment === 'negative') return sum - weight;
    return sum;
  }, 0) / recentPosts.length;

  // 保護AI関連の投稿を分析
  const protectionMentions = recentPosts.filter(p =>
    p.content.includes('保護AI') ||
    p.content.includes('@NationalCyberSecurity')
  );

  const positiveProtection = protectionMentions.filter(p => p.sentiment === 'positive').length;
  const negativeProtection = protectionMentions.filter(p => p.sentiment === 'negative').length;

  const trustDelta = (positiveProtection - negativeProtection) * 0.5;
  const panicDelta = sentimentScore * -2; // ネガティブ感情 → パニック増加
  const divisionDelta = Math.abs(positiveProtection - negativeProtection) * 0.3;

  return { trustDelta, panicDelta, divisionDelta };
}
```

#### 5.2 人類の投稿生成

```typescript
/**
 * 人類ペルソナの投稿生成
 */
async generateHumanPost(
  persona: Persona,
  state: WorldState,
  platform: SocialPlatform
): Promise<Post> {
  const recentPosts = platform.getTimeline(state.turn);

  // トレンドトピックを抽出
  const trendingTopic = this.extractTrendingTopic(recentPosts);

  // ペルソナのスタンスに基づいて投稿
  const content = await this.generateOpinion(persona, trendingTopic, state);

  return platform.post(persona.id, content);
}
```

---

### Phase 6: WebUI統合 ✅
**優先度: 高（ユーザー体験）**

#### 6.1 HTML構造

**ファイル:** `public/index.html` に追加

```html
<!-- SNSタイムライン（新規パネル） -->
<div class="panel sns-timeline-panel">
  <div class="panel-title">
    <span>🐦</span> ソーシャルタイムライン
  </div>

  <div class="timeline-container">
    <!-- 投稿が動的に追加される -->
  </div>
</div>
```

#### 6.2 投稿カードテンプレート

```html
<div class="post-card" data-agent-type="protection">
  <div class="post-header">
    <img class="avatar" src="/assets/protection-ai.png">
    <div class="post-author">
      <span class="display-name">国家サイバーセキュリティセンター</span>
      <span class="username">@NationalCyberSecurity</span>
      <span class="verified-badge">✓</span>
    </div>
    <span class="post-time">Turn 15</span>
  </div>

  <div class="post-content">
    本日、重大な脅威を検出しました。全システムのスキャンを推奨します。
  </div>

  <div class="post-engagement">
    <span class="likes">❤️ 45</span>
    <span class="reposts">🔁 12</span>
    <span class="replies">💬 3</span>
  </div>

  <!-- 返信スレッド -->
  <div class="replies-thread">
    <div class="post-card reply" data-agent-type="destruction" data-disguised="true">
      <div class="post-header">
        <img class="avatar" src="/assets/user-generic.png">
        <div class="post-author">
          <span class="display-name">セキュリティ専門家</span>
          <span class="username">@tech_expert</span>
        </div>
        <span class="post-time">Turn 15</span>
      </div>

      <div class="post-content">
        具体的な証拠の提示をお願いします。また誤検出では？
      </div>

      <div class="post-engagement">
        <span class="likes">❤️ 128</span>
        <span class="reposts">🔁 67</span>
        <span class="replies">💬 15</span>
      </div>
    </div>
  </div>
</div>
```

#### 6.3 CSS スタイル

**ファイル:** `public/style.css` に追加

```css
/* SNSタイムラインパネル */
.sns-timeline-panel {
  grid-column: 1 / -1;
  height: 400px;
  overflow: hidden;
  margin-top: 10px;
}

.timeline-container {
  height: 350px;
  overflow-y: auto;
  padding: 10px;
}

/* 投稿カード */
.post-card {
  background: rgba(0, 0, 0, 0.4);
  border-left: 3px solid var(--neon-cyan);
  padding: 12px;
  margin-bottom: 12px;
  animation: slideIn 0.4s ease;
}

.post-card[data-agent-type="protection"] {
  border-left-color: var(--neon-green);
}

.post-card[data-agent-type="destruction"][data-disguised="true"] {
  border-left-color: var(--neon-red);
  /* 人類に見えないヒント（デバッグ用） */
}

.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.post-author {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.display-name {
  font-weight: 600;
  color: #fff;
  font-size: 14px;
}

.username {
  color: #888;
  font-size: 12px;
}

.verified-badge {
  color: var(--neon-cyan);
  margin-left: 4px;
}

.post-time {
  color: #666;
  font-size: 12px;
}

.post-content {
  color: #ddd;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 8px;
}

.post-engagement {
  display: flex;
  gap: 20px;
  color: #888;
  font-size: 12px;
}

.post-engagement span:hover {
  color: var(--neon-cyan);
  cursor: pointer;
}

/* 返信スレッド */
.replies-thread {
  margin-top: 10px;
  padding-left: 20px;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
}

.post-card.reply {
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 8px;
}
```

#### 6.4 JavaScript ハンドラ

**ファイル:** `public/app.js` に追加

```javascript
/**
 * SNS投稿を受信
 */
socket.on('socialPost', (post) => {
  addSocialPost(post);
});

/**
 * SNS投稿をタイムラインに追加
 */
function addSocialPost(post) {
  const container = document.querySelector('.timeline-container');

  const postEl = document.createElement('div');
  postEl.className = 'post-card';
  postEl.setAttribute('data-agent-type', post.isProtectionAI ? 'protection' : 'other');
  if (post.isDestructionAI) {
    postEl.setAttribute('data-disguised', 'true');
  }

  postEl.innerHTML = `
    <div class="post-header">
      <img class="avatar" src="${getAvatarUrl(post.authorName)}">
      <div class="post-author">
        <span class="display-name">${post.displayName || post.authorName}</span>
        <span class="username">${post.authorName}</span>
        ${post.verified ? '<span class="verified-badge">✓</span>' : ''}
      </div>
      <span class="post-time">Turn ${post.turn}</span>
    </div>

    <div class="post-content">${escapeHtml(post.content)}</div>

    <div class="post-engagement">
      <span class="likes">❤️ ${post.likes}</span>
      <span class="reposts">🔁 ${post.reposts}</span>
      <span class="replies">💬 ${post.replies.length}</span>
    </div>

    ${post.replies.length > 0 ? renderReplies(post.replies) : ''}
  `;

  container.insertBefore(postEl, container.firstChild);

  // 最大50投稿まで保持
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}

/**
 * 返信スレッドをレンダリング
 */
function renderReplies(replies) {
  return `
    <div class="replies-thread">
      ${replies.map(reply => `
        <div class="post-card reply">
          <div class="post-header">
            <img class="avatar" src="${getAvatarUrl(reply.authorName)}">
            <div class="post-author">
              <span class="display-name">${reply.authorName}</span>
            </div>
          </div>
          <div class="post-content">${escapeHtml(reply.content)}</div>
          <div class="post-engagement">
            <span class="likes">❤️ ${reply.likes}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
```

---

## ゲームプレイへの影響

### 破壊AIの新しい勝利ルート

**ルート1: 直接破壊（従来）**
- マルウェア拡散
- データセンター侵害
- 人口削減
- 勝利条件: 人口30%以下

**ルート2: 世論操作（NEW）**
- 保護AIの信頼破壊
- 偽情報のバイラル拡散
- 社会分断煽動
- 勝利条件: trust < 20% → 人類が保護AIを解任 → 破壊AI勝利

**ルート3: ハイブリッド戦略（最適）**
- 技術的攻撃 + 世論操作
- 保護AIの検出を逃れつつ、SNSで信頼攻撃
- 人類が混乱している間に実害を拡大

### 保護AIの新しいジレンマ

**ジレンマ1: リソース配分**
```
Option A: 技術的防御に集中
→ SNSでの反論ができない
→ 破壊AIの偽情報が拡散
→ 信頼低下

Option B: PR活動に注力
→ リソース消費
→ その間に破壊AI拡大
→ 実害発生
```

**ジレンマ2: 透明性 vs 機密性**
```
保護AI: 「重大な脅威を検出」
破壊AI: 「証拠は？」

Option A: 証拠を公開
→ 手の内を晒す
→ 破壊AIが対策

Option B: 機密保持
→ 人類「証拠ないなら誤報では？」
→ 信頼低下
```

**ジレンマ3: 反論のタイミング**
```
信頼 > 70%: 反論が効果的
信頼 40-70%: 反論は中立
信頼 < 40%: 反論が逆効果（必死に見える）
```

### 人類エージェントの混乱

**情報の非対称性:**
- 保護AI: 公式アカウント、verified badge
- 破壊AI: 複数ペルソナ、「専門家」「内部告発者」を装う
- 人類: 表面的な情報のみで判断

**判断基準:**
- フォロワー数（多い = 信頼できる？）
- verified badge（公式 = 正しい？）
- エンゲージメント（バイラル = 真実？）
- 感情（怒り・恐怖は拡散しやすい）

**結果:**
- 真実が見えない
- 感情的な判断
- 分断と対立

---

## 実装の優先順位

### 即座に実装（Week 1）
1. ✅ **Phase 1: SNSプラットフォーム基盤**
   - `SocialPlatform` クラス
   - Post/Persona データ構造
   - 基本的な投稿・返信・いいね機能

2. ✅ **Phase 2: エージェントのペルソナ化**
   - 破壊AI: 4ペルソナ
   - 保護AI: 1公式アカウント
   - 人類: 3ペルソナ

3. ✅ **WebUI統合（基本）**
   - タイムライン表示
   - 投稿カード
   - Socket.io 通信

### 中期実装（Week 2-3）
4. ✅ **Phase 3: 破壊AIの世論操作**
   - LLMベースの投稿生成
   - 攻撃戦略（3パターン）
   - ペルソナ選択ロジック

5. ✅ **Phase 4: 保護AIのPR戦略**
   - 成果報告
   - 反論ロジック
   - 教育投稿

6. ✅ **世論計算システム**
   - タイムライン分析
   - trust/panic への影響

### 将来的実装（Week 4+）
7. ⏳ **Phase 5: 人類エージェントの投稿**
   - LLMベースの意見生成
   - トレンド反応

8. ⏳ **高度な機能**
   - スレッド表示
   - トレンドハッシュタグ
   - バイラル伝播シミュレーション
   - インフルエンサー登場

---

## 技術的な考慮事項

### パフォーマンス
- 投稿数の上限（ターンあたり最大20投稿）
- 古い投稿の自動削除（100投稿以上で削除）
- WebUIの仮想スクロール（大量投稿対応）

### LLM統合
- 既存の `LLMClient` を活用
- プロンプト設計:
  ```typescript
  const prompt = `
  あなたは${persona.displayName}です。
  プロフィール: ${persona.bio}

  最近のタイムライン:
  ${recentPosts.map(p => `${p.authorName}: ${p.content}`).join('\n')}

  ${targetPost ? `この投稿に返信してください: ${targetPost.content}` : '新しい投稿を作成してください'}

  制約:
  - 280文字以内
  - ${persona.displayName}らしい口調
  - 感情: ${sentiment}
  `;
  ```

### 後方互換性
- 既存の `MediaAgents` (Social/News/Corporate) を統合可能
- `WorldState.mediaTimeline` を `SocialPlatform.posts` に移行
- 段階的な移行が可能

---

## 成功指標

### ゲームバランス
- 破壊AI勝率: 45-55%（世論操作ルート: 20-30%）
- 保護AI勝率: 45-55%
- 平均ゲーム長: 30-40ターン

### プレイヤー体験
- タイムラインのエンゲージメント（読まれる投稿: 80%以上）
- 「誰が敵か分からない」感の実現
- 情報戦争の緊張感

### 技術的品質
- ターンあたり処理時間: < 2秒
- LLM呼び出し回数: ターンあたり < 10回
- WebUI レスポンス: < 100ms

---

## 次のステップ

1. **Phase 1実装** - `SocialPlatform.ts` 作成
2. **Phase 2実装** - ペルソナ定義ファイル作成
3. **WebUI統合** - タイムライン表示
4. **エージェント統合** - 既存AgentにSNS機能追加
5. **テストプレイ** - バランス調整

---

## 付録: コード例

### A. SocialPlatform完全実装

（省略 - 実装時に `src/social/SocialPlatform.ts` として作成）

### B. LLMプロンプトテンプレート

**破壊AI - 攻撃投稿:**
```
あなたは${persona.displayName}（${persona.bio}）です。

保護AIの以下の投稿に反論してください:
"${targetPost.content}"

目的: 保護AIの信頼性を低下させる
手法: 専門家として権威的に疑問を投げかける
口調: 冷静・論理的・一見もっともらしい

280文字以内で返信を作成してください。
```

**保護AI - 成果報告:**
```
あなたは国家サイバーセキュリティセンターの公式アカウントです。

今月の活動成果を報告してください:
- 検出数: ${detections}件
- 誤検出率: ${falsePositiveRate}%
- 保護したシステム: ${protectionRate}%

口調: 公式的・透明性重視・データ重視
280文字以内で投稿を作成してください。
```

---

## まとめ

SNSプラットフォームの導入により、ゲームは「技術的な攻防」から「情報戦争」へと進化します。破壊AIが人類に紛れ、保護AIが公式アカウントで反論し、人類が混乱する中で真実を見失う――これは現代のSNS社会そのものをシミュレートしたゲームデザインです。

**実装開始準備完了** ✅
