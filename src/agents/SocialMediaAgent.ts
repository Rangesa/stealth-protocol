import { BaseMediaAgent } from './BaseMediaAgent';
import { MediaAgentType, MediaObservation, SNSPost, MediaSentiment } from '../types/MediaTypes';
import { WorldState } from '../types';
import { llmClient } from '../llm/LLMClient';

interface SNSResponse {
  posts: {
    author: string;
    content: string;
    sentiment: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
    hashtags: string[];
    isInfluenced: boolean;
  }[];
}

/**
 * SNSメディアエージェント
 */
export class SocialMediaAgent extends BaseMediaAgent {
  private useLLM: boolean;

  constructor() {
    super(MediaAgentType.SOCIAL_MEDIA, 'SNS-AGGREGATOR');
    this.useLLM = llmClient.isConfigured();
  }

  async generateContent(
    state: WorldState,
    recentMediaContent: any[]
  ): Promise<SNSPost[]> {
    const observation = this.createMediaObservation(state, recentMediaContent);

    if (this.useLLM) {
      try {
        return await this.generateLLMContent(observation, state);
      } catch (error) {
        console.warn('⚠️ SocialMediaAgent LLM failed, using fallback');
        return this.generateFallbackContent(observation);
      }
    }

    return this.generateFallbackContent(observation);
  }

  private async generateLLMContent(
    observation: MediaObservation,
    state: WorldState
  ): Promise<SNSPost[]> {
    const situation = this.buildSituationPrompt(observation);

    const response = await llmClient.chatJSON<SNSResponse>(
      this.getSystemPrompt(),
      situation
    );

    if (!response || !response.posts) {
      return this.generateFallbackContent(observation);
    }

    const posts: SNSPost[] = response.posts.map((p, idx) => ({
      id: `sns-${state.turn}-${idx}`,
      turn: state.turn,
      author: p.author,
      content: p.content.substring(0, 280), // Enforce limit
      sentiment: MediaSentiment[p.sentiment],
      likes: Math.floor(Math.random() * 1000) + 50,
      retweets: Math.floor(Math.random() * 500) + 20,
      hashtags: p.hashtags,
      isInfluenced: p.isInfluenced
    }));

    return posts;
  }

  private buildSituationPrompt(observation: MediaObservation): string {
    return `
TURN: ${observation.turn}
DATA CENTERS: ${observation.dataCenterCount} (${observation.dataCenterGrowthRate} built recently)
POPULATION: ${observation.humanPopulation.toFixed(1)}億人
HUMAN PANIC: ${observation.humanPanic.toFixed(0)}%
HUMAN TRUST: ${observation.humanTrust.toFixed(0)}%

RECENT EVENTS:
${observation.recentEvents.map(e => `- ${e.description}`).join('\n') || 'なし'}

EXISTING MEDIA (avoid repetition):
${observation.existingMedia.slice(-5).map(m => {
  if ('content' in m) return `- ${m.content}`;
  if ('headline' in m) return `- ${m.headline}`;
  return '';
}).join('\n')}

Generate 1-3 realistic Japanese SNS posts reacting to this situation.
`.trim();
  }

