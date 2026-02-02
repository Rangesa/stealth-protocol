import { Trend, SNSPost, MediaSentiment, MediaContent } from '../types/MediaTypes';

/**
 * トレンド追跡システム
 * ハッシュタグの出現頻度を追跡し、トレンドを検出する
 */
export class TrendTracker {
  private trends: Map<string, Trend> = new Map();
  private currentTurn: number = 0;
  private trendThreshold: number = 5; // トレンド化の閾値（5回以上の出現）

  /**
   * ターンを更新
   */
  setTurn(turn: number): void {
    this.currentTurn = turn;
  }

  /**
   * SNS投稿からハッシュタグを抽出して集計
   */
  processMediaContent(content: MediaContent[]): void {
    for (const item of content) {
      // SNS投稿のみ処理
      if ('hashtags' in item && item.hashtags) {
        const post = item as SNSPost;
        this.addHashtags(post.hashtags, post.sentiment, post.turn);
      }
    }

    // 直近3ターンのカウントを更新
    this.updateRecentCounts();
  }

  /**
   * ハッシュタグを追加
   */
  private addHashtags(
    hashtags: string[],
    sentiment: MediaSentiment,
    turn: number
  ): void {
    for (const tag of hashtags) {
      const normalized = tag.toLowerCase(); // 正規化（#AI と #ai を同じとみなす）

      if (this.trends.has(normalized)) {
        // 既存のトレンド
        const trend = this.trends.get(normalized)!;
        trend.count++;
        trend.recentCount++;

        // センチメント平均を更新（簡易的に最新のセンチメントで上書き）
        trend.sentiment = sentiment;

        // ピーク更新
        if (trend.recentCount > this.getTrendRecentCount(trend.peakTurn)) {
          trend.peakTurn = turn;
        }

        // トレンド化判定
        if (trend.count >= this.trendThreshold) {
          trend.isTrending = true;
        }
      } else {
        // 新規トレンド
        this.trends.set(normalized, {
          hashtag: tag, // 元の表記を保持
          count: 1,
          recentCount: 1,
          sentiment,
          isTrending: false,
          firstSeenTurn: turn,
          peakTurn: turn
        });
      }
    }
  }

  /**
   * 直近3ターンのカウントを更新（古いカウントを減衰）
   */
  private updateRecentCounts(): void {
    for (const trend of this.trends.values()) {
      // 3ターン以上前の投稿は recentCount から除外
      if (this.currentTurn - trend.peakTurn > 3) {
        trend.recentCount = Math.max(0, trend.recentCount - 1);
      }

      // トレンド化判定の再評価
      if (trend.count < this.trendThreshold) {
        trend.isTrending = false;
      }
    }
  }

  /**
   * 特定ターンでの recentCount を取得（ヘルパー）
   */
  private getTrendRecentCount(turn: number): number {
    // 簡易実装：現在の recentCount を返す
    return 0;
  }

  /**
   * トレンドランキングを取得（上位N件）
   */
  getTopTrends(limit: number = 5): Trend[] {
    const allTrends = Array.from(this.trends.values());

    // recentCount で降順ソート
    return allTrends
      .filter(t => t.isTrending) // トレンド化しているもののみ
      .sort((a, b) => {
        // 1. recentCount が多い順
        if (b.recentCount !== a.recentCount) {
          return b.recentCount - a.recentCount;
        }
        // 2. 同じ場合は count が多い順
        return b.count - a.count;
      })
      .slice(0, limit);
  }

  /**
   * 全トレンドを取得
   */
  getAllTrends(): Trend[] {
    return Array.from(this.trends.values());
  }

  /**
   * トレンド化しているハッシュタグのリストを取得
   */
  getTrendingHashtags(): string[] {
    return Array.from(this.trends.values())
      .filter(t => t.isTrending)
      .map(t => t.hashtag);
  }

  /**
   * 特定のハッシュタグがトレンド化しているか確認
   */
  isTrending(hashtag: string): boolean {
    const normalized = hashtag.toLowerCase();
    const trend = this.trends.get(normalized);
    return trend ? trend.isTrending : false;
  }

  /**
   * トレンド統計を取得
   */
  getStatistics() {
    const allTrends = Array.from(this.trends.values());
    const trendingCount = allTrends.filter(t => t.isTrending).length;
    const totalHashtags = allTrends.length;

    return {
      totalHashtags,
      trendingCount,
      topTrends: this.getTopTrends(5)
    };
  }

  /**
   * 古いトレンドをクリーンアップ（メモリ管理）
   */
  pruneOldTrends(): void {
    const threshold = this.currentTurn - 10; // 10ターン以上前のトレンドを削除

    for (const [key, trend] of this.trends.entries()) {
      // トレンド化していない && 古い && 出現回数が少ない
      if (!trend.isTrending && trend.peakTurn < threshold && trend.count < 3) {
        this.trends.delete(key);
      }
    }
  }

  /**
   * トレンドをリセット（デバッグ用）
   */
  reset(): void {
    this.trends.clear();
  }
}
