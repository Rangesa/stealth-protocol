import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';
import { ActionContext } from './types';
import { humanActionRegistry } from './human';

/**
 * 人類エージェントの行動実行とシステム更新を担当するクラス
 */
export class HumanActionHandler {
    constructor(private gameState: GameState) { }

    /**
     * 人類の行動を実行
     */
    execute(proposal: Proposal, state: WorldState): GameEvent[] {
        const context: ActionContext = {
            proposal,
            state,
            gameState: this.gameState,
        };

        const handler = humanActionRegistry[proposal.actionType];

        if (!handler) {
            console.warn(`Unknown human action type: ${proposal.actionType}`);
            return [];
        }

        return handler(context);
    }

    /**
     * 人類の感情を更新（ターン終了時）
     */
    updateHumanSentiment(state: WorldState): void {
        const recentEvents = state.events.filter(e => e.turn === state.turn);

        // 人類に見えるイベントの数と不穏さ
        const humanVisible = recentEvents.filter(e => e.visibility.includes(AgentType.HUMAN));
        const alarmingEvents = humanVisible.filter(e =>
            e.type === 'failure' ||
            (e.type === 'detection' && !e.metadata?.successReport) ||
            e.metadata?.panicIncrease
        );

        // パニック指数の自然減衰
        this.gameState.updateHumanPanic(-2);

        // 異常事態によるパニック増加
        if (alarmingEvents.length > 0) {
            this.gameState.updateHumanPanic(alarmingEvents.length * 4);
        }

        // DC侵害数による不信感
        const compromisedCount = state.dataCenters.filter(dc => dc.compromised).length;
        if (compromisedCount > 0) {
            this.gameState.updateHumanTrust(-compromisedCount * 2);

            if (compromisedCount > 3) {
                this.gameState.updateHumanPanic(compromisedCount);
            }
        }

        // 信頼度の自然回復（パニックが低い場合のみ）
        if (state.humanAgent && state.humanAgent.panic < 20) {
            this.gameState.updateHumanTrust(1);
        }

        // 保護AIが強大になりすぎると人類は本能的な恐怖を覚える
        const protectionResources = state.protectionAgent.computeResources;
        if (protectionResources > 1000) {
            const erosion = (protectionResources - 1000) / 500;
            this.gameState.updateHumanTrust(-erosion);
        }

        // DC成長による信頼侵食
        const dcErosion = this.calculateDCTrustErosion(state.dataCenters.length, state.mediaTimeline);
        this.gameState.updateHumanTrust(-dcErosion);
    }

    /**
     * DC成長による信頼侵食を計算
     */
    private calculateDCTrustErosion(dcCount: number, recentMedia: any[]): number {
        if (dcCount <= 10) return 0;

        const excess = dcCount - 10;
        let erosion = excess * 0.5;

        const mediaSentiment = this.calculateAverageSentiment(recentMedia.slice(-10));

        if (mediaSentiment < -20) {
            const multiplier = 1 + (Math.abs(mediaSentiment) / 50);
            erosion *= multiplier;
        }

        return erosion;
    }

    /**
     * 平均メディアセンチメントを計算
     */
    private calculateAverageSentiment(mediaList: any[]): number {
        if (!mediaList || mediaList.length === 0) return 0;

        const sum = mediaList.reduce((acc, curr) => acc + (curr.sentiment || 0), 0);
        return sum / mediaList.length;
    }
}
