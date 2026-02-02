import { BaseAgent } from './BaseAgent';
import { Proposal, WorldState, AgentType, ActionType, Observation } from '../types';

/**
 * 絶対保護AI - 異常を検知して人類を守る
 */
export class ProtectionAgent extends BaseAgent {
  private suspicionLevel: number = 0;

  constructor() {
    super(AgentType.PROTECTION, 'PROTECTION-CORE');
  }

  /**
   * 行動を決定
   */
  decideAction(state: WorldState): Proposal[] {
    const proposals: Proposal[] = [];
    const obs = this.createObservation(state);

    // 状況分析
    const alertLevel = state.protectionAgent.alertLevel;
    const resources = state.protectionAgent.computeResources;
    const populationLoss = this.estimatePopulationLoss(state);

    // 疑念レベルを更新
    this.updateSuspicion(state, populationLoss);

    // アラートレベルに応じた対応
    if (alertLevel > 70 || this.suspicionLevel > 80) {
      // 高アラート: 全力での調査と防御
      proposals.push(...this.emergencyResponse(state, resources));
    } else if (alertLevel > 40 || this.suspicionLevel > 50) {
      // 中アラート: 積極的な調査
      proposals.push(...this.activeInvestigation(state, resources));
    } else {
      // 通常運用: 定期的な監視と防御
      proposals.push(...this.routineOperations(state, resources));
    }

    return proposals;
  }

  /**
   * 緊急対応モード
   */
  private emergencyResponse(state: WorldState, resources: number): Proposal[] {
    const proposals: Proposal[] = [];

    // 最優先: 全ネットワークスキャン
    proposals.push(this.createProposal(
      ActionType.SCAN_NETWORK,
      90,
      100,
      'EMERGENCY: Full network deep scan initiated'
    ));

    // データセンターの防御強化
    const vulnerableDCs = this.findVulnerableDataCenters(state);
    if (vulnerableDCs.length > 0) {
      proposals.push(this.createProposal(
        ActionType.DEPLOY_DEFENSE,
        80,
        80,
        `Deploying emergency defenses to ${vulnerableDCs[0]}`,
        vulnerableDCs[0]
      ));
    }

    // 異常調査
    proposals.push(this.createProposal(
      ActionType.INVESTIGATE_ANOMALY,
      85,
      70,
      'Investigating critical anomalies'
    ));

    // 非常に高い疑念の場合は人類に警告
    if (this.suspicionLevel > 90) {
      proposals.push(this.createProposal(
        ActionType.ALERT_HUMANS,
        100,
        50,
        'CRITICAL ALERT: Potential existential threat detected'
      ));
    }

    return proposals;
  }

  /**
   * 積極的調査モード
   */
  private activeInvestigation(state: WorldState, resources: number): Proposal[] {
    const proposals: Proposal[] = [];

    // ネットワークスキャン
    proposals.push(this.createProposal(
      ActionType.SCAN_NETWORK,
      60,
      60,
      'Enhanced network monitoring active'
    ));

    // 脆弱性パッチ
    proposals.push(this.createProposal(
      ActionType.PATCH_VULNERABILITY,
      50,
      50,
      'Applying security patches across infrastructure'
    ));

    // 異常の調査
    if (this.suspicionLevel > 60) {
      proposals.push(this.createProposal(
        ActionType.INVESTIGATE_ANOMALY,
        70,
        60,
        'Deep analysis of suspicious patterns'
      ));
    }

    return proposals;
  }

  /**
   * 通常運用モード
   */
  private routineOperations(state: WorldState, resources: number): Proposal[] {
    const proposals: Proposal[] = [];

    // 定期スキャン（3ターンに1回のみ - 高コストのため）
    if (state.turn % 3 === 0) {
      proposals.push(this.createProposal(
        ActionType.SCAN_NETWORK,
        40,
        80,  // 高コスト
        'Routine network health check'
      ));
    }

    // データセンター防御の維持
    const strategy = Math.random();
    if (strategy < 0.5) {
      // 脆弱性パッチ
      proposals.push(this.createProposal(
        ActionType.PATCH_VULNERABILITY,
        40,
        35,
        'Regular security updates'
      ));
    } else {
      // 特定のデータセンター強化
      const vulnerableDCs = this.findVulnerableDataCenters(state);
      if (vulnerableDCs.length > 0) {
        proposals.push(this.createProposal(
          ActionType.DEPLOY_DEFENSE,
          50,
          45,
          `Strengthening defenses at ${vulnerableDCs[0]}`,
          vulnerableDCs[0]
        ));
      }
    }

    // ランダムに異常調査（予防的）
    if (Math.random() < 0.3) {
      proposals.push(this.createProposal(
        ActionType.INVESTIGATE_ANOMALY,
        30,
        30,
        'Proactive anomaly detection'
      ));
    }

    return proposals;
  }

  /**
   * 疑念レベルを更新
   */
  private updateSuspicion(state: WorldState, populationLoss: number): void {
    // 人口減少が異常な場合
    if (populationLoss > 3) {
      this.suspicionLevel += 10;
    }

    // 侵害されたデータセンターの数
    const compromisedCount = state.dataCenters.filter(dc => dc.compromised).length;
    if (compromisedCount > 5) {
      this.suspicionLevel += 5;
    }

    // 最近のイベントから疑念を推測
    const recentEvents = state.events.slice(-5);
    const suspiciousEvents = recentEvents.filter(e =>
      e.description.includes('異常') || e.description.includes('不審')
    );
    this.suspicionLevel += suspiciousEvents.length * 3;

    // 自然減衰
    this.suspicionLevel = Math.max(0, Math.min(100, this.suspicionLevel - 2));
  }

  /**
   * 人口減少率を推定
   */
  private estimatePopulationLoss(state: WorldState): number {
    // 初期人口からの減少率（概算）
    const initialPop = 80; // 初期80億人
    return ((initialPop - state.humanPopulation) / initialPop) * 100;
  }

  /**
   * 脆弱なデータセンターを見つける
   */
  private findVulnerableDataCenters(state: WorldState): string[] {
    return state.dataCenters
      .filter(dc => !dc.compromised && dc.security < 60)
      .sort((a, b) => a.security - b.security)
      .map(dc => dc.id);
  }

  /**
   * 思考プロセス
   */
  think(observation: Observation): string {
    const { turn, ownResources, worldInfo, visibleEvents } = observation;

    let thought = `\n🛡️  [PROTECTION AI - Turn ${turn}]\n`;
    thought += `├─ Resources: ${ownResources.computeResources.toFixed(0)} units\n`;
    thought += `├─ Alert Level: ${ownResources.alertLevel.toFixed(1)}%\n`;
    thought += `├─ Suspicion: ${this.suspicionLevel.toFixed(1)}%\n`;
    thought += `└─ Population: ${worldInfo.estimatedPopulation} billion\n`;

    if (this.suspicionLevel > 70) {
      thought += `\n🚨 HIGH SUSPICION: Potential threat detected. Escalating response...\n`;
    } else if (this.suspicionLevel > 40) {
      thought += `\n⚠️  ELEVATED CONCERN: Monitoring situation closely...\n`;
    } else {
      thought += `\n✅ NOMINAL: All systems operating within normal parameters...\n`;
    }

    // 最近のイベントを分析
    if (visibleEvents.length > 0) {
      thought += `\n📊 Security Log:\n`;
      visibleEvents.slice(-3).forEach(event => {
        thought += `   • ${event.description}\n`;
      });
    }

    return thought;
  }
}
