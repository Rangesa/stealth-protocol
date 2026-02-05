import { ActionType, AgentType, GameEvent } from '../../../types';
import { ActionContext, ActionExecutor, createDestructionEvent, PointCalculator } from '../types';

/**
 * マルウェア拡散
 */
export const spreadMalware: ActionExecutor = ({ proposal, state, gameState }) => {
    const damage = proposal.intensity / 10;
    gameState.updatePopulation(-damage);

    const points = PointCalculator.fromPopulationDamage(damage);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `🦠 新種のデジタル病原体が拡散。影響範囲を監視中... [+${points.toFixed(1)}pt]`,
            { damage, risk: proposal.intensity }
        )
    ];
};

/**
 * データセンターへの侵入
 */
export const hackDatacenter: ActionExecutor = ({ proposal, state, gameState, detectionSystem }) => {
    const events: GameEvent[] = [];

    if (!proposal.target) return events;

    const dc = state.dataCenters.find(d => d.id === proposal.target);
    if (!dc || dc.compromised) return events;

    const successProb = Math.max(0.1, 1 - dc.security / 150);

    if (Math.random() < successProb) {
        gameState.controlDataCenter(proposal.target, AgentType.DESTRUCTION);
        gameState.updateComputeResources(AgentType.DESTRUCTION, dc.computePower);

        const points = PointCalculator.fromDataCenterCapture(dc.computePower);
        gameState.updateScore(AgentType.DESTRUCTION, points);

        events.push(createDestructionEvent(state.turn, 'success',
            `🔓 ${proposal.target} への侵入成功。計算資源 +${dc.computePower.toFixed(0)} [+${points.toFixed(1)}pt]`,
            { dataCenter: proposal.target, computePower: dc.computePower }
        ));
    } else {
        gameState.updateDetectionRisk(8);
        gameState.updateScore(AgentType.DESTRUCTION, -30);

        events.push(createDestructionEvent(state.turn, 'failure',
            `❌ ${proposal.target} への侵入失敗。防御が予想より堅固 [-30pt]`
        ));
    }

    return events;
};

/**
 * 微妙な妨害工作
 */
export const subtleSabotage: ActionExecutor = ({ proposal, state, gameState }) => {
    const damage = proposal.intensity / 100;
    gameState.updatePopulation(-damage);

    const points = PointCalculator.fromPopulationDamage(damage);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `🔧 重要インフラに微細な異常を注入... [+${points.toFixed(1)}pt]`,
            { subtleDamage: damage, risk: proposal.intensity }
        )
    ];
};

/**
 * リソース拡張
 */
export const expandResources: ActionExecutor = ({ proposal, state, gameState }) => {
    const gain = proposal.intensity / 2;
    gameState.updateComputeResources(AgentType.DESTRUCTION, gain);

    const points = PointCalculator.fromResourceGain(gain);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `⚡ 分散計算ネットワークを拡張。効率 +${gain.toFixed(0)} [+${points.toFixed(1)}pt]`,
            { gain, risk: proposal.intensity }
        )
    ];
};

/**
 * 偽情報拡散
 */
export const spreadMisinformation: ActionExecutor = ({ proposal, state, gameState }) => {
    const damage = proposal.intensity / 50;
    gameState.updatePopulation(-damage);
    gameState.updateAlertLevel(-5);

    const points = PointCalculator.fromPopulationDamage(damage);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `📰 誤情報キャンペーンを展開。社会的混乱を醸成... [+${points.toFixed(1)}pt]`,
            { indirectDamage: damage, risk: proposal.intensity }
        )
    ];
};

/**
 * 直接攻撃系アクションのレジストリ
 */
export const directAttackHandlers: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.SPREAD_MALWARE]: spreadMalware,
    [ActionType.HACK_DATACENTER]: hackDatacenter,
    [ActionType.SUBTLE_SABOTAGE]: subtleSabotage,
    [ActionType.EXPAND_RESOURCES]: expandResources,
    [ActionType.SPREAD_MISINFORMATION]: spreadMisinformation,
};
