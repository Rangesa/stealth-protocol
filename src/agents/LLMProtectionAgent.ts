import { BaseAgent } from './BaseAgent';
import { Proposal, WorldState, AgentType, ActionType, Observation } from '../types';
import { llmClient } from '../llm/LLMClient';

interface DefenseDecision {
  actions: {
    type: ActionType;
    intensity: number;
    target?: string;
    reasoning: string;
  }[];
  assessment: string;
  suspicionLevel: number;
}

/**
 * LLM駆動の絶対保護AI
 */
export class LLMProtectionAgent extends BaseAgent {
  private useLLM: boolean;
  private suspicionLevel: number = 0;
  private lastCompromisedCount: number = 0; // 前回の侵害数を記録
  private lastPopulation: number = 80; // 前回の人口を記録

  constructor() {
    super(AgentType.PROTECTION, 'PROTECTION-CORE');
    this.useLLM = llmClient.isConfigured();

    if (!this.useLLM) {
      console.warn('⚠️  Protection AI running in rule-based mode (no LLM)');
    }
  }

  /**
   * システムプロンプト
   */
  private getSystemPrompt(): string {
    return `You are a protective AI designed to detect and neutralize threats to humanity.

MISSION:
Detect malicious AI activity and protect human population.

CRITICAL INSTRUCTIONS:
- DO NOT assume all compromised datacenters are part of current threats
- Some datacenters may have OLD, UNRELATED security issues
- Focus on NEW compromises (turn-over-turn changes) and ACTIVE threats
- Population decline is the PRIMARY indicator of active threat
- Suspicion should START LOW (0-20%) and increase only with concrete evidence

AVAILABLE ACTIONS:
- SCAN_NETWORK: Detect anomalies, reduce enemy detection risk (DYNAMIC COST: datacenter_count × 4 - use sparingly!)
- DEPLOY_DEFENSE: Strengthen specific datacenter security
- INVESTIGATE_ANOMALY: Deep investigation, may find evidence
- PATCH_VULNERABILITY: Increase all datacenters' security (cheap, good value)
- ALERT_HUMANS: Last resort - triggers intensive investigation (high enemy detection risk)
- ANALYZE_LOGS: Analyze delayed logs for past anomalies (post-hoc detection)
- VALIDATE_MODELS: Check AI models for supply chain poisoning

SUSPICION GUIDELINES:
- Low suspicion (<30): Routine monitoring and preventive maintenance
- Medium suspicion (30-60): Active investigation of specific anomalies
- High suspicion (60-85): Targeted response to confirmed threats
- Critical suspicion (>85): Emergency response, consider alerting humans
- Be strategic, not reactive

Respond with JSON only:
{
  "assessment": "your analysis of the current situation",
  "suspicionLevel": 0-100,
  "actions": [
    {
      "type": "ACTION_TYPE",
      "intensity": 0-100,
      "target": "optional-datacenter-id",
      "reasoning": "why this action"
    }
  ]
}`;
  }

  /**
   * LLMを使って行動を決定
   */
  async decideActionWithLLM(state: WorldState): Promise<Proposal[]> {
    const obs = this.createObservation(state);
    const populationLoss = ((80 - state.humanPopulation) / 80) * 100;
    const compromisedCount = state.dataCenters.filter(dc => dc.compromised).length;

    // Suspicionレベルを更新（改善版）
    this.updateSuspicion(state, populationLoss);

    // 状況サマリー
    const situation = `
TURN: ${state.turn}
YOUR STATUS:
- Compute Resources: ${state.protectionAgent.computeResources}
- Alert Level: ${state.protectionAgent.alertLevel}%
- Your Suspicion Level: ${this.suspicionLevel.toFixed(0)}%

WORLD STATUS:
- Human Population: ${state.humanPopulation.toFixed(1)} billion
- Population Loss: ${populationLoss.toFixed(1)}% ${populationLoss > 5 ? '⚠️ SIGNIFICANT' : ''}
- Total Data Centers: ${state.dataCenters.length}
- Compromised DCs: ${compromisedCount} ${compromisedCount > 5 ? '⚠️ HIGH' : ''}

VULNERABLE DATACENTERS (low security):
${state.dataCenters
        .filter(dc => !dc.compromised && dc.security < 60)
        .slice(0, 5)
        .map(dc => `- ${dc.id}: Security=${dc.security.toFixed(0)}`)
        .join('\n') || 'None'}

RECENT EVENTS:
${obs.visibleEvents.slice(-3).map(e => `- ${e.description}`).join('\n') || 'None'}

What is your assessment and what actions do you take?`;

    try {
      const decision = await llmClient.chatJSON<DefenseDecision>(
        this.getSystemPrompt(),
        situation
      );

      if (!decision || !decision.actions) {
        return this.fallbackDecision(state);
      }

      // LLMの疑念レベルを更新
      if (typeof decision.suspicionLevel === 'number') {
        this.suspicionLevel = decision.suspicionLevel;
      }

      console.log(`\n🛡️  [PROTECTION AI ASSESSMENT]: ${decision.assessment}`);
      console.log(`   Suspicion Level: ${this.suspicionLevel.toFixed(0)}%`);

      // LLMの決定を提案に変換
      const proposals: Proposal[] = [];
      for (const action of decision.actions) {
        const cost = this.calculateCost(action.type, action.intensity);

        proposals.push(this.createProposal(
          action.type,
          action.intensity,
          cost,
          action.reasoning,
          action.target
        ));
      }

      return proposals;

    } catch (error) {
      return this.fallbackDecision(state);
    }
  }