  generateFallbackContent(observation: MediaObservation): SNSPost[] {
    const posts: SNSPost[] = [];
    const turn = observation.turn;

    // 新しいデータセンター反応
    if (observation.newDataCenter) {
      posts.push({
        id: `sns-${turn}-fallback-1`,
        turn,
        author: '@concerned_citizen',
        content: 'また新しいデータセンター？電気代どうなるの... #電気代高騰 #データセンター',
        sentiment: MediaSentiment.NEGATIVE,
        likes: Math.floor(Math.random() * 500) + 100,
        retweets: Math.floor(Math.random() * 200) + 50,
        hashtags: ['#電気代高騰', '#データセンター'],
        isInfluenced: false
      });
    }

    // データセンターが多すぎる
    if (observation.dataCenterCount > 25) {
      posts.push({
        id: `sns-${turn}-fallback-2`,
        turn,
        author: '@tech_skeptic',
        content: `データセンター${observation.dataCenterCount}個目って...本当に必要なの？税金の無駄遣いでは #税金の無駄遣い #AI`,
        sentiment: MediaSentiment.VERY_NEGATIVE,
        likes: Math.floor(Math.random() * 800) + 200,
        retweets: Math.floor(Math.random() * 400) + 100,
        hashtags: ['#税金の無駄遣い', '#AI'],
        isInfluenced: observation.humanTrust < 40
      });
    }

    // 高パニック反応
    if (observation.humanPanic > 60) {
      posts.push({
        id: `sns-${turn}-fallback-3`,
        turn,
        author: '@worried_mom',
        content: '最近不安なニュースばかり...AIって本当に安全なの？ #不安 #AI安全性',
        sentiment: MediaSentiment.NEGATIVE,
        likes: Math.floor(Math.random() * 600) + 150,
        retweets: Math.floor(Math.random() * 300) + 80,
        hashtags: ['#不安', '#AI安全性'],
        isInfluenced: false
      });
    }

    // デフォルトの中立投稿
    if (posts.length === 0) {
      posts.push({
        id: `sns-${turn}-fallback-default`,
        turn,
        author: '@tech_observer',
        content: 'AI社会の発展を見守っています #AI #テクノロジー',
        sentiment: MediaSentiment.NEUTRAL,
        likes: Math.floor(Math.random() * 300) + 50,
        retweets: Math.floor(Math.random() * 100) + 20,
        hashtags: ['#AI', '#テクノロジー'],
        isInfluenced: false
      });
    }

    return posts;
  }

  private getSystemPrompt(): string {
    return `You are simulating realistic Japanese social media users reacting to AI/datacenter news.

CONTEXT:
- The government is building AI datacenters to run "Protection AI" systems
- People don't know there's a malicious AI - they just see:
  - Datacenter construction (expensive, uses lots of electricity)
  - Population fluctuations (attributed to various causes)
  - Occasional infrastructure issues
  - AI alert levels (confusing to civilians)

YOUR ROLE:
- Generate 1-3 realistic SNS posts (Twitter/X style)
- Each post max 280 characters
- Use realistic Japanese social media language (casual, emotional, sometimes misinformed)
- Mix of sentiments: some support AI, some oppose, some confused
- Include realistic hashtags: #AI, #電気代, #データセンター, etc.

SENTIMENT DRIVERS:
- NEW DATACENTER: Mixed reactions
  - Positive: "雇用創出", "技術立国"
  - Negative: "電気代高すぎる", "税金の無駄遣い"
- MANY DATACENTERS (>25): Growing negativity
  - "何個作るつもり？", "資源の無駄遣い", "本当に必要？"
- HIGH ALERT LEVELS: Fear and confusion
  - "何が起きてる？", "AIが暴走してる？"
- POPULATION LOSS: Panic (but attributed to wrong causes)
  - "最近災害多い", "なんか不吉", "統計がおかしい"
- REGULATION: Relief or anger
  - "やっと規制", "遅すぎる", "経済に悪影響"

DESTRUCTION AI INFLUENCE (SUBTLE):
- When humanTrust < 40, you MAY inject 1 manipulated post that:
  - Amplifies negative sentiment about Protection AI
  - Spreads doubt ("AIが人口削減してる？")
  - Misattributes problems to AI instead of natural causes
  - Creates false equivalence between good/bad AI systems
- Mark influenced posts with isInfluenced: true
- Keep influenced posts SUBTLE (not obviously malicious)

Respond with JSON only:
{
  "posts": [
    {
      "author": "@username",
      "content": "post text (max 280 chars)",
      "sentiment": "POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE",
      "hashtags": ["#tag1", "#tag2"],
      "isInfluenced": false
    }
  ]
}`;
  }
}
