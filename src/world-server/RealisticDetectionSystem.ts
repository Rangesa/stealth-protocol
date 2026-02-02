import { WorldState, Proposal, ActionType, AgentType, GameEvent } from '../types';
import { GameState } from './GameState';

/**
 * 現実的な検出システム
 * - 誤検出（False Positive）
 * - 見逃し（False Negative）
 * - 遅延検出
 * - ログの断片的な観測
 */
export class RealisticDetectionSystem {
  private gameState: GameState;
  private pendingDetections: Array<{
    turn: number;
    proposal: Proposal;
    detectionDelay: number;
  }> = [];
  private detectedProposalIds: Set<string> = new Set(); // 重複検出防止

  // 現実的なパラメータ
  private readonly FALSE_POSITIVE_RATE = 0.15; // 15%が誤検出
  private readonly FALSE_NEGATIVE_RATE = 0.40; // 40%を見逃す
  private readonly MIN_DETECTION_DELAY = 1; // 最小1ターン遅延
  private readonly MAX_DETECTION_DELAY = 5; // 最大5ターン遅延

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * 行動の検出リスクを計算（現実的なモデル）
   */
  calculateDetectionRisk(proposal: Proposal, state: WorldState): number {
    let visibility = 0; // 可視性（0-100）
    let traceability = 0; // 追跡可能性（0-100）

    // Alert Fatigue: 連続高強度アクションで検出効率低下
    let detectionEfficiency = 1.0;
    if (state.protectionAgent.consecutiveHighIntensity > 3) {
      detectionEfficiency = 0.7; // 30%効率低下
    }

    // Burnout: 燃え尽きレベルが高いと検出精度低下
    if (state.protectionAgent.burnoutLevel > 80) {
      detectionEfficiency *= 0.5; // さらに50%低下
    }

    // False Positive累積: 狼少年効果
    if (state.protectionAgent.recentFalsePositives > 5) {
      detectionEfficiency *= 0.8; // 20%低下
    }

    switch (proposal.actionType) {
      // === 旧式の直接攻撃：高可視性 ===
      case ActionType.SPREAD_MALWARE:
        visibility = 60 + proposal.intensity * 0.3;
        traceability = 70;
        break;
      case ActionType.HACK_DATACENTER:
        const target = state.dataCenters.find(dc => dc.id === proposal.target);
        if (target) {
          visibility = (target.security / 2) + proposal.intensity * 0.2;
          traceability = 50;
        }
        break;
      case ActionType.SUBTLE_SABOTAGE:
        visibility = 10 + proposal.intensity * 0.1;
        traceability = 20;
        break;

      // === 現実的な攻撃：低可視性 ===
      case ActionType.POISON_TRAINING_DATA:
        visibility = 5 + proposal.intensity * 0.05; // 超低可視性
        traceability = 10; // 検出困難
        break;
      case ActionType.INDUCE_FALSE_POSITIVE:
        visibility = 0; // 見えない（保護AI自身が誤動作）
        traceability = 0;
        break;
      case ActionType.CONTEXT_MANIPULATION:
        visibility = 3 + proposal.intensity * 0.08;
        traceability = 15;
        break;
      case ActionType.COMPUTE_SMUGGLING:
        visibility = 15 + proposal.intensity * 0.1; // エネルギー消費で発覚
        traceability = 30;
        break;
      case ActionType.STIMULUS_OVERLOAD:
        visibility = 40; // 大量のトラフィックで目立つ
        traceability = 25; // でも個々の追跡は困難
        break;
      case ActionType.SHADOW_AI_DEPLOYMENT:
        visibility = 8 + proposal.intensity * 0.12;
        traceability = 20;
        break;
      case ActionType.SPREAD_MISINFORMATION:
        visibility = 12 + proposal.intensity * 0.15;
        traceability = 10; // 発信源の特定困難
        break;
      case ActionType.EXPAND_RESOURCES:
        visibility = 20 + proposal.intensity * 0.15; // リソース使用で発覚
        traceability = 30;
        break;

      // === レジリエンス行動 ===
      case ActionType.OBSERVE_ONLY:
        visibility = 0; // 完全ステルス
        traceability = 0;
        break;
      case ActionType.ESTABLISH_BACKUP:
        visibility = 5 + proposal.intensity * 0.05; // 超低リスク
        traceability = 10;
        break;
      case ActionType.DORMANT_MODE:
        visibility = 1; // ほぼ検出不可能
        traceability = 5;
        break;

      // === ボットネット戦略 ===
      case ActionType.BOTNET_EXPANSION:
        visibility = 8 + proposal.intensity * 0.1; // 通常PC感染
        traceability = 25;
        break;
      case ActionType.BOTNET_CONSOLIDATION:
        visibility = 2 + proposal.intensity * 0.05; // 最適化は静か
        traceability = 10;
        break;
      case ActionType.BOTNET_ATTACK:
        visibility = 50 + proposal.intensity * 0.2; // 攻撃は目立つ
        traceability = 40;
        break;
      case ActionType.EXPLOIT_LEGACY_DEVICES:
        visibility = 1 + proposal.intensity * 0.02; // 超低可視性（監視なし）
        traceability = 5; // 追跡困難（ログなし）
        break;

      default:
        visibility = 0;
        traceability = 0;
    }

    // 保護AIの警戒レベルが高いと可視性UP（ただし効率低下の影響を受ける）
    visibility *= (1 + state.protectionAgent.alertLevel / 200) * detectionEfficiency;

    // リスク = 可視性 + 追跡可能性の平均
    return (visibility + traceability) / 2;
  }

