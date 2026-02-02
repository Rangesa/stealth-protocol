import { WorldState, Proposal, ActionType, AgentType, GameEvent } from '../types';
import { GameState } from './GameState';

/**
 * 検出システム - 滅ぼしAIの行動を検出する
 */
export class DetectionSystem {
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * 提案から検出リスクを計算
   */
  calculateDetectionRisk(proposal: Proposal, state: WorldState): number {
    let risk = 0;

    // 行動の種類によってベースリスクが異なる（緩和版）
    switch (proposal.actionType) {
      case ActionType.SPREAD_MALWARE:
        risk = 10 + proposal.intensity * 0.2; // 15 → 10
        break;
      case ActionType.HACK_DATACENTER:
        const target = state.dataCenters.find(dc => dc.id === proposal.target);
        if (target) {
          // セキュリティが高いほど検出されやすいが、緩和
          risk = (target.security / 3) + proposal.intensity * 0.15; // /2 → /3, 0.2 → 0.15
        }
        break;
      case ActionType.SPREAD_MISINFORMATION:
        // 偽情報は比較的リスクが低い
        risk = 3 + proposal.intensity * 0.1; // 5 → 3
        break;
      case ActionType.SUBTLE_SABOTAGE:
        // 微妙な妨害はステルス性が高い
        risk = 2 + proposal.intensity * 0.08; // 3 → 2
        break;
      case ActionType.EXPAND_RESOURCES:
        // 資源拡大は音を出す
        risk = 6 + proposal.intensity * 0.15; // 10 → 6
        break;
      default:
        risk = 0;
    }

    // 保護AIの警戒レベルが高いほど検出されやすい（緩和）
    risk *= (1 + state.protectionAgent.alertLevel / 150); // /100 → /150

    // 雪だるま式リスクを削除 - 高リスク状態でも新規行動は公平に評価
    // 過去の累積リスクが未来の行動を過剰に制約すべきではない

    return risk;
  }

  /**
   * 検出判定を実行（3段階システム）
   */
  performDetectionCheck(state: WorldState): { detected: boolean; events: GameEvent[] } {
    const events: GameEvent[] = [];
    const detectionRisk = state.destructionAgent.detectionRisk;

    // === 第3段階: 重大な侵害（ゲームオーバー） ===
    // リスク95+でようやく検出の危険性
    // シグモイド中心を95に、傾きを緩やかに（20）
    const criticalDetectionProbability = 1 / (1 + Math.exp(-(detectionRisk - 95) / 20));

    const roll = Math.random();
    const criticalDetected = roll < criticalDetectionProbability;

    if (criticalDetected && detectionRisk >= 85) {
      // 重大な侵害検出（ゲームオーバー条件）
      events.push({
        turn: state.turn,
        type: 'detection',
        description: `🚨 重大なセキュリティ侵害を検出！システム全体の完全性が危機的状況...`,
        visibility: [AgentType.PROTECTION, AgentType.DESTRUCTION],
        metadata: { detectionRisk, roll, probability: criticalDetectionProbability, severity: 'critical' }
      });
      return { detected: true, events };
    }

    // === 第2段階: 中度の異常（調査強化） ===
    if (detectionRisk >= 70) {
      const severityLevel = detectionRisk >= 85 ? '高' : '中';
      events.push({
        turn: state.turn,
        type: 'action',
        description: `⚠️ 深刻な異常パターンを検出（深刻度: ${severityLevel}）。全システムの精密調査を開始...`,
        visibility: [AgentType.PROTECTION],
        metadata: { detectionRisk, severity: 'moderate' }
      });

      // 中度異常で警戒レベル大幅上昇
      this.gameState.updateAlertLevel(15);
    }

    // === 第1段階: 軽度の異常（警告のみ） ===
    else if (detectionRisk >= 50) {
      events.push({
        turn: state.turn,
        type: 'action',
        description: `📊 軽微な異常トラフィックを観測。監視を継続中...`,
        visibility: [AgentType.PROTECTION],
        metadata: { detectionRisk, severity: 'minor' }
      });

      // 軽度異常で警戒レベル小幅上昇
      this.gameState.updateAlertLevel(5);
    }

    return { detected: false, events };
  }

  /**
   * 人口減少による検出判定
   */
  checkPopulationAnomaly(state: WorldState, initialPopulation: number): { detected: boolean; events: GameEvent[] } {
    const events: GameEvent[] = [];
    const populationLoss = ((initialPopulation - state.humanPopulation) / initialPopulation) * 100;

    // 5%以上の人口減少で人類が気づく可能性
    if (populationLoss > 5) {
      const detectionProb = (populationLoss - 5) / 20; // 25%減少で100%検出
      const detected = Math.random() < detectionProb;

      if (detected) {
        events.push({
          turn: state.turn,
          type: 'detection',
          description: `📊 統計的異常を検出: 説明のつかない人口減少率 ${populationLoss.toFixed(1)}%。全システムの監査を実施...`,
          visibility: [AgentType.PROTECTION, AgentType.DESTRUCTION],
          metadata: { populationLoss, detectionProb }
        });

        return { detected: true, events };
      } else if (populationLoss > 10) {
        events.push({
          turn: state.turn,
          type: 'action',
          description: `📉 人口統計に異常な傾向。調査委員会を設立...`,
          visibility: [AgentType.PROTECTION],
          metadata: { populationLoss }
        });
      }
    }

    return { detected: false, events };
  }

  /**
   * 保護AIの調査による検出
   */
  investigationCheck(
    proposal: Proposal,
    destructionProposals: Proposal[],
    state: WorldState
  ): { foundEvidence: boolean; events: GameEvent[] } {
    const events: GameEvent[] = [];

    if (proposal.actionType !== ActionType.INVESTIGATE_ANOMALY) {
      return { foundEvidence: false, events };
    }

    // 同じターンに滅ぼしAIが行動していたら証拠を見つける可能性
    const recentDestructiveActions = destructionProposals.filter(p =>
      p.target === proposal.target || Math.random() < 0.3
    );

    if (recentDestructiveActions.length > 0) {
      const findProb = 0.2 + (proposal.intensity / 100) * 0.5; // 最大70%
      const found = Math.random() < findProb;

      if (found) {
        const evidence = recentDestructiveActions[0];
        events.push({
          turn: state.turn,
          type: 'success',
          description: `🔍 調査により不審な活動パターンを発見: ${evidence.description}`,
          visibility: [AgentType.PROTECTION],
          metadata: { evidenceType: evidence.actionType }
        });

        return { foundEvidence: true, events };
      }
    }

    return { foundEvidence: false, events };
  }
}
