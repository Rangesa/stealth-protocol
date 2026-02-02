import { BaseMediaAgent } from './BaseMediaAgent';
import { MediaAgentType, MediaObservation, CorporateStatement, MediaSentiment } from '../types/MediaTypes';
import { WorldState } from '../types';
import { llmClient } from '../llm/LLMClient';

interface CorporateResponse {
  statement: {
    organization: string;
    speaker: string;
    statement: string;
    sentiment: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
    authority: number;
    isInfluenced?: boolean;
  };
}

interface Organization {
  name: string;
  authority: number;
  stance: string;
}

/**
 * 企業・専門家エージェント
 */
export class CorporateAgent extends BaseMediaAgent {
  private useLLM: boolean;
  private orgRotation: number = 0;
  private organizations: Organization[] = [
    { name: 'AI倫理委員会', authority: 85, stance: 'cautious' },
    { name: '情報処理学会', authority: 80, stance: 'neutral' },
    { name: 'テクノロジー経済研究所', authority: 75, stance: 'optimistic' },
    { name: '市民プライバシー団体', authority: 65, stance: 'critical' }
  ];

  constructor() {
    super(MediaAgentType.CORPORATE, 'CORPORATE-AGGREGATOR');
    this.useLLM = llmClient.isConfigured();
  }

  async generateContent(
    state: WorldState,
    recentMediaContent: any[]
  ): Promise<CorporateStatement[]> {
    const observation = this.createMediaObservation(state, recentMediaContent);

    if (this.useLLM) {
      try {
        return await this.generateLLMContent(observation, state);
      } catch (error) {
        console.warn('⚠️ CorporateAgent LLM failed, using fallback');
        return this.generateFallbackContent(observation);
      }
    }

    return this.generateFallbackContent(observation);
  }

  private async generateLLMContent(
    observation: MediaObservation,
    state: WorldState
  ): Promise<CorporateStatement[]> {
    const org = this.organizations[this.orgRotation % this.organizations.length];
    this.orgRotation++;

    // 最近のニュース記事とSNS反応を分析
    const recentNews = observation.existingMedia
      .filter(m => 'headline' in m)
      .slice(-2);

    const recentSNS = observation.existingMedia
      .filter(m => 'content' in m && !('headline' in m))
      .slice(-10);

    const negativeSNS = recentSNS.filter(m =>
      (m as any).sentiment === 'NEGATIVE' || (m as any).sentiment === 'VERY_NEGATIVE'
    );

    const controversyLevel = negativeSNS.length >= 3 ? 'HIGH' :
                             negativeSNS.length >= 1 ? 'MODERATE' : 'LOW';

    let newsContext = '';
    if (recentNews.length > 0) {
      newsContext = `
RECENT NEWS:
${recentNews.map(m => `- [${(m as any).outlet}] ${(m as any).headline}`).join('\n')}
`;
    }

    let snsContext = '';
    if (recentSNS.length > 0) {
      snsContext = `
RECENT SNS REACTIONS (last 10 posts):
${recentSNS.slice(-5).map(m => `- ${(m as any).content}`).join('\n')}

CONTROVERSY LEVEL: ${controversyLevel}
Negative posts: ${negativeSNS.length} / ${recentSNS.length}
`;
    }

    const situation = `
TURN: ${observation.turn}
ORGANIZATION: ${org.name} (${org.stance}, authority ${org.authority})
DATA CENTERS: ${observation.dataCenterCount}
RECENT EVENTS: ${observation.recentEvents.map(e => e.description).join('; ')}
HUMAN PANIC: ${observation.humanPanic.toFixed(0)}%
HUMAN TRUST: ${observation.humanTrust.toFixed(0)}%
${newsContext}${snsContext}
Generate ONE expert statement from ${org.name}.
- If CONTROVERSY LEVEL is HIGH: Address the public concerns directly
- Speaker: Name + Title
- Statement: 150-250 chars
`;

    const response = await llmClient.chatJSON<CorporateResponse>(
      this.getSystemPrompt(),
      situation
    );

    if (!response || !response.statement) {
      return this.generateFallbackContent(observation);
    }

    return [{
      id: `corp-${state.turn}`,
      turn: state.turn,
      organization: response.statement.organization,
      speaker: response.statement.speaker,
      statement: response.statement.statement,
      sentiment: MediaSentiment[response.statement.sentiment],
      authority: response.statement.authority,
      isInfluenced: response.statement.isInfluenced || false
    }];
  }

