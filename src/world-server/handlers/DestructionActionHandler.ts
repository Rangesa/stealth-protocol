import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';
import { DetectionSystem } from '../DetectionSystem';
import { RealisticDetectionSystem } from '../RealisticDetectionSystem';
import { ActionContext } from './types';
import { destructionActionRegistry } from './destruction';

/**
 * 滅ぼしAIの行動実行を担当するクラス
 */
export class DestructionActionHandler {
    constructor(
        private gameState: GameState,
        private detectionSystem: DetectionSystem,
        private realisticDetectionSystem: RealisticDetectionSystem
    ) { }

    /**
     * 滅ぼしAIの行動を実行
     */
    execute(proposal: Proposal, state: WorldState): GameEvent[] {
        // 休眠以外のアクションなら休眠カウントリセット
        if (proposal.actionType !== ActionType.DORMANT_MODE) {
            this.gameState.getState().destructionAgent.dormantTurns = 0;
        }

        // コストを消費
        if (proposal.cost > 0) {
            this.gameState.updateComputeResources(AgentType.DESTRUCTION, -proposal.cost);
        }

        // 検出リスクを計算
        const risk = this.detectionSystem.calculateDetectionRisk(proposal, state);
        this.gameState.updateDetectionRisk(risk);

        // アクションハンドラを取得して実行
        const handler = destructionActionRegistry[proposal.actionType];

        if (!handler) {
            console.warn(`Unknown action type: ${proposal.actionType}`);
            return [];
        }

        const context: ActionContext = {
            proposal,
            state,
            gameState: this.gameState,
            detectionSystem: this.detectionSystem,
            realisticDetectionSystem: this.realisticDetectionSystem,
        };

        return handler(context);
    }
}
