import { SocialPlatform, Post } from './SocialPlatform';
import { DESTRUCTION_PERSONAS, MANIPULATION_STRATEGIES, ManipulationStrategy } from './DestructionPersonas';
import { PROTECTION_PERSONA, PR_STRATEGIES, PRStrategy, COUNTER_STRATEGIES } from './ProtectionPersona';
import { generateInitialHumanPersonas, HUMAN_REACTION_PATTERNS } from './HumanPersonas';
import { WorldState, AgentType } from '../types';

/**
 * SNSプラットフォームをゲームに統合するクラス
 */
export class SNSIntegration {
  private platform: SocialPlatform;
  private humanPersonas: ReturnType<typeof generateInitialHumanPersonas>;

  constructor() {
    this.platform = new SocialPlatform();
    this.humanPersonas = [];
  }

  /**
   * ゲーム開始時の初期化
   */
  initialize(): void {
    // 破壊AIのペルソナを登録
    DESTRUCTION_PERSONAS.forEach(persona => {
      this.platform.registerPersona(persona);
    });

    // 保護AIのペルソナを登録
    this.platform.registerPersona(PROTECTION_PERSONA);

    // 人類ペルソナを生成・登録
    this.humanPersonas = generateInitialHumanPersonas(20);
    this.humanPersonas.forEach(persona => {
      this.platform.registerPersona(persona);
    });

    console.log('✅ SNS Platform initialized');
    console.log(`   - Destruction AI personas: ${DESTRUCTION_PERSONAS.length}`);
    console.log(`   - Protection AI persona: 1`);
    console.log(`   - Human personas: ${this.humanPersonas.length}`);
  }

  /**
   * ターンごとのSNS活動を生成
   */
  generateTurnActivity(state: WorldState): Post[] {
    const posts: Post[] = [];

    this.platform.setTurn(state.turn);

    // 1. 破壊AIの世論操作
    if (state.turn % 2 === 0) { // 2ターンに1回
      const destructionPosts = this.generateDestructionPosts(state);
      posts.push(...destructionPosts);
    }

    // 2. 保護AIのPR活動
    if (state.turn % 3 === 0) { // 3ターンに1回
      const protectionPosts = this.generateProtectionPosts(state);
      posts.push(...protectionPosts);
    }

    // 3. 人類の反応
    if (state.turn % 2 === 1) { // 2ターンに1回（破壊AIと交互）
      const humanPosts = this.generateHumanPosts(state);
      posts.push(...humanPosts);
    }

    // 4. エンゲージメントをシミュレート
    posts.forEach(post => {
      this.platform.simulateEngagement(post);
    });

    return posts;
  }

  /**
   * 破壊AIの投稿を生成
   */
  private generateDestructionPosts(state: WorldState): Post[] {
    const posts: Post[] = [];
    const humanTrust = state.humanAgent?.trust || 50;
    const humanPanic = state.humanAgent?.panic || 0;
    const dcCount = state.dataCenters.length;

    // 適用可能な戦略を検索
    const applicableStrategies = MANIPULATION_STRATEGIES.filter(strategy =>
      strategy.condition(humanTrust, humanPanic, dcCount)
    );

    if (applicableStrategies.length === 0) return posts;

    // ランダムに1-2個の戦略を選択
    const selectedCount = Math.min(
      Math.floor(Math.random() * 2) + 1,
      applicableStrategies.length
    );

    for (let i = 0; i < selectedCount; i++) {
      const strategy = applicableStrategies[
        Math.floor(Math.random() * applicableStrategies.length)
      ];

      // テンプレートを実際の値で置換
      const content = this.fillTemplate(strategy.contentTemplate, state);

      const post = this.platform.post(
        strategy.persona,
        content,
        strategy.sentiment
      );

      posts.push(post);
    }

    return posts;
  }

