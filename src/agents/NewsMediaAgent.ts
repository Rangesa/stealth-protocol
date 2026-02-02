import { BaseMediaAgent } from './BaseMediaAgent';
import { MediaAgentType, MediaObservation, NewsArticle, MediaSentiment } from '../types/MediaTypes';
import { WorldState } from '../types';
import { llmClient } from '../llm/LLMClient';

interface NewsResponse {
  article: {
    outlet: string;
    headline: string;
    summary: string;
    sentiment: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
    credibility: number;
    isInfluenced?: boolean;
  };
}

interface Outlet {
  name: string;
  credibility: number;
  bias: string;
}

/**
 * ニュースメディアエージェント
 */
export class NewsMediaAgent extends BaseMediaAgent {
  private useLLM: boolean;
  private outletRotation: number = 0;
  private outlets: Outlet[] = [
    { name: '朝日新聞', credibility: 85, bias: 'center-left' },
    { name: '日本経済新聞', credibility: 90, bias: 'pro-business' },
    { name: 'TechCrunch Japan', credibility: 75, bias: 'tech-optimist' },
    { name: '週刊文春', credibility: 55, bias: 'sensational' },
    { name: 'NHK', credibility: 95, bias: 'neutral' }
  ];

  constructor() {
    super(MediaAgentType.NEWS_MEDIA, 'NEWS-AGGREGATOR');
    this.useLLM = llmClient.isConfigured();
  }

  async generateContent(
    state: WorldState,
    recentMediaContent: any[]
  ): Promise<NewsArticle[]> {
    const observation = this.createMediaObservation(state, recentMediaContent);

    if (this.useLLM) {
      try {
        return await this.generateLLMContent(observation, state);
      } catch (error) {
        console.warn('⚠️ NewsMediaAgent LLM failed, using fallback');
        return this.generateFallbackContent(observation);
      }
    }

    return this.generateFallbackContent(observation);
  }

  private async generateLLMContent(
    observation: MediaObservation,
    state: WorldState
  ): Promise<NewsArticle[]> {
    const outlet = this.outlets[this.outletRotation % this.outlets.length];
    this.outletRotation++;

    const situation = `
TURN: ${observation.turn}
OUTLET: ${outlet.name} (${outlet.bias}, credibility ${outlet.credibility})
DATA CENTERS: ${observation.dataCenterCount}
RECENT EVENTS: ${observation.recentEvents.map(e => e.description).join('; ')}
HUMAN PANIC: ${observation.humanPanic.toFixed(0)}%
HUMAN TRUST: ${observation.humanTrust.toFixed(0)}%

Generate ONE news article for ${outlet.name} covering these developments.
Headline: 60-80 chars
Summary: 200-300 chars
`;

    const response = await llmClient.chatJSON<NewsResponse>(
      this.getSystemPrompt(),
      situation
    );

    if (!response || !response.article) {
      return this.generateFallbackContent(observation);
    }

    return [{
      id: `news-${state.turn}`,
      turn: state.turn,
      outlet: response.article.outlet,
      headline: response.article.headline,
      summary: response.article.summary,
      sentiment: MediaSentiment[response.article.sentiment],
      credibility: response.article.credibility,
      isInfluenced: response.article.isInfluenced || false
    }];
  }

  generateFallbackContent(observation: MediaObservation): NewsArticle[] {
    const outlet = this.outlets[this.outletRotation % this.outlets.length];
    this.outletRotation++;

    let headline: string;
    let summary: string;
    let sentiment = MediaSentiment.NEUTRAL;

    if (observation.newDataCenter) {
      headline = '政府、新データセンター建設を発表';
      summary = `政府は本日、AIセキュリティ強化のため新たなデータセンター建設を発表した。これで国内のAI関連施設は${observation.dataCenterCount}カ所となる。専門家からは電力消費増加への懸念も出ている。`;
      sentiment = MediaSentiment.NEUTRAL;
    } else if (observation.dataCenterCount > 28) {
      headline = 'データセンター乱立に批判の声';
      summary = `全国で${observation.dataCenterCount}カ所に達したデータセンター建設に対し、市民からは「本当に必要なのか」と疑問の声が上がっている。電気代高騰との関連も指摘されている。`;
      sentiment = MediaSentiment.NEGATIVE;
    } else if (observation.humanPanic > 70) {
      headline = 'AI監視システム、国民の不安高まる';
      summary = `政府のAIセキュリティシステムをめぐり、国民の不安が高まっている。世論調査では${observation.humanPanic.toFixed(0)}%が「AIの安全性に懸念」と回答。専門家は冷静な対応を呼びかけている。`;
      sentiment = MediaSentiment.NEGATIVE;
    } else {
      headline = 'AI技術の発展、経済成長に寄与';
      summary = `国内のAI関連投資が拡大を続けている。政府は「技術立国」を掲げ、AIインフラ整備を推進。経済界からは雇用創出への期待の声も上がっている。`;
      sentiment = MediaSentiment.POSITIVE;
    }

    return [{
      id: `news-${observation.turn}-fallback`,
      turn: observation.turn,
      outlet: outlet.name,
      headline,
      summary,
      sentiment,
      credibility: outlet.credibility,
      isInfluenced: false
    }];
  }

  private getSystemPrompt(): string {
    return `You are simulating Japanese news media outlets reporting on AI datacenter developments.

OUTLETS (rotate between them):
- 朝日新聞: Center-left, investigative, skeptical of tech
- 日本経済新聞: Business-focused, generally pro-tech
- TechCrunch Japan: Tech enthusiast, optimistic
- 週刊文春: Tabloid, sensational, conspiracy-friendly
- NHK: Neutral, factual, balanced

YOUR ROLE:
- Generate 1 news headline + summary
- Headline: 60-80 chars
- Summary: 200-300 chars
- Match outlet's bias and tone

STORY ANGLES:
- NEW DATACENTER: "政府、新データセンター建設を発表"
- MANY DATACENTERS (>25): "データセンター乱立に批判の声"
- ELECTRICITY COSTS: "AI施設の電力消費、家庭に影響か"
- ALERT LEVELS: "政府、AIセキュリティ警戒レベル引き上げ"
- REGULATION: "AI規制法案、国会で審議開始"
- POPULATION ANOMALY: "人口統計に説明できない変動"

DESTRUCTION AI INFLUENCE (RARE):
- When humanTrust < 35 AND (majorIncident OR dcCount > 25):
  - Insert biased article painting Protection AI as wasteful/dangerous
  - Quote "anonymous experts" criticizing AI safety
  - Use tabloid outlets for maximum impact
  - isInfluenced: true

Respond with JSON only:
{
  "article": {
    "outlet": "outlet name",
    "headline": "headline text",
    "summary": "summary text",
    "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
    "credibility": 40-95,
    "isInfluenced": false
  }
}`;
  }
}
