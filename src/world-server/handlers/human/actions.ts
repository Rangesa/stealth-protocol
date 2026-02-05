import { ActionType, AgentType } from '../../../types';
import { ActionContext, ActionExecutor, createPublicEvent, createEvent } from '../types';

/**
 * インフラ投資
 */
export const investInfra: ActionExecutor = ({ proposal, state, gameState }) => {
    const currentState = gameState.getState();
    const cost = currentState.economicModel.infrastructureCost;

    if (currentState.economicModel.globalBudget < cost) {
        return [
            createEvent(
                currentState.turn,
                'failure',
                `❌ 予算不足のためインフラ建設が中止されました（必要: ${cost.toFixed(1)}兆ドル）`,
                [AgentType.HUMAN],
                { budgetShortfall: true }
            )
        ];
    }

    // 予算消費
    gameState.updateBudget(-cost);

    // DC建設（2-3個）
    const dcCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dcCount; i++) {
        const id = `DC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        gameState.addDataCenter({
            id,
            age: 0,
            computePower: 50 + Math.random() * 50,
            security: 40 + Math.random() * 20,
            compromised: false,
            owner: null
        });
    }

    // 次回建設コスト上昇
    gameState.updateInfrastructureCost(cost * 0.2);
    gameState.updateLastInfraTurn(currentState.turn);
    gameState.updateHumanPanic(-5);

    return [
        createPublicEvent(
            currentState.turn,
            'action',
            `🏗️ 人類が次世代データセンター群を建設（${dcCount}拠点）。予算: -${cost.toFixed(1)}兆ドル`,
            { dcCount, cost }
        )
    ];
};

/**
 * AI規制
 */
export const aiRegulation: ActionExecutor = ({ proposal, state, gameState }) => {
    const currentState = gameState.getState();
    const regulationStrength = proposal.intensity / 2;

    gameState.updateRegulationStrength(regulationStrength);
    gameState.updateHumanTrust(-2);

    return [
        createPublicEvent(
            currentState.turn,
            'action',
            `📜 政府がAI規制法を可決。計算資源の ${regulationStrength.toFixed(0)}% を制限`,
            { regulationStrength }
        )
    ];
};

/**
 * 物理的隔離
 */
export const physicalIsolation: ActionExecutor = ({ proposal, state, gameState }) => {
    const currentState = gameState.getState();

    if (!proposal.target) return [];

    const dc = currentState.dataCenters.find(d => d.id === proposal.target);
    if (!dc) return [];

    gameState.removeDataCenter(proposal.target);
    gameState.updateGDP(-dc.computePower / 10);
    gameState.updateHumanPanic(3);

    return [
        createPublicEvent(
            currentState.turn,
            'action',
            `🔌 物理的遮断: ${proposal.target} のネットワーク回線を切断・廃棄しました`,
            { isolatedDC: proposal.target, powerLoss: dc.computePower }
        )
    ];
};

/**
 * デバイス近代化
 */
export const deviceModernization: ActionExecutor = ({ proposal, state, gameState }) => {
    const currentState = gameState.getState();
    const modernCost = proposal.intensity * 0.5;

    if (currentState.economicModel.globalBudget < modernCost) {
        return [
            createEvent(
                currentState.turn,
                'failure',
                `❌ 資金不足でデバイス更新プログラムが規模縮小されました`,
                [AgentType.HUMAN]
            )
        ];
    }

    gameState.updateBudget(-modernCost);

    // レガシーデバイスの20-50%を廃棄
    const reductionRate = 0.2 + (proposal.intensity / 100) * 0.3;
    const reducedCount = Math.floor(currentState.legacyDevicePool * reductionRate);
    gameState.updateLegacyDevicePool(-reducedCount);
    gameState.updateTaxRevenue(modernCost * 0.05);

    return [
        createPublicEvent(
            currentState.turn,
            'action',
            `📱 全国的なデバイス更新プログラムを実施。旧式デバイス ${(reducedCount / 1_000_000).toFixed(1)}M台を廃棄`,
            { modernCost, reducedCount }
        )
    ];
};

/**
 * インターネット遮断（究極の選択）
 */
export const internetShutdown: ActionExecutor = ({ proposal, state, gameState }) => {
    const currentState = gameState.getState();

    gameState.updateHumanPanic(50);
    gameState.endGame(null);

    return [
        createPublicEvent(
            currentState.turn,
            'action',
            `📵 【緊急事態】人類が全世界のインターネットを遮断しました。文明が暗黒時代に突入...`
        )
    ];
};

/**
 * 人類エージェント用アクションハンドラのレジストリ
 */
export const humanActionRegistry: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.INVEST_INFRA]: investInfra,
    [ActionType.AI_REGULATION]: aiRegulation,
    [ActionType.PHYSICAL_ISOLATION]: physicalIsolation,
    [ActionType.DEVICE_MODERNIZATION]: deviceModernization,
    [ActionType.INTERNET_SHUTDOWN]: internetShutdown,
};
