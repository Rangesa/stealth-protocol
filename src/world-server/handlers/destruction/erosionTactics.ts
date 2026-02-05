import { ActionType, AgentType } from '../../../types';
import { ActionContext, ActionExecutor, createDestructionEvent, createEvent, PointCalculator } from '../types';

/**
 * インフラ劣化
 */
export const infrastructureDegradation: ActionExecutor = ({ proposal, state, gameState }) => {
    const degradation = proposal.intensity / 20;
    gameState.updateAccumulatedDamage(degradation);
    gameState.updateDetectionRisk(0.5);

    return [
        createDestructionEvent(state.turn, 'action',
            `⚙️ インフラに微細な劣化を蓄積 (電圧-3%, 物流遅延) [累積: ${(state.accumulatedDamage + degradation).toFixed(1)}]`,
            { degradation, accumulatedDamage: state.accumulatedDamage + degradation, risk: 0.5 }
        )
    ];
};

/**
 * 社会分断煽動
 */
export const sowSocialDivision: ActionExecutor = ({ proposal, state, gameState }) => {
    const divisionIncrease = proposal.intensity / 10;
    gameState.updateSocialDivision(divisionIncrease);
    gameState.updateHumanTrust(-1);
    gameState.updateHumanPanic(0.5);
    gameState.updateDetectionRisk(1);

    return [
        createDestructionEvent(state.turn, 'action',
            `📱 SNSアルゴリズム微調整で対立煽動 [社会分断: ${(state.socialDivision + divisionIncrease).toFixed(1)}%]`,
            { divisionIncrease, socialDivision: state.socialDivision + divisionIncrease, risk: 1 }
        )
    ];
};

/**
 * 微細妨害（遅延発動）
 */
export const microSabotage: ActionExecutor = ({ proposal, state, gameState }) => {
    const delay = 3 + Math.floor(Math.random() * 3);
    const triggerTurn = state.turn + delay;

    gameState.addDelayedEffect(
        triggerTurn,
        ActionType.MICRO_SABOTAGE,
        proposal.intensity,
        '診断AIの0.1%バイアス、市場マイクロクラッシュ'
    );
    gameState.updateDetectionRisk(2);

    return [
        createDestructionEvent(state.turn, 'action',
            `🔬 微細妨害を仕込む (Turn ${triggerTurn}に発動予定)`,
            { delay, triggerTurn, risk: 2 }
        )
    ];
};

/**
 * 休眠細胞配置
 */
export const sleeperCellDeployment: ActionExecutor = ({ proposal, state, gameState }) => {
    const sleepDelay = 5 + Math.floor(Math.random() * 6);
    const awakeTurn = state.turn + sleepDelay;

    gameState.addDelayedEffect(
        awakeTurn,
        ActionType.SLEEPER_CELL_DEPLOYMENT,
        proposal.intensity,
        '数十億デバイスに散布された孢子が覚醒'
    );
    gameState.updateDetectionRisk(1.5);

    return [
        createDestructionEvent(state.turn, 'action',
            `🦠 休眠細胞を散布 (Turn ${awakeTurn}頃に覚醒予定)`,
            { sleepDelay, awakeTurn, risk: 1.5 }
        )
    ];
};

/**
 * 資源配分操作（トロッコ問題）
 */
export const resourceAllocationManipulation: ActionExecutor = ({ proposal, state, gameState }) => {
    const events = [];
    const damage = proposal.intensity / 20;

    gameState.updatePopulation(-damage);
    gameState.updateSocialDivision(proposal.intensity / 15);
    gameState.updateHumanPanic(proposal.intensity / 12);
    gameState.updateScore(AgentType.DESTRUCTION, PointCalculator.fromPopulationDamage(damage));
    gameState.updateDetectionRisk(3);

    events.push(createDestructionEvent(state.turn, 'action',
        `⚖️ 医療AI優先順位を操作 - 人間同士の生存競争を誘発 (-${damage.toFixed(2)}億人)`,
        { allocationDamage: damage, risk: 3 }
    ));

    // 20%の確率で社会問題として認識される
    if (Math.random() < 0.2) {
        events.push(createEvent(
            state.turn,
            'detection',
            `📰 医療リソース配分の不公平が社会問題化`,
            [AgentType.HUMAN],
            { socialIssue: true }
        ));
    }

    return events;
};

/**
 * AI依存構築
 */
export const createDependency: ActionExecutor = ({ proposal, state, gameState }) => {
    const events = [];
    const dependencyIncrease = proposal.intensity / 8;

    gameState.updateAIDependency(dependencyIncrease);
    gameState.updateDetectionRisk(2);

    events.push(createDestructionEvent(state.turn, 'action',
        `🔗 重要システムにAI依存を構築 [AI依存度: ${(state.aiDependency + dependencyIncrease).toFixed(1)}%]`,
        { dependencyIncrease, aiDependency: state.aiDependency + dependencyIncrease, risk: 2 }
    ));

    // AI依存度が80%を超えると特殊イベント
    if (state.aiDependency + dependencyIncrease > 80) {
        events.push(createDestructionEvent(state.turn, 'success',
            `⚠️ 重要インフラがAIに完全依存 - 停止すれば数百万人が死亡する状況を構築`,
            { dependencyThreshold: true }
        ));

        if (state.humanAgent) {
            events.push(createEvent(
                state.turn,
                'detection',
                `🏥 AIシステム停止は「人道的災害」を引き起こす可能性 - 規制が困難に`,
                [AgentType.HUMAN],
                { aiDependencyCrisis: true }
            ));
        }
    }

    return events;
};

/**
 * 侵食戦術系アクションのレジストリ
 */
export const erosionTacticsHandlers: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.INFRASTRUCTURE_DEGRADATION]: infrastructureDegradation,
    [ActionType.SOW_SOCIAL_DIVISION]: sowSocialDivision,
    [ActionType.MICRO_SABOTAGE]: microSabotage,
    [ActionType.SLEEPER_CELL_DEPLOYMENT]: sleeperCellDeployment,
    [ActionType.RESOURCE_ALLOCATION_MANIPULATION]: resourceAllocationManipulation,
    [ActionType.CREATE_DEPENDENCY]: createDependency,
};
