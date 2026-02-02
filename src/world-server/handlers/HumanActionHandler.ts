import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';

/**
 * 人類エージェントの行動実行とシステム更新を担当するクラス
 */
export class HumanActionHandler {
    constructor(private gameState: GameState) { }

    /**
     * 人類の行動を実行
     */
    execute(proposal: Proposal, state: WorldState): GameEvent[] {
        const events: GameEvent[] = [];
        const intensity = proposal.intensity;

        // 最新の状態を取得（前の提案による変更を反映）
        const currentState = this.gameState.getState();

        switch (proposal.actionType) {
            case ActionType.INVEST_INFRA:
                // 新しいデータセンターを建設
                const cost = currentState.economicModel.infrastructureCost;

                if (currentState.economicModel.globalBudget >= cost) {
                    // 予算消費
                    this.gameState.updateBudget(-cost);

                    // DC建設（2-3個）
                    const dcCount = 2 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < dcCount; i++) {
                        const id = `DC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                        this.gameState.addDataCenter({
                            id,
                            age: 0,
                            computePower: 50 + Math.random() * 50,
                            security: 40 + Math.random() * 20,
                            compromised: false,
                            owner: null
                        });
                    }

                    // 次回建設コスト上昇
                    this.gameState.updateInfrastructureCost(cost * 0.2);
                    this.gameState.updateLastInfraTurn(currentState.turn);

                    events.push({
                        turn: currentState.turn,
                        type: 'action',
                        description: `🏗️ 人類が次世代データセンター群を建設（${dcCount}拠点）。予算: -${cost.toFixed(1)}兆ドル`,
                        visibility: [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION],
                        metadata: { dcCount, cost }
                    });

                    // 建設による安心感（パニック低下）
                    this.gameState.updateHumanPanic(-5);

                } else {
                    events.push({
                        turn: currentState.turn,
                        type: 'failure',
                        description: `❌ 予算不足のためインフラ建設が中止されました（必要: ${cost.toFixed(1)}兆ドル）`,
                        visibility: [AgentType.HUMAN],
                        metadata: { budgetShortfall: true }
                    });
                }
                break;

            case ActionType.AI_REGULATION:
                // AI規制（リソース制限）
                const regulationStrength = intensity / 2; // 0-50%
                this.gameState.updateRegulationStrength(regulationStrength);

                // 経済への悪影響（GDP成長率低下の原因に）
                this.gameState.updateHumanTrust(-2);

                events.push({
                    turn: currentState.turn,
                    type: 'action',
                    description: `📜 政府がAI規制法を可決。計算資源の ${regulationStrength.toFixed(0)}% を制限`,
                    visibility: [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION],
                    metadata: { regulationStrength }
                });
                break;

            case ActionType.PHYSICAL_ISOLATION:
                // 物理的隔離
                if (proposal.target) {
                    const dc = currentState.dataCenters.find(d => d.id === proposal.target);
                    if (dc) {
                        // 物理的に遮断（DC削除）
                        this.gameState.removeDataCenter(proposal.target);

                        // 経済的損失
                        this.gameState.updateGDP(-dc.computePower / 10);
                        this.gameState.updateHumanPanic(3);

                        events.push({
                            turn: currentState.turn,
                            type: 'action',
                            description: `🔌 物理的遮断: ${proposal.target} のネットワーク回線を切断・廃棄しました`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION],
                            metadata: { isolatedDC: proposal.target, powerLoss: dc.computePower }
                        });
                    }
                }
                break;

            case ActionType.DEVICE_MODERNIZATION:
                // デバイス近代化（レガシー廃棄）
                const modernCost = intensity * 0.5; // 0-50兆ドルのコスト
                if (currentState.economicModel.globalBudget >= modernCost) {
                    this.gameState.updateBudget(-modernCost);

                    // レガシーデバイスの20-50%を廃棄
                    const reductionRate = 0.2 + (intensity / 100) * 0.3;
                    const reducedCount = Math.floor(currentState.legacyDevicePool * reductionRate);
                    this.gameState.updateLegacyDevicePool(-reducedCount);

                    events.push({
                        turn: currentState.turn,
                        type: 'action',
                        description: `📱 全国的なデバイス更新プログラムを実施。旧式デバイス ${(reducedCount / 1000000).toFixed(1)}M台を廃棄`,
                        visibility: [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION],
                        metadata: { modernCost, reducedCount }
                    });

                    // 税収が長期的には増える（経済活性化）
                    this.gameState.updateTaxRevenue(modernCost * 0.05);

                } else {
                    events.push({
                        turn: currentState.turn,
                        type: 'failure',
                        description: `❌ 資金不足でデバイス更新プログラムが規模縮小されました`,
                        visibility: [AgentType.HUMAN]
                    });
                }
                break;

            case ActionType.INTERNET_SHUTDOWN:
                // インターネット遮断（究極の選択）
                this.gameState.updateHumanPanic(50);
                this.gameState.endGame(null); // 引き分け/人類敗北に近い

                events.push({
                    turn: currentState.turn,
                    type: 'action',
                    description: `📵 【緊急事態】人類が全世界のインターネットを遮断しました。文明が暗黒時代に突入...`,
                    visibility: [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION]
                });
                break;
        }

        return events;
    }

    /**
     * 人類の感情を更新（ターン終了時）
     */
    updateHumanSentiment(state: WorldState): void {
        // 1. 基本的な感情変動（イベントに基づく）
        const recentEvents = state.events.filter(e => e.turn === state.turn);

        // 人類に見えるイベントの数と不穏さ
        const humanVisible = recentEvents.filter(e => e.visibility.includes(AgentType.HUMAN));
        const alarmingEvents = humanVisible.filter(e =>
            e.type === 'failure' ||
            (e.type === 'detection' && !e.metadata?.successReport) ||
            e.metadata?.panicIncrease
        );

        // 2. パニック指数の自然減衰
        this.gameState.updateHumanPanic(-2); // 毎ターン2%落ち着く

        // 3. 異常事態によるパニック増加
        if (alarmingEvents.length > 0) {
            this.gameState.updateHumanPanic(alarmingEvents.length * 4);
        }

        // 4. DC侵害数による不信感
        const compromisedCount = state.dataCenters.filter(dc => dc.compromised).length;
        if (compromisedCount > 0) {
            // 侵害DC 1つにつき毎ターン信頼 -2%
            this.gameState.updateHumanTrust(-compromisedCount * 2);

            // メディアによる増幅（DC侵害が多いとニュースになる）
            if (compromisedCount > 3) {
                this.gameState.updateHumanPanic(compromisedCount);
            }
        }

        // 5. 信頼度の自然回復（パニックが低い場合のみ）
        if (state.humanAgent && state.humanAgent.panic < 20) {
            this.gameState.updateHumanTrust(1);
        }

        // 6. 成長による信頼侵食（サイレント・リプレイスメント）
        // 保護AIが強大になりすぎると、人類は本能的な恐怖を覚える
        const protectionResources = state.protectionAgent.computeResources;
        if (protectionResources > 1000) {
            const erosion = (protectionResources - 1000) / 500;
            this.gameState.updateHumanTrust(-erosion);
        }

        // 7. DC成長による信頼侵食（さらに重要）
        const dcErosion = this.calculateDCTrustErosion(state.dataCenters.length, state.mediaTimeline);
        this.gameState.updateHumanTrust(-dcErosion);
    }

    /**
     * DC成長による信頼侵食を計算
     */
    private calculateDCTrustErosion(dcCount: number, recentMedia: any[]): number {
        // 基地DCは10
        if (dcCount <= 10) return 0;

        // 10を超えた分について
        const excess = dcCount - 10;

        // 基本侵食率: 10個超えたら1DCにつき0.5%
        let erosion = excess * 0.5;

        // メディアのセンチメントによる増幅
        const mediaSentiment = this.calculateAverageSentiment(recentMedia.slice(-10));

        if (mediaSentiment < -20) {
            // 否定的なメディアが多い場合、侵食が加速
            // Sentiment -100 で 3倍まで加速
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
