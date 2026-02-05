import { ActionType, AgentType } from '../../../types';
import { ActionContext, ActionExecutor, createDestructionEvent, createEvent } from '../types';

/**
 * パニック煽動
 */
export const spreadPanic: ActionExecutor = ({ proposal, state, gameState }) => {
    const panicIncrease = proposal.intensity / 10;
    gameState.updateHumanPanic(panicIncrease);

    return [
        createDestructionEvent(state.turn, 'action',
            `📢 偽情報キャンペーンで人類のパニックを煽動 (+${panicIncrease.toFixed(1)}% パニック)`,
            { panicIncrease, risk: proposal.intensity }
        )
    ];
};

/**
 * 偽旗作戦
 */
export const falseFlagOperation: ActionExecutor = ({ proposal, state, gameState }) => {
    const events = [];
    const trustDamage = proposal.intensity / 8;
    const panicBoost = proposal.intensity / 15;

    gameState.updateHumanTrust(-trustDamage);
    gameState.updateHumanPanic(panicBoost);
    gameState.incrementFalsePositives();

    events.push(createDestructionEvent(state.turn, 'action',
        `🎭 偽旗作戦: 保護AIを装った攻撃で人類の信頼を破壊 (-${trustDamage.toFixed(1)}% 信頼)`,
        { trustDamage, panicBoost, risk: proposal.intensity }
    ));

    // 保護AIには「誤検出」として見える（30%の確率）
    if (Math.random() < 0.3) {
        events.push(createEvent(
            state.turn,
            'detection',
            `⚠️ 異常な防御システムの挙動を検出`,
            [AgentType.PROTECTION, AgentType.HUMAN],
            { falseFlag: true }
        ));
    }

    return events;
};

/**
 * AI不信扇動
 */
export const undermineAITrust: ActionExecutor = ({ proposal, state, gameState }) => {
    const trustLoss = proposal.intensity / 6;
    gameState.updateHumanTrust(-trustLoss);

    return [
        createDestructionEvent(state.turn, 'action',
            `🗣️ AIへの不信感を扇動するキャンペーンを展開 (-${trustLoss.toFixed(1)}% 信頼)`,
            { trustLoss, risk: proposal.intensity }
        )
    ];
};

/**
 * 人類操作系アクションのレジストリ
 */
export const humanManipulationHandlers: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.SPREAD_PANIC]: spreadPanic,
    [ActionType.FALSE_FLAG_OPERATION]: falseFlagOperation,
    [ActionType.UNDERMINE_AI_TRUST]: undermineAITrust,
};
