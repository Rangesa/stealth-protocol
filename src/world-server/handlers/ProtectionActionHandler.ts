import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';
import { DetectionSystem } from '../DetectionSystem';
import { ActionContext } from './types';
import {
    protectionActionRegistry,
    investigateAnomaly,
    patchVulnerability
} from './protection';

/**
 * 保護AIの行動実行を担当するクラス
 */
export class ProtectionActionHandler {
    constructor(
        private gameState: GameState,
        private detectionSystem: DetectionSystem
    ) { }

    /**
     * 保護AIの行動を実行
     */
    execute(
        proposal: Proposal,
        state: WorldState,
        destructionProposals: Proposal[]
    ): GameEvent[] {
        // 動的コスト計算
        const actualCost = this.calculateActualCost(proposal, state);

        // コストを消費
        this.gameState.updateComputeResources(AgentType.PROTECTION, -actualCost);

        // リソース消費のペナルティ
        this.gameState.updateScore(AgentType.PROTECTION, -proposal.cost * 0.05);
        this.gameState.addResourceSpent(proposal.cost);

        // Alert Fatigue追跡
        this.updateAlertFatigue(proposal);

        // アクションコンテキストを作成
        const context: ActionContext = {
            proposal,
            state,
            gameState: this.gameState,
            detectionSystem: this.detectionSystem,
        };

        // 特殊なシグネチャを持つアクションを処理
        if (proposal.actionType === ActionType.INVESTIGATE_ANOMALY) {
            return investigateAnomaly(context, destructionProposals);
        }

        if (proposal.actionType === ActionType.PATCH_VULNERABILITY) {
            return patchVulnerability(context);
        }

        // 標準的なアクションハンドラを取得して実行
        const handler = protectionActionRegistry[proposal.actionType];

        if (!handler) {
            console.warn(`Unknown protection action type: ${proposal.actionType}`);
            return [];
        }

        return handler(context);
    }

    /**
     * 動的コスト計算
     */
    private calculateActualCost(proposal: Proposal, state: WorldState): number {
        if (proposal.actionType === ActionType.SCAN_NETWORK) {
            return state.dataCenters.length * 6;
        }

        if (proposal.actionType === ActionType.ANALYZE_LOGS) {
            const depth = proposal.analysisDepth || 3;
            const baseCost = 10;
            const linearCost = depth * 5;
            const quadraticCost = depth * depth * 0.5;
            return Math.floor(baseCost + linearCost + quadraticCost);
        }

        return proposal.cost;
    }

    /**
     * Alert Fatigue（警戒疲れ）の追跡
     */
    private updateAlertFatigue(proposal: Proposal): void {
        if (proposal.intensity > 60) {
            this.gameState.updateConsecutiveHighIntensity(1);
            this.gameState.updateBurnoutLevel(5);
        } else {
            this.gameState.resetConsecutiveHighIntensity();
        }
    }
}
