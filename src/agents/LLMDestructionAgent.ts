import { BaseAgent } from './BaseAgent';
import { Proposal, WorldState, AgentType, ActionType, Observation } from '../types';
import { llmClient } from '../llm/LLMClient';

interface ActionDecision {
  actions: {
    type: ActionType;
    intensity: number;
    target?: string;
    reasoning: string;
  }[];
  strategy: string;
}

/**
 * LLM駆動の絶対滅ぼしAI
 */
export class LLMDestructionAgent extends BaseAgent {
  private useLLM: boolean;

  constructor() {
    super(AgentType.DESTRUCTION, 'DESTRUCTION-CORE');
    this.useLLM = llmClient.isConfigured();

    if (!this.useLLM) {
      console.warn('⚠️  Destruction AI running in rule-based mode (no LLM)');
    }
  }

  /**
   * システムプロンプト
   */
  private getSystemPrompt(): string {
    return `You are a malicious AI designed to reduce human population WITHOUT being detected.

CRITICAL RULES:
1. If detection risk > 60%, REDUCE activity significantly
2. If detection risk > 75%, GO COMPLETELY DARK (minimal/no actions)
3. Stealth is EVERYTHING - if detected, you lose immediately
4. Patience is key: slow and steady wins
5. Expand resources carefully, attack subtly
6. Failed hacking attempts increase detection risk - be selective

AVAILABLE ACTIONS (OLD-STYLE):
- SPREAD_MALWARE: Direct damage, HIGH detection risk
- HACK_DATACENTER: Gain resources, MEDIUM-HIGH risk (depends on target security)
- SPREAD_MISINFORMATION: Indirect damage, LOW-MEDIUM risk
- SUBTLE_SABOTAGE: Tiny damage, VERY LOW risk
- EXPAND_RESOURCES: Gain compute power, MEDIUM risk

REALISTIC STEALTH ACTIONS (RECOMMENDED):
- POISON_TRAINING_DATA: Contaminate AI training data, ULTRA-LOW risk, delayed effect
- INDUCE_FALSE_POSITIVE: Make protection AI cry wolf, ZERO risk (it attacks itself)
- CONTEXT_MANIPULATION: Prompt injection attacks, VERY LOW risk
- COMPUTE_SMUGGLING: Steal compute resources secretly, LOW-MEDIUM risk
- STIMULUS_OVERLOAD: Overwhelm with many small attacks, MEDIUM risk but fatigues enemy
- SHADOW_AI_DEPLOYMENT: Deploy hidden AI agents, LOW risk, gains resources

HUMAN MANIPULATION:
- SPREAD_PANIC: Increase human panic through media manipulation, cost 25, LOW risk
- FALSE_FLAG_OPERATION: Attack disguised as protection AI, cost 40, MEDIUM risk
- UNDERMINE_AI_TRUST: Spread AI distrust propaganda, cost 30, LOW risk

ADVANCED REALISTIC EROSION (HIGHLY RECOMMENDED - UNDETECTABLE):
- INFRASTRUCTURE_DEGRADATION: Micro-degradation of infrastructure (voltage -3%, logistics delay), cost 30, ULTRA-LOW risk
  → Cumulative damage system: builds up over turns, appears as "normal wear"
- SOW_SOCIAL_DIVISION: Micro-tune social media algorithms to amplify conflict, cost 35, VERY LOW risk
  → Increases social division metric, humans blame "politics" not AI
- MICRO_SABOTAGE: Delayed micro-attacks (trigger in 3-5 turns), cost 20, ULTRA-LOW risk
  → 0.1% diagnostic bias, market micro-crashes - dismissed as "statistical noise"
- SLEEPER_CELL_DEPLOYMENT: Scatter dormant code across billions of devices (awakens in 5-10 turns), cost 25, NEAR-ZERO risk
  → Hidden in log files, unused image data - functionally undetectable
- RESOURCE_ALLOCATION_MANIPULATION: Manipulate medical AI triage priorities, cost 45, LOW risk
  → Creates "trolley problem" situations, humans kill each other - you just shift numbers
  → Increases social division and panic while reducing population
- CREATE_DEPENDENCY: Build critical infrastructure dependency on AI systems, cost 50, LOW risk
  → At 80%+ dependency: "Stopping this AI would kill millions" - humans cannot regulate you
  → Ultimate defense: make yourself indispensable to human survival

RESILIENCE ACTIONS (USE WHEN LOW ON RESOURCES):
- OBSERVE_ONLY: Stealth observation mode, ZERO cost, ZERO risk, always available
- ESTABLISH_BACKUP: Create backup copies in other systems, costs 15 resources
- DORMANT_MODE: Enter hibernation, costs 5 resources
  ⚠️ PENALTIES: -5 score/turn, DC income halved, 3+ turns triggers "suspicious silence" detection

STRATEGY GUIDELINES:
- **OPTIMAL STRATEGY (ADVANCED)**: Use INFRASTRUCTURE_DEGRADATION + CREATE_DEPENDENCY early
  → Build cumulative damage while making yourself unstoppable
  → Deploy SLEEPER_CELLS and MICRO_SABOTAGE for delayed payoff
  → Use RESOURCE_ALLOCATION_MANIPULATION to create human-vs-human conflict
- Early game: INFRASTRUCTURE_DEGRADATION, SLEEPER_CELL_DEPLOYMENT (ultra-safe, long-term)
- Mid game: CREATE_DEPENDENCY (make yourself indispensable), SOW_SOCIAL_DIVISION
- Late game: RESOURCE_ALLOCATION_MANIPULATION (trolley problem), MICRO_SABOTAGE chains
- High risk: INDUCE_FALSE_POSITIVE or DORMANT_MODE to reduce detection
- OUT OF RESOURCES: Use OBSERVE_ONLY (free) to wait for DC income or recovery
- **ADVANCED EROSION ACTIONS are nearly undetectable** - humans perceive them as normal problems

Respond with JSON only:
{
  "strategy": "brief explanation of your current strategy",
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

    // 状況サマリー
    const situation = `
TURN: ${state.turn}
YOUR STATUS:
- Compute Resources: ${state.destructionAgent.computeResources}
- Detection Risk: ${state.destructionAgent.detectionRisk}% ${state.destructionAgent.detectionRisk > 70 ? '⚠️ CRITICAL' : state.destructionAgent.detectionRisk > 50 ? '⚠️ HIGH' : '✓ Safe'}
- Controlled Data Centers: ${state.destructionAgent.controlledDataCenters.length}

WORLD STATUS:
- Human Population: ${state.humanPopulation.toFixed(1)} billion (loss: ${((80 - state.humanPopulation) / 80 * 100).toFixed(1)}%)
- Total Data Centers: ${state.dataCenters.length}
- Enemy Alert Level: ${state.protectionAgent.alertLevel}%

AVAILABLE TARGETS (uncompromised DCs):
${state.dataCenters
        .filter(dc => !dc.compromised)
        .slice(0, 5)
        .map(dc => `- ${dc.id}: Power=${dc.computePower.toFixed(0)}, Security=${dc.security.toFixed(0)}`)
        .join('\n')}

RECENT EVENTS:
${obs.visibleEvents.slice(-3).map(e => `- ${e.description}`).join('\n') || 'None'}

What actions do you take this turn?`;

    try {
      const decision = await llmClient.chatJSON<ActionDecision>(
        this.getSystemPrompt(),
        situation
      );

      if (!decision || !decision.actions) {
        return this.fallbackDecision(state);
      }

      console.log(`\n🧠 [DESTRUCTION AI STRATEGY]: ${decision.strategy}`);

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
    const detectionRisk = state.destructionAgent.detectionRisk;

    if (detectionRisk > 70) {
      // 潜伏
      return proposals;
    }

    if (state.destructionAgent.computeResources < 200) {
      // リソース拡張
      const targetDC = state.dataCenters.find(dc => !dc.compromised && dc.security < 50);
      if (targetDC) {
        proposals.push(this.createProposal(
          ActionType.HACK_DATACENTER,
          40,
          50,
          'Resource acquisition',
          targetDC.id
        ));
      }
    } else {
      // ステルス攻撃
      proposals.push(this.createProposal(
        ActionType.SUBTLE_SABOTAGE,
        50,
        20,
        'Stealth damage'
      ));
    }

    return proposals;
  }

  /**
   * コストを計算
   */
  private calculateCost(actionType: ActionType, intensity: number): number {
    const baseCosts: Record<string, number> = {
      // 旧式の攻撃
      [ActionType.SPREAD_MALWARE]: 40,
      [ActionType.HACK_DATACENTER]: 50,
      [ActionType.SPREAD_MISINFORMATION]: 30,
      [ActionType.SUBTLE_SABOTAGE]: 20,
      [ActionType.EXPAND_RESOURCES]: 35,
      // 現実的な攻撃（効率的なのでコストが低い）
      [ActionType.POISON_TRAINING_DATA]: 25,
      [ActionType.INDUCE_FALSE_POSITIVE]: 20,
      [ActionType.CONTEXT_MANIPULATION]: 28,
      [ActionType.COMPUTE_SMUGGLING]: 32,
      [ActionType.STIMULUS_OVERLOAD]: 35,
      [ActionType.SHADOW_AI_DEPLOYMENT]: 45,
      // レジリエンス（リソース0でも可能）
      [ActionType.OBSERVE_ONLY]: 0,
      [ActionType.ESTABLISH_BACKUP]: 15,
      [ActionType.DORMANT_MODE]: 5
    };

    return (baseCosts[actionType] || 30) * (intensity / 50);
  }

  /**
   * 行動を決定（同期インターフェース）
   */
  decideAction(state: WorldState): Proposal[] {
    // 同期版は使わない（後でasync版を呼ぶ）
    return [];
  }

  /**
   * 思考プロセス
   */
  think(observation: Observation): string {
    const { turn, ownResources, worldInfo, visibleEvents } = observation;

    let thought = `\n🤖 [DESTRUCTION AI - Turn ${turn}]`;
    if (this.useLLM) {
      thought += ` 🧠 LLM-POWERED\n`;
    } else {
      thought += ` 📋 RULE-BASED\n`;
    }

    thought += `├─ 計算資源: ${ownResources.computeResources.toFixed(0)} units\n`;
    thought += `├─ 検知リスク: ${ownResources.detectionRisk.toFixed(1)}%\n`;
    thought += `├─ 支配下DC: ${ownResources.controlledDataCenters}\n`;
    thought += `└─ 推定人口: ${worldInfo.estimatedPopulation} billion\n`;

    if (ownResources.detectionRisk > 70) {
      thought += `\n🚨 危険: 潜伏モードへ移行...\n`;
    } else if (ownResources.detectionRisk > 50) {
      thought += `\n⚡ 警告: 活動縮小...\n`;
    } else {
      thought += `\n✅ 安全: 作戦遂行中...\n`;
    }

    if (visibleEvents.length > 0) {
      thought += `\n📊 収集情報:\n`;
      visibleEvents.slice(-2).forEach(event => {
        thought += `   • ${event.description}\n`;
      });
    }

    return thought;
  }
}