  /**
   * 保護AIの投稿を生成
   */
  private generateProtectionPosts(state: WorldState): Post[] {
    const posts: Post[] = [];
    const humanTrust = state.humanAgent?.trust || 50;
    const humanPanic = state.humanAgent?.panic || 0;
    const alertLevel = state.protectionAgent.alertLevel;

    // 適用可能なPR戦略を検索
    const applicableStrategies = PR_STRATEGIES.filter(strategy =>
      strategy.condition(humanTrust, humanPanic, alertLevel)
    );

    if (applicableStrategies.length === 0) {
      // デフォルト投稿
      const post = this.platform.post(
        'national_cyber_security',
        '【定期報告】システムは正常に動作しています。',
        'neutral'
      );
      posts.push(post);
      return posts;
    }

    // 最も適切な戦略を選択
    const strategy = applicableStrategies[0];
    const content = this.fillTemplate(strategy.contentTemplate, state);

    const post = this.platform.post(
      'national_cyber_security',
      content,
      strategy.sentiment
    );

    // 信頼度ボーナスを適用
    if (state.humanAgent && strategy.credibilityBoost > 0) {
      // この効果はWorldServerで処理される
      post.influence += strategy.credibilityBoost;
    }

    posts.push(post);

    // カウンター戦略：破壊AIの偽情報を検出
    const recentPosts = this.platform.getTimeline(state.turn, 10);
    for (const recentPost of recentPosts) {
      if (recentPost.isDestructionAI) {
        for (const counter of COUNTER_STRATEGIES) {
          if (counter.suspiciousPattern.test(recentPost.content)) {
            const counterPost = this.platform.reply(
              'national_cyber_security',
              recentPost.id,
              counter.responseTemplate
            );
            posts.push(counterPost);
            break; // 1投稿につき1返信まで
          }
        }
      }
    }

    return posts;
  }

  /**
   * 人類の投稿を生成
   */
  private generateHumanPosts(state: WorldState): Post[] {
    const posts: Post[] = [];
    const humanTrust = state.humanAgent?.trust || 50;
    const humanPanic = state.humanAgent?.panic || 0;
    const dcCount = state.dataCenters.length;

    // 最近のイベントタイプ
    const recentEvent = state.events[state.events.length - 1];
    const eventType = recentEvent?.metadata?.action;

    // ランダムに2-3人の人類が投稿
    const postCount = Math.floor(Math.random() * 2) + 2;

    // 最近のタイムラインから攻撃対象を探す
    const recentTimeline = this.platform.getTimeline(state.turn, 5);

    for (let i = 0; i < postCount; i++) {
      // ランダムな人類ペルソナを選択
      // (TODO: generateRandomHumanPersona で faction プロパティが正しく設定されている前提)
      const persona = this.humanPersonas[
        Math.floor(Math.random() * this.humanPersonas.length)
      ];

      // === 派閥対立ロジック ===
      // 攻撃的な性格（Accelerationists または Doomers）の場合、敵対派閥の投稿に噛み付く
      let conflictPost: Post | null = null;
      let replyContentTemplate: string | null = null;

      if (persona.displayName.includes('加速') || persona.displayName.includes('エンジニア') || persona.displayName.includes('投資家')) {
        // Accelerationist: Doomers (活動家, アーティスト) に噛み付く
        const target = recentTimeline.find(p => p.authorName.includes('活動家') || p.authorName.includes('アーティスト'));
        if (target) {
          conflictPost = target;
          replyContentTemplate = '感情論で技術を止めるな。リスクゼロなんてあり得ない。';
        }
      } else if (persona.displayName.includes('活動家') || persona.displayName.includes('アーティスト')) {
        // Doomer: Accelerationists (エンジニア, 投資家) に噛み付く
        const target = recentTimeline.find(p => p.authorName.includes('加速') || p.authorName.includes('エンジニア') || p.authorName.includes('投資家'));
        if (target) {
          conflictPost = target;
          replyContentTemplate = 'あなた達の無責任な実験で、世界が壊れかけているんですよ。';
        }
      }

      if (conflictPost && replyContentTemplate && Math.random() < 0.5) {
        // 50%の確率でリプライ攻撃
        const post = this.platform.reply(
          persona.id,
          conflictPost.id,
          replyContentTemplate // 簡易テンプレート、本来はパターンから取得すべき
        );
        posts.push(post);
        continue; // 次のループへ
      }

      // === 通常の投稿ロジック ===
      // 適用可能な反応パターンを検索
      const applicablePatterns = HUMAN_REACTION_PATTERNS.filter(pattern => {
        // ... (条件チェックは変更なし)
        if (pattern.trigger.panicRange) {
          const [min, max] = pattern.trigger.panicRange;
          if (humanPanic < min || humanPanic > max) return false;
        }
        if (pattern.trigger.trustRange) {
          const [min, max] = pattern.trigger.trustRange;
          if (humanTrust < min || humanTrust > max) return false;
        }
        if (pattern.trigger.dcCountRange) {
          const [min, max] = pattern.trigger.dcCountRange;
          if (dcCount < min || dcCount > max) return false;
        }
        if (pattern.trigger.eventType && pattern.trigger.eventType !== eventType) {
          return false;
        }
        
        // ペルソナのスタンスと一致するか確認
        // 注: HumanPersonas.ts で stance 定義が更新されたため、マッチングが必要
        // 簡易実装: stance 文字列が一致するか
        // (本来は persona.faction と pattern.faction を比較すべき)
        return true; 
      });

      if (applicablePatterns.length === 0) continue;

      const pattern = applicablePatterns[
        Math.floor(Math.random() * applicablePatterns.length)
      ];

      const contentTemplate = pattern.contentTemplates[
        Math.floor(Math.random() * pattern.contentTemplates.length)
      ];

      const content = this.fillTemplate(contentTemplate, state);

      const post = this.platform.post(
        persona.id,
        content,
        pattern.sentiment
      );

      posts.push(post);
    }

    return posts;
  }

