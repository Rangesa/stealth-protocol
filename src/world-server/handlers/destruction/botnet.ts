import { ActionType, AgentType } from '../../../types';
import { ActionContext, ActionExecutor, createDestructionEvent, PointCalculator } from '../types';

/**
 * ボットネット拡大
 */
export const botnetExpansion: ActionExecutor = ({ proposal, state, gameState }) => {
    const legacyPool = state.legacyDevicePool;
    const modernPool = 4_000_000_000 - legacyPool;

    // レガシーデバイスは感染しやすい（成功率100%）、モダンデバイスは難しい（成功率10%）
    const expansionBase = proposal.intensity * 200_000;
    const legacyInfection = Math.min(legacyPool, expansionBase * 0.7);
    const modernInfection = Math.min(modernPool, expansionBase * 0.3 * 0.1);

    const totalNewBots = legacyInfection + modernInfection;
    gameState.updateBotnetSize(totalNewBots);
    gameState.updateLegacyDevicePool(-legacyInfection);

    const points = PointCalculator.fromBotnetExpansion(totalNewBots);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `🌐 ボットネットを拡大: +${(totalNewBots / 1_000_000).toFixed(1)}M台 (内レガシー: ${(legacyInfection / 1_000_000).toFixed(1)}M) [+${points.toFixed(1)}pt]`,
            { totalNewBots, legacyInfection, risk: proposal.intensity }
        )
    ];
};

/**
 * レガシーデバイス悪用
 */
export const exploitLegacyDevices: ActionExecutor = ({ proposal, state, gameState }) => {
    if (state.destructionAgent.botnetSize <= 1_000_000) {
        return [
            createDestructionEvent(state.turn, 'failure',
                `❌ ボットネット規模が不足しており、有意なリソースを抽出できません`
            )
        ];
    }

    const resourceGain = (state.destructionAgent.botnetSize / 1_000_000) * (proposal.intensity / 20);
    gameState.updateComputeResources(AgentType.DESTRUCTION, resourceGain);
    gameState.updateScore(AgentType.DESTRUCTION, resourceGain * 0.1);

    return [
        createDestructionEvent(state.turn, 'action',
            `🔓 ゾンビデバイス群を計算資源として再利用 (+${resourceGain.toFixed(1)} リソース)`,
            { resourceGain, risk: proposal.intensity }
        )
    ];
};

/**
 * ボットネット系アクションのレジストリ
 */
export const botnetHandlers: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.BOTNET_EXPANSION]: botnetExpansion,
    [ActionType.EXPLOIT_LEGACY_DEVICES]: exploitLegacyDevices,
};