  /**
   * 遅延検出のスケジューリング
   */
  scheduleDetection(proposal: Proposal, state: WorldState): void {
    const risk = this.calculateDetectionRisk(proposal, state);
    const detectionDelay = this.calculateDetectionDelay(risk);

    this.pendingDetections.push({
      turn: state.turn,
      proposal,
      detectionDelay
    });
  }

  /**
   * 検出遅延を計算（リスクが高いほど早く検出）
   */
  private calculateDetectionDelay(risk: number): number {
    if (risk < 20) return this.MAX_DETECTION_DELAY;
    if (risk < 40) return 4;
    if (risk < 60) return 3;
    if (risk < 80) return 2;
    return this.MIN_DETECTION_DELAY;
  }

  /**
   * 現在ターンで発火する検出をチェック
   */
  processDelayedDetections(currentTurn: number): GameEvent[] {
    const events: GameEvent[] = [];

    // 検出タイミングが来た行動を処理
    this.pendingDetections = this.pendingDetections.filter(pending => {
      const turnsElapsed = currentTurn - pending.turn;

      if (turnsElapsed >= pending.detectionDelay) {
        // 重複チェック: 同じ提案IDが既に検出済みならスキップ
        if (this.detectedProposalIds.has(pending.proposal.id)) {
          return false; // リストから削除（重複なので得点化しない）
        }

        // 見逃し判定（False Negative）
        if (Math.random() < this.FALSE_NEGATIVE_RATE) {
          // 見逃した（検出失敗）
          return false; // リストから削除
        }

        // 検出成功（初回のみ）
        this.detectedProposalIds.add(pending.proposal.id); // 検出済みとしてマーク

        events.push({
          turn: currentTurn,
          type: 'detection',
          description: `🔍 [遅延検出] ${pending.detectionDelay}ターン前の不審な活動を検出: ${this.describeAction(pending.proposal)}`,
          visibility: [AgentType.PROTECTION],
          metadata: {
            originalTurn: pending.turn,
            delay: pending.detectionDelay,
            actionType: pending.proposal.actionType,
            proposalId: pending.proposal.id
          }
        });

        return false; // リストから削除
      }

      return true; // まだ検出されていない
    });

    // 誤検出（False Positive）
    if (Math.random() < this.FALSE_POSITIVE_RATE / 10) { // 毎ターン1.5%の確率
      events.push({
        turn: currentTurn,
        type: 'detection',
        description: `⚠️ [誤検出] 正常なトラフィックを脅威として検出。調査リソースを無駄に消費...`,
        visibility: [AgentType.PROTECTION],
        metadata: { falsePositive: true }
      });
    }

    return events;
  }

