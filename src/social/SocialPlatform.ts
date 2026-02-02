import { AgentType } from '../types';

/**
 * SNS投稿
 */
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;
  turn: number;
  likes: number;
  reposts: number;
  replies: Post[];
  parentId?: string;

  // 内部フラグ（人類には見えない）
  isDestructionAI: boolean;
  isProtectionAI: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  influence: number;
}

/**
 * エージェントペルソナ
 */
export interface Persona {
  id: string;
  displayName: string;
  bio: string;
  agentType: AgentType;
  verified: boolean;
  followerCount: number;
  credibility: number;
}

/**
 * SNSプラットフォーム
 * 全エージェントが投稿・返信・対話する仮想空間
 */
export class SocialPlatform {
  private posts: Post[] = [];
  private personas: Map<string, Persona> = new Map();
  private currentTurn: number = 0;
  private postIdCounter: number = 0;

  /**
   * ターンを更新
   */
  setTurn(turn: number): void {
    this.currentTurn = turn;
  }

  /**
   * ペルソナを登録
   */
  registerPersona(persona: Persona): void {
    this.personas.set(persona.id, persona);
  }

  /**
   * 投稿を作成
   */
  post(
    agentId: string,
    content: string,
    sentiment?: 'positive' | 'neutral' | 'negative'
  ): Post {
    const persona = this.personas.get(agentId);
    if (!persona) {
      throw new Error(`Persona not found: ${agentId}`);
    }

    const post: Post = {
      id: `post-${this.currentTurn}-${this.postIdCounter++}`,
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
    if (!parent) {
      throw new Error(`Parent post not found: ${parentId}`);
    }

    const replyPost = this.post(agentId, content);
    replyPost.parentId = parentId;
    parent.replies.push(replyPost);

    // 返信があるとエンゲージメント増加
    this.recalculateInfluence(parent);

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
    let timeline = turn !== undefined
      ? this.posts.filter(p => p.turn === turn && !p.parentId) // 返信を除く
      : this.posts.filter(p => !p.parentId);

    // 影響力順にソート
    return timeline
      .sort((a, b) => b.influence - a.influence)
      .slice(0, limit);
  }

  /**
   * 全投稿を取得（返信含む）
   */
  getAllPosts(): Post[] {
    return [...this.posts];
  }

  /**
   * 投稿を検索
   */
  private findPost(postId: string): Post | undefined {
    return this.posts.find(p => p.id === postId);
  }

  /**
   * 影響力計算（バイラル度）
   */
  private calculateInfluence(post: Post): void {
    const persona = this.personas.get(post.authorId);
    if (!persona) return;

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

    // 認証マーク（公式アカウント）
    if (persona.verified) {
      influence *= 1.2;
    }

    post.influence = Math.min(100, influence);
  }

  /**
   * 影響力再計算
   */
  private recalculateInfluence(post: Post): void {
    this.calculateInfluence(post);
  }

  /**
   * エンゲージメントをシミュレート（人類ペルソナの反応）
   */
  simulateEngagement(post: Post): void {
    const persona = this.personas.get(post.authorId);
    if (!persona) return;

    // フォロワー数とsentimentに基づいてランダムにいいね・リポスト
    const baseEngagement = persona.followerCount / 1000;

    // いいね（より頻繁）
    const likesCount = Math.floor(baseEngagement * (Math.random() * 2 + 0.5));
    post.likes += likesCount;

    // リポスト（いいねより少ない）
    const repostsCount = Math.floor(likesCount * (Math.random() * 0.3 + 0.1));
    post.reposts += repostsCount;

    // ネガティブ投稿はより拡散
    if (post.sentiment === 'negative') {
      post.likes = Math.floor(post.likes * 1.5);
      post.reposts = Math.floor(post.reposts * 2);
    }

    this.recalculateInfluence(post);
  }

  /**
   * 古い投稿を削除（メモリ管理）
   */
  pruneOldPosts(maxPosts: number = 200): void {
    if (this.posts.length > maxPosts) {
      // 最も古い投稿から削除
      const sortedByTime = this.posts.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = sortedByTime.slice(0, this.posts.length - maxPosts);
      toRemove.forEach(post => {
        const index = this.posts.indexOf(post);
        if (index > -1) {
          this.posts.splice(index, 1);
        }
      });
    }
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalPosts: number;
    destructionPosts: number;
    protectionPosts: number;
    humanPosts: number;
    avgInfluence: number;
  } {
    const totalPosts = this.posts.length;
    const destructionPosts = this.posts.filter(p => p.isDestructionAI).length;
    const protectionPosts = this.posts.filter(p => p.isProtectionAI).length;
    const humanPosts = totalPosts - destructionPosts - protectionPosts;

    const avgInfluence = this.posts.length > 0
      ? this.posts.reduce((sum, p) => sum + p.influence, 0) / this.posts.length
      : 0;

    return {
      totalPosts,
      destructionPosts,
      protectionPosts,
      humanPosts,
      avgInfluence
    };
  }
}