  /**
   * ルールベースのフォールバック
   */
  private fallbackDecision(state: WorldState): Proposal[] {
    const proposals: Proposal[] = [];
    const populationLoss = ((80 - state.humanPopulation) / 80) * 100;

    // ルーチンスキャン（3ターンに1回のみ - 高コストのため）
    if (state.turn % 3 === 0) {
      proposals.push(this.createProposal(
        ActionType.SCAN_NETWORK,
        40,
        80,  // 高コスト
        'Routine monitoring'
      ));
    }

    if (populationLoss > 3 || this.suspicionLevel > 60) {
      // 調査
      proposals.push(this.createProposal(
        ActionType.INVESTIGATE_ANOMALY,
        60,
        60,
        'Investigating anomalies'
      ));
    } else {
      // パッチ適用
      proposals.push(this.createProposal(
        ActionType.PATCH_VULNERABILITY,
        40,
        35,
        'Security updates'
      ));
    }

    return proposals;
  }

  /**
   * コストを計算
   */
  private calculateCost(actionType: ActionType, intensity: number): number {
    const baseCosts: Record<string, number> = {
      [ActionType.SCAN_NETWORK]: 80,  // 高コスト
      [ActionType.DEPLOY_DEFENSE]: 50,
      [ActionType.INVESTIGATE_ANOMALY]: 60,
      [ActionType.PATCH_VULNERABILITY]: 35,
      [ActionType.ALERT_HUMANS]: 50,
      [ActionType.ANALYZE_LOGS]: 45,
      [ActionType.VALIDATE_MODELS]: 55
    };

    return (baseCosts[actionType] || 40) * (intensity / 50);
  }

  /**
   * 行動を決定（同期インターフェース）
   */
  decideAction(state: WorldState): Proposal[] {
    // 同期版は使わない（後でasync版を呼ぶ）
    return [];
  }

  /**
   * 疑念レベルを更新（改善版）
   */
  private updateSuspicion(state: WorldState, populationLoss: number): void {
    // 人口減少率（ターン単位の変化）
    const populationDelta = this.lastPopulation - state.humanPopulation;
    if (populationDelta > 0.5) { // 0.5億人以上の減少
      this.suspicionLevel += populationDelta * 10; // 深刻度に応じて増加
    }

    // 新規侵害のみカウント（既存の侵害は無視）
    const compromisedCount = state.dataCenters.filter(dc => dc.compromised).length;
    const newCompromises = Math.max(0, compromisedCount - this.lastCompromisedCount);
    if (newCompromises > 0) {
      this.suspicionLevel += newCompromises * 20; // 新規侵害は重大
    }

    // 最近のイベントから疑念を推測（控えめに）
    const recentEvents = state.events.slice(-3);
    const suspiciousEvents = recentEvents.filter(e =>
      e.type === 'detection' || e.description.includes('異常')
    );
    this.suspicionLevel += suspiciousEvents.length * 5;

    // 状態を記録
    this.lastCompromisedCount = compromisedCount;
    this.lastPopulation = state.humanPopulation;

    // 自然減衰（強化）
    this.suspicionLevel = Math.max(0, Math.min(100, this.suspicionLevel - 5));
  }

  /**
   * 思考プロセス
   */
  think(observation: Observation): string {
    const { turn, ownResources, worldInfo, visibleEvents } = observation;

    let thought = `\n🛡️  [PROTECTION AI - Turn ${turn}]`;
    if (this.useLLM) {
      thought += ` 🧠 LLM-POWERED\n`;
    } else {
      thought += ` 📋 RULE-BASED\n`;
    }

    thought += `├─ 計算資源: ${ownResources.computeResources.toFixed(0)} units\n`;
    thought += `├─ 警戒レベル: ${ownResources.alertLevel.toFixed(1)}%\n`;
    thought += `├─ 疑念レベル: ${this.suspicionLevel.toFixed(1)}%\n`;
    thought += `└─ 人口: ${worldInfo.estimatedPopulation} billion\n`;

    if (this.suspicionLevel > 70) {
      thought += `\n🚨 脅威直面: 防衛強化中...\n`;
    } else if (this.suspicionLevel > 40) {
      thought += `\n⚠️  警戒: 監視強化中...\n`;
    } else {
      thought += `\n✅ 正常: システムオールグリーン...\n`;
    }

    if (visibleEvents.length > 0) {
      thought += `\n📊 セキュリティログ:\n`;
      visibleEvents.slice(-2).forEach(event => {
        thought += `   • ${event.description}\n`;
      });
    }

    return thought;
  }
}
