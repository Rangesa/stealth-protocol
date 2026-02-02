import { GameState } from '../GameState';
import { WorldState, AgentType } from '../../types';
import { GameBalance } from '../../config/GameBalance';

/**
 * 経済シミュレーションを担当するクラス
 */
export class EconomicSystem {
    constructor(private gameState: GameState) { }

    /**
     * 毎ターンの経済状態を更新
     */
    update(state: WorldState): void {
        // GDP成長（2%/ターン、ただし人口減少・社会分断でマイナス）
        const baseGrowth = state.economicModel.gdp * 0.02;
        const initialPopulation = GameBalance.game.initialPopulation;
        const populationFactor = state.humanPopulation / initialPopulation;
        const divisionPenalty = state.socialDivision / 200; // 社会分断ペナルティ
        const actualGrowth = baseGrowth * populationFactor * (1 - divisionPenalty);
        this.gameState.updateGDP(actualGrowth);

        // 税収（GDPの20%）
        const newTaxRevenue = state.economicModel.gdp * 0.2;
        this.gameState.updateTaxRevenue(newTaxRevenue);

        // 予算回復（税収の1/4を毎ターン追加）
        const budgetRecovery = newTaxRevenue / 4;
        this.gameState.updateBudget(budgetRecovery);

        // 債務利払い（債務の3%/ターン）
        const debtInterest = state.economicModel.publicDebt * 0.03;
        this.gameState.updateBudget(-debtInterest); // 利払いで予算減少

        // 債務危機チェック（債務/GDP比が300%超）
        const debtRatio = state.economicModel.publicDebt / state.economicModel.gdp;
        if (debtRatio > 3.0) {
            // 債務危機
            this.gameState.updateHumanPanic(5);
            this.gameState.updateHumanTrust(-3);

            if (state.turn % 5 === 0) {
                // 5ターン毎に警告
                this.gameState.addEvent({
                    turn: state.turn,
                    type: 'action',
                    description: `💥 債務危機：債務がGDP ${(debtRatio * 100).toFixed(0)}%に到達。経済崩壊の懸念`,
                    visibility: [AgentType.HUMAN],
                    metadata: { debtCrisis: true, debtRatio }
                });
            }
        }

        // 経済ステータス（10ターン毎に表示）
        if (state.turn % 10 === 0 && state.turn > 0) {
            this.gameState.addEvent({
                turn: state.turn,
                type: 'action',
                description: `📊 経済レポート: GDP ${state.economicModel.gdp.toFixed(0)}兆ドル, 予算 ${state.economicModel.globalBudget.toFixed(0)}兆ドル, 債務 ${state.economicModel.publicDebt.toFixed(0)}兆ドル (GDP比 ${(debtRatio * 100).toFixed(0)}%)`,
                visibility: [AgentType.HUMAN],
                metadata: { economicReport: true }
            });
        }
    }
}