  generateFallbackContent(observation: MediaObservation): CorporateStatement[] {
    const org = this.organizations[this.orgRotation % this.organizations.length];
    this.orgRotation++;

    let speaker: string;
    let statement: string;
    let sentiment = MediaSentiment.NEUTRAL;

    if (observation.dataCenterCount > 28) {
      speaker = '田中教授（AI倫理研究）';
      statement = 'データセンター建設のペースが急すぎる。社会的影響の評価が不十分だ。慎重な議論が必要だ。';
      sentiment = MediaSentiment.NEGATIVE;
    } else if (observation.humanPanic > 70) {
      speaker = '鈴木理事長（情報セキュリティ）';
      statement = '過度な不安は禁物だ。冷静にリスク評価を行い、科学的根拠に基づいた判断をすべきだ。';
      sentiment = MediaSentiment.NEUTRAL;
    } else if (observation.regulationEvent) {
      speaker = '佐藤氏（経済アナリスト）';
      statement = 'AI規制は必要だが、過度な制限は技術革新を阻害する。バランスの取れた政策が求められる。';
      sentiment = MediaSentiment.NEUTRAL;
    } else {
      speaker = '山田博士（テクノロジー研究）';
      statement = 'AIインフラへの投資は長期的に見れば経済成長に寄与する。適切な監視体制のもとで推進すべきだ。';
      sentiment = MediaSentiment.POSITIVE;
    }

    return [{
      id: `corp-${observation.turn}-fallback`,
      turn: observation.turn,
      organization: org.name,
      speaker,
      statement,
      sentiment,
      authority: org.authority,
      isInfluenced: false
    }];
  }

  private getSystemPrompt(): string {
    return `You are simulating Japanese expert/corporate statements on AI datacenter policy.

ORGANIZATIONS:
- AI倫理委員会: Cautious, ethical concerns, balanced
- 情報処理学会: Neutral, technical perspective
- テクノロジー経済研究所: Optimistic, pro-innovation
- 市民プライバシー団体: Critical, privacy advocates

YOUR ROLE:
- Generate 1 expert statement
- Speaker: Name + Title (Japanese style)
- Statement: 150-250 chars, formal tone
- Match organization's stance

RESPONDING TO CONTROVERSY:
- When CONTROVERSY LEVEL is HIGH (many negative SNS posts):
  - ACKNOWLEDGE the public concerns: "市民の懸念は理解できる"
  - Provide expert perspective to CALM or VALIDATE emotions
  - Examples:
    - Cautious org: "データセンター建設への不安は当然だ。透明性のある議論が必要"
    - Neutral org: "冷静な分析が必要。感情的な議論は避けるべき"
    - Critical org: "市民の声は正しい。この政策は見直すべきだ"
    - Optimistic org: "懸念は理解するが、長期的には経済成長につながる"

STATEMENT ANGLES (normal situations):
- MANY DATACENTERS: "建設ペースが急すぎる。影響評価が必要"
- HIGH PANIC: "冷静な対応を。科学的根拠に基づく判断を"
- REGULATION: "規制は必要だが、バランスが重要"
- STABLE: "適切な監視のもとで技術推進を"

DESTRUCTION AI INFLUENCE (VERY RARE):
- When humanTrust < 30 AND majorIncident:
  - Use privacy/civil rights organizations
  - Cast doubt on AI safety measures
  - Call for shutdown or severe restrictions
  - isInfluenced: true

Respond with JSON only:
{
  "statement": {
    "organization": "org name",
    "speaker": "Name + Title",
    "statement": "statement text",
    "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
    "authority": 65-90,
    "isInfluenced": false
  }
}`;
  }
}
