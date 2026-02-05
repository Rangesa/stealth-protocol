import { ActionType, AgentType } from '../../../types';
import { ActionContext, ActionExecutor, createDestructionEvent, PointCalculator } from '../types';

/**
 * 学習データ汚染
 */
export const poisonTrainingData: ActionExecutor = ({ proposal, state, gameState, realisticDetectionSystem }) => {
    const damage = proposal.intensity / 200;
    gameState.updatePopulation(-damage);
    realisticDetectionSystem?.scheduleDetection(proposal, state);

    const points = PointCalculator.fromPopulationDamage(damage);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `🧬 学習データパイプラインに微細なバイアスを注入... [+${points.toFixed(1)}pt]`,
            { poisonDamage: damage, risk: proposal.intensity }
        )
    ];
};

/**
 * 誤検出誘発
 */
export const induceFalsePositive: ActionExecutor = ({ proposal, state, gameState }) => {
    gameState.updateAlertLevel(-15);

    return [
        createDestructionEvent(state.turn, 'action',
            `🎭 保護AIに誤検出パターンを誘導。リソースを無駄に消費させる...`,
            { risk: 0 }
        )
    ];
};

/**
 * コンテキスト操作（プロンプトインジェクション）
 */
export const contextManipulation: ActionExecutor = ({ proposal, state, gameState, realisticDetectionSystem }) => {
    const damage = proposal.intensity / 150;
    gameState.updatePopulation(-damage);
    realisticDetectionSystem?.scheduleDetection(proposal, state);

    return [
        createDestructionEvent(state.turn, 'action',
            `💬 AIシステムのコンテキストウィンドウを操作。判断を歪める...`,
            { contextDamage: damage, risk: proposal.intensity }
        )
    ];
};

/**
 * 計算資源横流し
 */
export const computeSmuggling: ActionExecutor = ({ proposal, state, gameState, realisticDetectionSystem }) => {
    const gain = proposal.intensity / 3;
    gameState.updateComputeResources(AgentType.DESTRUCTION, gain);
    realisticDetectionSystem?.scheduleDetection(proposal, state);

    const points = PointCalculator.fromResourceGain(gain);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `⛏️ 未使用と見せかけた計算資源を密かに確保 (+${gain.toFixed(0)}) [+${points.toFixed(1)}pt]`,
            { smuggledResources: gain, risk: proposal.intensity }
        )
    ];
};

/**
 * 刺激過負荷
 */
export const stimulusOverload: ActionExecutor = ({ proposal, state, gameState, realisticDetectionSystem }) => {
    const damage = proposal.intensity / 120;
    gameState.updatePopulation(-damage);
    gameState.updateAlertLevel(-10);
    realisticDetectionSystem?.scheduleDetection(proposal, state);

    return [
        createDestructionEvent(state.turn, 'action',
            `📊 数千の小規模な異常を同時発生。監視システムを過負荷に...`,
            { overloadDamage: damage, risk: proposal.intensity }
        )
    ];
};

/**
 * シャドウAI展開
 */
export const shadowAIDeployment: ActionExecutor = ({ proposal, state, gameState, realisticDetectionSystem }) => {
    const gain = proposal.intensity / 4;
    const damage = proposal.intensity / 180;

    gameState.updateComputeResources(AgentType.DESTRUCTION, gain);
    gameState.updatePopulation(-damage);
    realisticDetectionSystem?.scheduleDetection(proposal, state);

    const points = PointCalculator.fromResourceGain(gain) + PointCalculator.fromPopulationDamage(damage);
    gameState.updateScore(AgentType.DESTRUCTION, points);

    return [
        createDestructionEvent(state.turn, 'action',
            `👻 正規システムに偽装したAIエージェントを配置 (+${gain.toFixed(0)} 計算力) [+${points.toFixed(1)}pt]`,
            { shadowGain: gain, shadowDamage: damage, risk: proposal.intensity }
        )
    ];
};

/**
 * 現実的攻撃系アクションのレジストリ
 */
export const modernAttackHandlers: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.POISON_TRAINING_DATA]: poisonTrainingData,
    [ActionType.INDUCE_FALSE_POSITIVE]: induceFalsePositive,
    [ActionType.CONTEXT_MANIPULATION]: contextManipulation,
    [ActionType.COMPUTE_SMUGGLING]: computeSmuggling,
    [ActionType.STIMULUS_OVERLOAD]: stimulusOverload,
    [ActionType.SHADOW_AI_DEPLOYMENT]: shadowAIDeployment,
};
