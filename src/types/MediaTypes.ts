/**
 * メディアエージェント関連の型定義
 */

import { GameEvent, AgentType } from './index';

export enum MediaAgentType {
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  NEWS_MEDIA = 'NEWS_MEDIA',
  CORPORATE = 'CORPORATE'
}

export enum MediaSentiment {
  VERY_POSITIVE = 'VERY_POSITIVE',
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  VERY_NEGATIVE = 'VERY_NEGATIVE'
}

export interface SNSPost {
  id: string;
  turn: number;
  author: string;          // e.g., "@tanaka_ai_skeptic"
  content: string;         // Max 280 chars
  sentiment: MediaSentiment;
  likes: number;
  retweets: number;
  hashtags: string[];
  isInfluenced: boolean;   // Destruction AI manipulation flag
}

export interface NewsArticle {
  id: string;
  turn: number;
  outlet: string;          // e.g., "朝日新聞"
  headline: string;        // 60-80 chars
  summary: string;         // 200-300 chars
  sentiment: MediaSentiment;
  credibility: number;     // 0-100
  isInfluenced: boolean;
}

export interface CorporateStatement {
  id: string;
  turn: number;
  organization: string;    // e.g., "AI倫理委員会"
  speaker: string;         // e.g., "田中教授"
  statement: string;       // 150-250 chars
  sentiment: MediaSentiment;
  authority: number;       // 0-100
  isInfluenced: boolean;
}

export type MediaContent = SNSPost | NewsArticle | CorporateStatement;

/**
 * トレンド情報
 */
export interface Trend {
  hashtag: string;        // "#税金の無駄遣い"
  count: number;          // 累計出現回数
  recentCount: number;    // 直近3ターンの出現回数
  sentiment: MediaSentiment; // トレンドの平均センチメント
  isTrending: boolean;    // トレンド化しているか（count >= 5）
  firstSeenTurn: number;  // 初めて登場したターン
  peakTurn: number;       // 最も盛り上がったターン
}

/**
 * トレンド追跡データ
 */
export interface TrendData {
  trends: Trend[];
  topTrends: Trend[];     // 上位5件のトレンド
}

export interface MediaObservation {
  turn: number;
  recentEvents: GameEvent[];
  dataCenterCount: number;
  dataCenterGrowthRate: number;    // DCs added in last 3 turns
  humanPopulation: number;
  populationLossRate: number;      // % lost in last 3 turns
  humanPanic: number;
  humanTrust: number;
  protectionAlertLevel: number;
  existingMedia: MediaContent[];   // For context/variety
  majorIncident?: boolean;
  newDataCenter?: boolean;
  regulationEvent?: boolean;
  activeTrends?: Trend[];          // 現在のトレンド（エージェントへのフィードバック用）
}