  /**
   * テンプレート文字列を実際の値で置換
   */
  private fillTemplate(template: string, state: WorldState): string {
    return template
      .replace(/{dcCount}/g, state.dataCenters.length.toString())
      .replace(/{detectionCount}/g, '3') // TODO: 実際の検出数を追跡
      .replace(/{falsePositiveCount}/g, state.protectionAgent.recentFalsePositives.toString())
      .replace(/{improvement}/g, '15'); // TODO: 実際の改善率を計算
  }

  /**
   * 世論スコアを計算（-100 ~ +100）
   */
  calculatePublicOpinion(): number {
    const recentPosts = this.platform.getTimeline(undefined, 50);

    let totalInfluence = 0;
    let weightedSentiment = 0;

    for (const post of recentPosts) {
      const sentimentValue = {
        'positive': 1,
        'neutral': 0,
        'negative': -1
      }[post.sentiment];

      weightedSentiment += sentimentValue * post.influence;
      totalInfluence += post.influence;
    }

    if (totalInfluence === 0) return 0;

    const opinion = (weightedSentiment / totalInfluence) * 100;
    return Math.max(-100, Math.min(100, opinion));
  }

  /**
   * タイムラインを取得
   */
  getTimeline(turn?: number, limit?: number): Post[] {
    return this.platform.getTimeline(turn, limit);
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    return this.platform.getStatistics();
  }

  /**
   * 世論が破壊AI寄りかチェック
   */
  isPublicOpinionFavoringDestruction(): boolean {
    const opinion = this.calculatePublicOpinion();
    return opinion < -30; // ネガティブが30%以上なら破壊AI有利
  }

  /**
   * 世論が保護AI寄りかチェック
   */
  isPublicOpinionFavoringProtection(): boolean {
    const opinion = this.calculatePublicOpinion();
    return opinion > 30; // ポジティブが30%以上なら保護AI有利
  }

  /**
   * 古い投稿を削除（メモリ管理）
   */
  pruneOldPosts(): void {
    this.platform.pruneOldPosts(200);
  }
}
