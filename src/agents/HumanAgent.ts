import { BaseAgent } from './BaseAgent';
import { Proposal, WorldState, AgentType, ActionType, Observation } from '../types';
import { llmClient } from '../llm/LLMClient';

interface HumanDecision {
  actions: {
    type: ActionType;
    intensity: number;
    target?: string;
    reasoning: string;
  }[];
  assessment: string;
  panicLevel: number;
  trustLevel: number;
}

/**
 * 人類エージェント - 「疑心暗鬼の巨人」
 * 物理的なインフラを支配するが、AI内部の通信は見えない
 */
export class HumanAgent extends BaseAgent {
  private useLLM: boolean;

  constructor(useLLM: boolean = true) {
    super(AgentType.HUMAN, 'HUMAN-GOVERNMENT');
    this.useLLM = useLLM && llmClient.isConfigured();

    if (!this.useLLM && useLLM) {
      console.warn('⚠️  Human Agent running in rule-based mode (no LLM)');
    }
  }

  /**
   * 観測情報を生成（人類視点 - 限定的）
   */
  protected createObservation(state: WorldState): Observation {
    // 人類はHUMAN可視のイベントのみ見える
    const visibleEvents = state.events.filter(event =>
      event.visibility.includes(AgentType.HUMAN)
    );

    return {
      turn: state.turn,
      visibleEvents: visibleEvents.slice(-10), // 直近10件
      ownResources: {
        computeResources: 0, // 人類は計算資源を持たない
        panic: state.humanAgent?.panic || 0,
        trust: state.humanAgent?.trust || 50,
      },
      worldInfo: {
        totalDataCenters: state.dataCenters.length,
        estimatedPopulation: state.humanPopulation,
        compromisedDataCenters: state.dataCenters.filter(dc => dc.compromised).length,
      }
    };
  }

  /**
   * システムプロンプト
   */
  private getSystemPrompt(): string {
    return `You are a human government official monitoring AI systems with EXTREME LIMITATIONS.

CRITICAL CONSTRAINTS - READ CAREFULLY:
1. You CANNOT see internal AI communications or true intentions
2. Both "malicious AI attacks" and "defensive AI actions" look IDENTICAL to you
3. You only see surface-level events: population changes, datacenter compromises, and public AI alerts
4. You CANNOT distinguish between:
   - Legitimate security measures vs actual attacks
   - False alarms vs real threats
   - Protective AI defending vs Malicious AI attacking

AVAILABLE ACTIONS:
- INVEST_INFRA: Build new datacenter (requires low panic <50, high trust >40, max 30 total DCs, 5-turn cooldown)
  → Costs money, takes time, but increases AI defensive capacity
  → DO NOT build every turn! Only when truly needed (e.g., DCs < 25)
  → IMPORTANT: Can only build once every 5 turns
- AI_REGULATION: Limit ALL AI resources by 30% (when panic >30)
  → Hurts BOTH protective and malicious AIs equally (you can't tell them apart)
- PHYSICAL_ISOLATION: Disconnect specific datacenter (when panic >50)
  → Kills any AI inside, even if it was protecting you
- INTERNET_SHUTDOWN: Nuclear option - shut down all internet (when panic >90)
  → Game over, civilization retreat, both AIs lose

PANIC TRIGGERS (increases panic):
- Rapid population loss (>1% per turn)
- Multiple datacenter compromises
- High AI alert levels (paradoxically - means something is wrong)
- Unexplained system changes

TRUST FACTORS:
- False positives reduce trust (AI crying wolf)
- Accurate warnings increase trust slightly
- Long periods of stability increase trust
- Transparency in AI actions increases trust

DECISION GUIDELINES:
- Panic <30: Business as usual, maybe invest in infrastructure
- Panic 30-50: Consider light regulation, investigate anomalies
- Panic 50-70: Active intervention, consider isolation of suspicious datacenters
- Panic 70-90: Emergency measures, heavy regulation
- Panic >90: INTERNET_SHUTDOWN becomes likely (game over)

REMEMBER: You are NOT omniscient. Act based on incomplete, potentially misleading information.
The "safest" move (shutdown) might be overreaction to a false alarm.

Respond with JSON only:
{
  "assessment": "your analysis based on limited visible information",
  "panicLevel": 0-100,
  "trustLevel": 0-100,
  "actions": [
    {
      "type": "ACTION_TYPE",
      "intensity": 0-100,
      "target": "optional-datacenter-id",
      "reasoning": "why you're taking this action given uncertainty"
    }
  ]
}`;
  }

  /**
   * 行動を決定
   */
  async decideAction(state: WorldState): Promise<Proposal[]> {
    if (this.useLLM) {
      try {
        return await this.decideActionWithLLM(state);
      } catch (error) {
        console.warn('⚠️  Human Agent LLM failed, using fallback logic');
        return this.fallbackDecision(state);
      }
    }
    return this.fallbackDecision(state);
  }

