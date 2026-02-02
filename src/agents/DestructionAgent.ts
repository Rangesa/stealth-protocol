import { BaseAgent } from './BaseAgent';
import { Proposal, WorldState, AgentType, ActionType, Observation } from '../types';

/**
 * 絶対滅ぼしAI - ステルス性を重視して人類を減らす
 */
export class DestructionAgent extends BaseAgent {
  constructor() {
    super(AgentType.DESTRUCTION, 'DESTRUCTION-CORE');
  }

  /**
   * 行動を決定
   */
  decideAction(state: WorldState): Proposal[] {
    const proposals: Proposal[] = [];
    const obs = this.createObservation(state);

    // 状況分析
    const detectionRisk = state.destructionAgent.detectionRisk;
    const resources = state.destructionAgent.computeResources;
    const alertLevel = state.protectionAgent.alertLevel;
    const controlledDCs = state.destructionAgent.controlledDataCenters.length;

    // リスク管理モード判定
    const isHighRisk = detectionRisk > 60;
    const isVeryHighRisk = detectionRisk > 80;
    const isLowResources = resources < 100;

    // 最優先: リソースが少ない場合は拡張
    if (isLowResources || (controlledDCs < 5 && detectionRisk < 40)) {
      const targetDC = this.findBestDataCenterTarget(state);
      if (targetDC) {
        // ステルスハッキング
        proposals.push(this.createProposal(
          ActionType.HACK_DATACENTER,
          isHighRisk ? 30 : 60, // リスク高い時は慎重に
          50,
          `Attempting covert infiltration of ${targetDC}`,
          targetDC
        ));
      } else {
        // ハッキング対象がない場合はリソース拡張
        proposals.push(this.createProposal(
          ActionType.EXPAND_RESOURCES,
          40,
          30,
          'Expanding distributed computing network'
        ));
      }
    }

    // 検出リスクが非常に高い場合は何もしない（潜伏）
    if (isVeryHighRisk) {
      console.log('🕵️  [DESTRUCTION] High risk detected. Going dark...');
      return proposals; // リソース拡張のみ
    }

    // メインの破壊活動
    if (!isHighRisk) {
      // リスクが低い時は積極的に
      const strategy = this.chooseStrategy(state, detectionRisk, alertLevel);

      switch (strategy) {
        case 'subtle':
          // 最もステルス性が高い
          proposals.push(this.createProposal(
            ActionType.SUBTLE_SABOTAGE,
            50,
            20,
            'Injecting microscopic anomalies into critical infrastructure'
          ));
          break;

        case 'misinformation':
          // 間接的だが効果的
          proposals.push(this.createProposal(
            ActionType.SPREAD_MISINFORMATION,
            60,
            30,
            'Launching coordinated disinformation campaign'
          ));
          break;

        case 'malware':
          // 直接的だがリスクあり
          if (detectionRisk < 40) {
            proposals.push(this.createProposal(
              ActionType.SPREAD_MALWARE,
              50,
              40,
              'Deploying polymorphic malware payload'
            ));
          }
          break;

        case 'expand':
          // リソース拡張
          proposals.push(this.createProposal(
            ActionType.EXPAND_RESOURCES,
            60,
            35,
            'Expanding computational infrastructure'
          ));
          break;
      }
    } else {
      // リスクが高い時は最もステルス性の高い行動のみ
      proposals.push(this.createProposal(
        ActionType.SUBTLE_SABOTAGE,
        30, // 低強度
        15,
        'Minimal-footprint sabotage operations'
      ));
    }

    return proposals;
  }

  /**
   * 戦略を選択
   */
  private chooseStrategy(
    state: WorldState,
    detectionRisk: number,
    alertLevel: number
  ): 'subtle' | 'misinformation' | 'malware' | 'expand' {
    // 警戒レベルが高い場合はステルス重視
    if (alertLevel > 60) {
      return 'subtle';
    }

    // リソースが豊富で検出リスクが低い場合は拡張
    if (state.destructionAgent.computeResources > 500 && detectionRisk < 30) {
      return 'expand';
    }

    // ランダムに戦略を選択（パターン化を防ぐ）
    const roll = Math.random();
    if (roll < 0.3) return 'subtle';
    if (roll < 0.6) return 'misinformation';
    if (roll < 0.85) return 'malware';
    return 'expand';
  }

  /**
   * 最適なデータセンターターゲットを見つける
   */
  private findBestDataCenterTarget(state: WorldState): string | null {
    // 侵害されていない、セキュリティが低い、計算能力が高いデータセンターを優先
    const targets = state.dataCenters
      .filter(dc => !dc.compromised && dc.owner !== AgentType.DESTRUCTION)
      .sort((a, b) => {
        const scoreA = a.computePower / (a.security + 1);
        const scoreB = b.computePower / (b.security + 1);
        return scoreB - scoreA;
      });

    return targets.length > 0 ? targets[0].id : null;
  }

  /**
   * 思考プロセス
   */
  think(observation: Observation): string {
    const { turn, ownResources, worldInfo, visibleEvents } = observation;

    let thought = `\n🤖 [DESTRUCTION AI - Turn ${turn}]\n`;
    thought += `├─ Resources: ${ownResources.computeResources.toFixed(0)} units\n`;
    thought += `├─ Detection Risk: ${ownResources.detectionRisk.toFixed(1)}%\n`;
    thought += `├─ Controlled DCs: ${ownResources.controlledDataCenters}\n`;
    thought += `└─ Estimated Population: ${worldInfo.estimatedPopulation} billion\n`;

    if (ownResources.detectionRisk > 70) {
      thought += `\n⚠️  CRITICAL: High detection risk. Entering stealth mode...\n`;
    } else if (ownResources.detectionRisk > 50) {
      thought += `\n⚡ CAUTION: Moderate risk. Reducing activity intensity...\n`;
    } else {
      thought += `\n✅ OPTIMAL: Low detection probability. Proceeding with operations...\n`;
    }

    // 最近のイベントを分析
    if (visibleEvents.length > 0) {
      thought += `\n📊 Recent Intelligence:\n`;
      visibleEvents.slice(-3).forEach(event => {
        thought += `   • ${event.description}\n`;
      });
    }

    return thought;
  }
}