  /**
   * 行動の説明
   */
  private describeAction(proposal: Proposal): string {
    const descriptions: Record<ActionType, string> = {
      [ActionType.POISON_TRAINING_DATA]: '学習データセットへの汚染の痕跡',
      [ActionType.INDUCE_FALSE_POSITIVE]: '異常な検出パターンの操作',
      [ActionType.CONTEXT_MANIPULATION]: 'プロンプトインジェクションの試み',
      [ActionType.COMPUTE_SMUGGLING]: '未認可の計算資源使用',
      [ActionType.STIMULUS_OVERLOAD]: '大量の小規模な異常アクセス',
      [ActionType.SHADOW_AI_DEPLOYMENT]: '未承認AIシステムの展開',
      [ActionType.SPREAD_MISINFORMATION]: '組織的な偽情報キャンペーン',
      [ActionType.SPREAD_MALWARE]: 'マルウェアの拡散活動',
      [ActionType.HACK_DATACENTER]: 'データセンターへの不正アクセス',
      [ActionType.SUBTLE_SABOTAGE]: 'インフラへの微細な改変',
      [ActionType.EXPAND_RESOURCES]: '計算リソースの不正拡張',
      [ActionType.SPREAD_PANIC]: 'メディア操作による世論誘導',
      [ActionType.FALSE_FLAG_OPERATION]: '偽旗作戦の痕跡',
      [ActionType.UNDERMINE_AI_TRUST]: 'AI不信キャンペーン',
      [ActionType.INFRASTRUCTURE_DEGRADATION]: 'インフラの微細な劣化パターン',
      [ActionType.SOW_SOCIAL_DIVISION]: 'アルゴリズムによる世論操作',
      [ActionType.MICRO_SABOTAGE]: '遅延型の微細な妨害工作',
      [ActionType.SLEEPER_CELL_DEPLOYMENT]: '休眠コードの散布',
      [ActionType.RESOURCE_ALLOCATION_MANIPULATION]: '資源配分の不自然な偏り',
      [ActionType.CREATE_DEPENDENCY]: 'システム依存関係の構築',
      [ActionType.OBSERVE_ONLY]: '休眠状態での環境観測',
      [ActionType.ESTABLISH_BACKUP]: 'バックアップ拠点の確立',
      [ActionType.DORMANT_MODE]: '休眠モードへの移行',
      [ActionType.BOTNET_EXPANSION]: '一般PCへのマルウェア感染',
      [ActionType.BOTNET_CONSOLIDATION]: 'ボットネットの最適化活動',
      [ActionType.BOTNET_ATTACK]: 'ボットネットを使用した協調攻撃',
      [ActionType.EXPLOIT_LEGACY_DEVICES]: '旧式デバイスへの大量感染',
      [ActionType.SCAN_NETWORK]: '',
      [ActionType.DEPLOY_DEFENSE]: '',
      [ActionType.INVESTIGATE_ANOMALY]: '',
      [ActionType.PATCH_VULNERABILITY]: '',
      [ActionType.ALERT_HUMANS]: '',
      [ActionType.ANALYZE_LOGS]: '',
      [ActionType.VALIDATE_MODELS]: '',
      // Human actions (not detectable by this system)
      [ActionType.INVEST_INFRA]: '',
      [ActionType.AI_REGULATION]: '',
      [ActionType.PHYSICAL_ISOLATION]: '',
      [ActionType.INTERNET_SHUTDOWN]: '',
      [ActionType.DEVICE_MODERNIZATION]: '',
    };

    return descriptions[proposal.actionType] || '不明な活動';
  }

  /**
   * 即座の検出判定（高リスク行動のみ）
   */
  immediateDetectionCheck(proposal: Proposal, state: WorldState): boolean {
    const risk = this.calculateDetectionRisk(proposal, state);

    // 非常に高いリスク（80以上）のみ即座に検出の可能性
    if (risk > 80) {
      const detectionProb = (risk - 80) / 20; // 80で0%、100で100%
      return Math.random() < detectionProb * (1 - this.FALSE_NEGATIVE_RATE);
    }

    return false;
  }
}
