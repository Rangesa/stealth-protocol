import { GameState } from '../GameState';
import { WorldState, AgentType } from '../../types';
import { GameBalance } from '../../config/GameBalance';

/**
 * インフラとリソースの自然更新を担当するクラス
 */
export class InfrastructureSystem {
    constructor(private gameState: GameState) { }

    /**
     * 毎ターンのインフラ状態と自動収入を更新
     */
    update(state: WorldState): void {
        // 1. 破壊AIの支配DCから自動収入
        const controlledDCs = state.dataCenters.filter(dc =>
            dc.compromised && dc.owner === AgentType.DESTRUCTION
        );

        let totalDCIncome = 0;
        const isDormant = state.destructionAgent.dormantTurns > 0;
        const incomeMultiplier = isDormant ? 0.5 : 1.0;

        controlledDCs.forEach(dc => {
            const baseIncome = dc.computePower * GameBalance.turnIncome.controlledDCMultiplier;
            const income = baseIncome * incomeMultiplier;
            totalDCIncome += income;
            this.gameState.updateComputeResources(AgentType.DESTRUCTION, income);
        });

        if (totalDCIncome > 0) {
            const dcPoints = totalDCIncome * GameBalance.turnIncome.dcIncomePointsMultiplier;
            this.gameState.updateScore(AgentType.DESTRUCTION, dcPoints);
        }

        // 2. 保護AIのリソース回復（固定予算）
        this.gameState.updateComputeResources(
            AgentType.PROTECTION,
            GameBalance.turnIncome.protectionAIRecovery
        );

        // 3. ボットネットの自動収入と減衰
        if (state.destructionAgent.botnetSize > 0) {
            const botnetIncome = this.gameState.calculateBotnetResources() * 0.1;
            this.gameState.updateComputeResources(AgentType.DESTRUCTION, botnetIncome);

            const botnetPoints = botnetIncome * 0.05;
            this.gameState.updateScore(AgentType.DESTRUCTION, botnetPoints);

            const decayRate = 0.02;
            const botnetDecay = state.destructionAgent.botnetSize * decayRate;
            this.gameState.updateBotnetSize(-botnetDecay);
        }

        // 4. レガシーデバイスプールの自然増加
        const totalDevices = 4000000000;
        const currentLegacyRate = state.legacyDevicePool / totalDevices;

        if (currentLegacyRate < 0.5) {
            const agingRate = 0.003;
            const modernDevices = totalDevices - state.legacyDevicePool;
            const newLegacyDevices = Math.floor(modernDevices * agingRate);

            this.gameState.updateLegacyDevicePool(newLegacyDevices);

            if (state.turn % 10 === 0 && newLegacyDevices > totalDevices * 0.01) {
                this.gameState.addEvent({
                    turn: state.turn,
                    type: 'action',
                    description: `📱 ${(newLegacyDevices / 1000000).toFixed(1)}M台のデバイスがサポート終了（レガシー化率: ${(currentLegacyRate * 100).toFixed(1)}%）`,
                    visibility: [AgentType.HUMAN],
                    metadata: { legacyGrowth: newLegacyDevices }
                });
            }
        }

        // 5. 累積ダメージの適用
        if (state.accumulatedDamage > 0) {
            const cumulativeDamage = state.accumulatedDamage * 0.01;
            this.gameState.updatePopulation(-cumulativeDamage);
        }

        // 6. 社会分断の影響
        if (state.socialDivision > 50) {
            const divisionPenalty = (state.socialDivision - 50) * 0.2;
            this.gameState.updateComputeResources(AgentType.PROTECTION, -divisionPenalty);
        }
    }
}
