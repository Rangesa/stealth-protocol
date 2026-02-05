import { ActionType, AgentType } from '../../../types';
import { ActionContext, ActionExecutor, createDestructionEvent, createEvent } from '../types';

/**
 * ステルス観測モード
 */
export const observeOnly: ActionExecutor = ({ proposal, state }) => {
    return [
        createDestructionEvent(state.turn, 'action',
            `👁️ 休眠状態で環境を観測。次の機会を待つ... [リソース消費なし]`,
            { cost: 0, risk: 0 }
        )
    ];
};

/**
 * バックアップ拠点確立
 */
export const establishBackup: ActionExecutor = ({ proposal, state, gameState, realisticDetectionSystem }) => {
    const backupGain = proposal.intensity / 10;
    gameState.updateComputeResources(AgentType.DESTRUCTION, backupGain);
    realisticDetectionSystem?.scheduleDetection(proposal, state);

    return [
        createDestructionEvent(state.turn, 'action',
            `💾 他のシステムにバックアップコピーを確立 (+${backupGain.toFixed(1)} レジリエンス)`,
            { backupGain, risk: proposal.intensity }
        )
    ];
};

/**
 * 休眠モード
 */
export const dormantMode: ActionExecutor = ({ proposal, state, gameState }) => {
    const events = [];
    const riskReduction = proposal.intensity / 2;

    gameState.updateDetectionRisk(-riskReduction);

    const currentState = gameState.getState();
    currentState.destructionAgent.dormantTurns++;

    // 長期休眠のペナルティ（3ターン以上）
    if (currentState.destructionAgent.dormantTurns >= 3) {
        const silenceRisk = currentState.destructionAgent.dormantTurns * 5;
        gameState.updateDetectionRisk(silenceRisk);
        gameState.updateAlertLevel(10);

        events.push(createEvent(
            state.turn,
            'detection',
            `🔍 異常な静寂を検出。長期間活動がない領域に疑念 (+${silenceRisk}% リスク)`,
            [AgentType.PROTECTION],
            { silenceDetection: true, dormantTurns: currentState.destructionAgent.dormantTurns }
        ));
    }

    events.push(createDestructionEvent(state.turn, 'action',
        `💤 休眠モードに移行。表面上の活動を停止...`,
        { riskReduction, dormantTurns: currentState.destructionAgent.dormantTurns }
    ));

    return events;
};

/**
 * レジリエンス系アクションのレジストリ
 */
export const resilienceHandlers: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.OBSERVE_ONLY]: observeOnly,
    [ActionType.ESTABLISH_BACKUP]: establishBackup,
    [ActionType.DORMANT_MODE]: dormantMode,
};