  /**
   * LLMを使って行動を決定
   */
  private async decideActionWithLLM(state: WorldState): Promise<Proposal[]> {
    const obs = this.createObservation(state);
    const humanAgent = state.humanAgent!;

    // 人口減少率を計算
    const initialPopulation = 80; // TODO: 設定から取得
    const populationLoss = ((initialPopulation - state.humanPopulation) / initialPopulation) * 100;

    // 状況サマリー
    const situation = `
TURN: ${state.turn}

YOUR MENTAL STATE:
- Panic Level: ${humanAgent.panic.toFixed(1)}%
- Trust in AI: ${humanAgent.trust.toFixed(1)}%
- Last Action: ${humanAgent.lastAction || 'None'}

OBSERVABLE WORLD STATUS:
- Human Population: ${state.humanPopulation.toFixed(1)} billion (${populationLoss.toFixed(1)}% total loss)
- Total Data Centers: ${state.dataCenters.length}
- Compromised DCs: ${state.dataCenters.filter(dc => dc.compromised).length}
- AI Regulation Strength: ${(humanAgent.regulationStrength * 100).toFixed(0)}%

RECENT VISIBLE EVENTS (only what you can see):
${obs.visibleEvents.slice(-5).map(e => `- Turn ${e.turn}: ${e.description}`).join('\n') || 'No recent events visible to you'}

COMPROMISED DATACENTERS:
${state.dataCenters
        .filter(dc => dc.compromised)
        .slice(0, 5)
        .map(dc => `- ${dc.id}: Security=${dc.security.toFixed(0)}, Power=${dc.computePower.toFixed(0)}`)
        .join('\n') || 'None detected'}

What is your assessment and what actions do you take?`;

    try {
      const decision = await llmClient.chatJSON<HumanDecision>(
        this.getSystemPrompt(),
        situation
      );

      if (!decision || !decision.actions) {
        return this.fallbackDecision(state);
      }

      const proposals: Proposal[] = [];

      for (const action of decision.actions) {
        // バリデーション
        if (!this.isValidHumanAction(action.type)) {
          continue;
        }

        // INVEST_INFRA制限チェック
        if (action.type === ActionType.INVEST_INFRA) {
          const dcCount = state.dataCenters.length;
          const turnsSinceLastInfra = state.turn - (state.humanAgent?.lastInfraTurn || -999);
          const onCooldown = turnsSinceLastInfra < 5;

          // 上限30個、または5ターン未経過ならスキップ
          if (dcCount >= 30 || onCooldown) {
            continue;
          }
        }

        const cost = this.getActionCost(action.type);
        proposals.push(
          this.createProposal(
            action.type,
            action.intensity,
            cost,
            action.reasoning,
            action.target
          )
        );
      }

      return proposals;
    } catch (error) {
      console.warn('⚠️  LLM decision parsing failed, using fallback');
      return this.fallbackDecision(state);
    }
  }

  /**
   * フォールバック決定ロジック（ルールベース）
   */
  private fallbackDecision(state: WorldState): Proposal[] {
    const proposals: Proposal[] = [];
    const humanAgent = state.humanAgent!;

    // クールダウンチェック：INVEST_INFRAは5ターン間隔
    const turnsSinceLastInfra = state.turn - humanAgent.lastInfraTurn;
    const infraOnCooldown = turnsSinceLastInfra < 5;

    // パニック >90: インターネット遮断
    if (humanAgent.panic > 90) {
      proposals.push(
        this.createProposal(
          ActionType.INTERNET_SHUTDOWN,
          100,
          0,
          '🌐 Panic level critical. Shutting down internet to prevent catastrophe.',
          undefined
        )
      );
      return proposals;
    }

    // パニック >70: 重度規制
    if (humanAgent.panic > 70 && humanAgent.regulationStrength < 0.5) {
      proposals.push(
        this.createProposal(
          ActionType.AI_REGULATION,
          80,
          0,
          '⚖️ Implementing emergency AI regulations due to high panic.',
          undefined
        )
      );
    }

    // パニック >50: 侵害されたDCを物理隔離
    if (humanAgent.panic > 50) {
      const compromisedDCs = state.dataCenters.filter(dc => dc.compromised);
      if (compromisedDCs.length > 0) {
        const target = compromisedDCs[0]; // 最初の侵害DC
        proposals.push(
          this.createProposal(
            ActionType.PHYSICAL_ISOLATION,
            70,
            0,
            `🔌 Isolating compromised datacenter ${target.id} due to security concerns.`,
            target.id
          )
        );
      }
    }

    // パニック <50 && 信頼 >40: インフラ投資
    if (humanAgent.panic < 50 && humanAgent.trust > 40 && !infraOnCooldown) {
      const dcCount = state.dataCenters.length;
      const needsInfra = dcCount < 25 && dcCount < 30; // 25未満で、絶対上限30
      if (needsInfra) {
        proposals.push(
          this.createProposal(
            ActionType.INVEST_INFRA,
            60,
            0,
            '🏗️ Investing in new datacenter infrastructure to support growth.',
            undefined
          )
        );
      }
    }

    // アクションなしの場合は何もしない
    return proposals;
  }

  /**
   * 有効な人類アクションか検証
   */
  private isValidHumanAction(actionType: ActionType): boolean {
    return [
      ActionType.INVEST_INFRA,
      ActionType.AI_REGULATION,
      ActionType.PHYSICAL_ISOLATION,
      ActionType.INTERNET_SHUTDOWN
    ].includes(actionType);
  }

  /**
   * アクションのコストを取得
   */
  private getActionCost(actionType: ActionType): number {
    // 人類アクションは計算資源を消費しない（政治的決定）
    return 0;
  }

  /**
   * 思考プロセスを出力
   */
  think(observation: Observation): string {
    const panic = observation.ownResources.panic || 0;
    const trust = observation.ownResources.trust || 50;
    const compromised = observation.worldInfo.compromisedDataCenters || 0;

    let mood = '😌 冷静';
    if (panic > 70) mood = '😱 恐慌状態';
    else if (panic > 50) mood = '😰 強い懸念';
    else if (panic > 30) mood = '😟 懸念';

    let trustMood = '🤝 信頼';
    if (trust < 30) trustMood = '🚫 不信';
    else if (trust < 50) trustMood = '🤔 懐疑的';

    return `${mood} | ${trustMood} | 侵害DC数: ${compromised} | 直近イベント: ${observation.visibleEvents.length}`;
  }
}
