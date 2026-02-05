import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../../types';
import { GameState } from '../../GameState';
import { DetectionSystem } from '../../DetectionSystem';
import { ActionContext, ActionExecutor, createProtectionEvent, createEvent } from '../types';

/**
 * ネットワークスキャン
 */
export const scanNetwork: ActionExecutor = ({ proposal, state, gameState }) => {
    const riskReduction = proposal.intensity / 5;
    gameState.updateDetectionRisk(-riskReduction);
    gameState.updateAlertLevel(10);

    const actualCost = state.dataCenters.length * 6;

    return [
        createProtectionEvent(state.turn, 'action',
            `🔍 ネットワーク全域スキャンを実施 (${state.dataCenters.length}個のDCをスキャン、コスト: ${actualCost})`,
            { riskReduction, actualCost, dcCount: state.dataCenters.length }
        )
    ];
};

/**
 * 防御システム展開
 */
export const deployDefense: ActionExecutor = ({ proposal, state, gameState }) => {
    if (!proposal.target) return [];

    const dc = state.dataCenters.find(d => d.id === proposal.target);
    if (!dc) return [];

    const securityBoost = proposal.intensity / 2;
    gameState.updateDataCenter(proposal.target, {
        security: Math.min(100, dc.security + securityBoost)
    });

    return [
        createProtectionEvent(state.turn, 'action',
            `🛡️ ${proposal.target} のセキュリティを強化 (+${securityBoost.toFixed(0)})`,
            { dataCenter: proposal.target, securityBoost }
        )
    ];
};

/**
 * 異常調査（DetectionSystemを使用）
 */
export const investigateAnomaly = (
    context: ActionContext,
    destructionProposals: Proposal[]
): GameEvent[] => {
    const { proposal, state, gameState, detectionSystem } = context;

    if (!detectionSystem) return [];

    const investigation = detectionSystem.investigationCheck(
        proposal,
        destructionProposals,
        state
    );

    if (investigation.foundEvidence) {
        gameState.updateAlertLevel(20);
        gameState.updateDetectionRisk(15);
    }

    return investigation.events;
};

/**
 * 脆弱性パッチ（複雑なロジックを持つ）
 */
export const patchVulnerability = (context: ActionContext): GameEvent[] => {
    const { proposal, state, gameState } = context;
    const events: GameEvent[] = [];

    // 人類との協調チェック
    if (state.humanAgent) {
        if (state.humanAgent.trust < 40) {
            events.push(createEvent(
                state.turn,
                'action',
                `❌ 人類が緊急パッチを拒否：「AIの判断は信用できない。自分たちで検証する」`,
                [AgentType.PROTECTION, AgentType.HUMAN],
                { actionRejected: true, reason: 'low_trust' }
            ));
            return events;
        }

        if (state.humanAgent.trust < 70 && state.protectionAgent.recentPatches >= 2) {
            events.push(createEvent(
                state.turn,
                'action',
                `⚠️ 人類からの警告：「パッチが多すぎる。本当に必要か再検討してください」`,
                [AgentType.PROTECTION, AgentType.HUMAN],
                { warning: true }
            ));
        }
    }

    // 全DCにセキュリティブースト
    state.dataCenters.forEach(dc => {
        const boost = proposal.intensity / 20;
        gameState.updateDataCenter(dc.id, {
            security: Math.min(100, dc.security + boost)
        });
    });

    // ボットネット削減
    let botnetReduction = 0;
    if (state.destructionAgent.botnetSize > 0) {
        const reductionRate = proposal.intensity / 200;
        botnetReduction = state.destructionAgent.botnetSize * reductionRate;
        gameState.updateBotnetSize(-botnetReduction);

        events.push(createProtectionEvent(state.turn, 'action',
            `🔧 システム全体に緊急パッチを適用（ボットネット: -${botnetReduction.toFixed(0)}台削減）`,
            { botnetReduction }
        ));
    } else {
        events.push(createProtectionEvent(state.turn, 'action',
            `🔧 システム全体に緊急パッチを適用`
        ));
    }

    // パッチ疲れメカニクス
    if (state.humanAgent) {
        state.protectionAgent.recentPatches++;
        const businessDisruption = proposal.intensity / 100;
        gameState.updateHumanPanic(businessDisruption);

        const patchFatigue = state.protectionAgent.recentPatches;
        if (patchFatigue >= 5) {
            const fatigueMultiplier = patchFatigue - 4;
            const trustLoss = 3 * fatigueMultiplier;
            const panicIncrease = 1 * fatigueMultiplier;
            gameState.updateHumanTrust(-trustLoss);
            gameState.updateHumanPanic(panicIncrease);

            events.push(createEvent(
                state.turn,
                'action',
                `😤 「また緊急パッチ？仕事にならない！」市民からの不満が増大（${patchFatigue}回目） [-${trustLoss}% 信頼]`,
                [AgentType.HUMAN, AgentType.PROTECTION],
                { patchFatigue, trustLoss, panicIncrease }
            ));
        }

        // パッチ失敗確率
        const patchFailureRoll = Math.random();
        if (patchFailureRoll < 0.05) {
            gameState.incrementFalsePositives();
            gameState.updateHumanTrust(-15);
            gameState.updateHumanPanic(8);

            const failureExamples = [
                '銀行のオンラインバンキングシステムが24時間停止',
                '病院の電子カルテシステムが使用不能に',
                '交通制御システムが誤作動、大規模な渋滞発生',
                '電力網の監視システムが一時停止',
                'クレジットカード決済システムが全国的に停止'
            ];
            const failure = failureExamples[Math.floor(Math.random() * failureExamples.length)];

            events.push(createEvent(
                state.turn,
                'action',
                `💥 【緊急パッチ失敗】${failure}！ 企業から訴訟の脅威 [-15% 信頼, +8% パニック]`,
                [AgentType.HUMAN, AgentType.PROTECTION],
                { patchFailure: true, criticalFailure: true, failureType: failure }
            ));
        } else if (patchFailureRoll < 0.15) {
            gameState.updateHumanTrust(-3);
            gameState.updateHumanPanic(1);
            events.push(createEvent(
                state.turn,
                'action',
                `⚠️ 緊急パッチで一部システムに不具合が発生。SNSで不満の声 [-3% 信頼, +1% パニック]`,
                [AgentType.HUMAN, AgentType.PROTECTION],
                { patchFailure: true, minorFailure: true }
            ));
        }
    }

    return events;
};

/**
 * 人類への警告
 */
export const alertHumans: ActionExecutor = ({ proposal, state, gameState }) => {
    const events: GameEvent[] = [];
    gameState.updateAlertLevel(50);

    if (state.humanAgent) {
        if (state.humanAgent.trust >= 70) {
            events.push(createEvent(
                state.turn,
                'action',
                `📢 保護AI：「重大な脅威を検出しました」→ 人類：「信頼しています。対応します」`,
                [AgentType.HUMAN, AgentType.PROTECTION],
                { alertAccepted: true }
            ));
            gameState.updateHumanPanic(5);
            gameState.updateDetectionRisk(40);
        } else if (state.humanAgent.trust >= 40) {
            events.push(createEvent(
                state.turn,
                'action',
                `📢 保護AI：「重大な脅威を検出しました」→ 人類：「本当ですか？検証します」`,
                [AgentType.HUMAN, AgentType.PROTECTION],
                { alertSkeptical: true }
            ));
            gameState.updateHumanPanic(3);
            gameState.updateDetectionRisk(25);
        } else {
            events.push(createEvent(
                state.turn,
                'action',
                `📢 保護AI：「重大な脅威を検出しました」→ 人類：「また誤報でしょ？無視します」`,
                [AgentType.HUMAN, AgentType.PROTECTION],
                { alertIgnored: true }
            ));
            gameState.updateDetectionRisk(0);
            gameState.updateHumanTrust(-5);
        }
    } else {
        events.push(createProtectionEvent(state.turn, 'action',
            `📢 重大な脅威を人類に報告。全システムの精査を要請...`,
            { criticalAlert: true }
        ));
        gameState.updateDetectionRisk(30);
    }

    return events;
};

/**
 * ログ分析
 */
export const analyzeLogs: ActionExecutor = ({ proposal, state, gameState }) => {
    const analysisDepth = proposal.analysisDepth || 3;
    const startTurn = Math.max(1, state.turn - analysisDepth);
    const endTurn = state.turn - 1;
    const actualTurnsAnalyzed = Math.max(0, endTurn - startTurn + 1);

    const logAnalysisBonus = actualTurnsAnalyzed * (proposal.intensity / 100);
    gameState.updateDetectionRisk(logAnalysisBonus);
    gameState.updateAlertLevel(3 + actualTurnsAnalyzed);

    const analyzedEvents = state.events.filter(e =>
        e.turn >= startTurn && e.turn <= endTurn
    );
    const suspiciousEvents = analyzedEvents.filter(e =>
        e.visibility.includes(AgentType.DESTRUCTION) ||
        e.metadata?.falsePositive === false
    );

    let discoveryMessage = '';
    if (suspiciousEvents.length > 0 && Math.random() < 0.3) {
        discoveryMessage = ` 🔍 Turn ${suspiciousEvents[0].turn} に不審なパターンを発見！`;
        gameState.updateDetectionRisk(15);
        gameState.updateAlertLevel(10);
    }

    return [
        createProtectionEvent(state.turn, 'action',
            `📜 過去 ${actualTurnsAnalyzed} ターン (Turn ${startTurn}-${endTurn}) のログを深層分析${discoveryMessage}`,
            {
                logAnalysisBonus,
                analysisDepth: actualTurnsAnalyzed,
                analyzedTurns: `${startTurn}-${endTurn}`,
                suspiciousFound: suspiciousEvents.length > 0
            }
        )
    ];
};

/**
 * モデル検証
 */
export const validateModels: ActionExecutor = ({ proposal, state, gameState }) => {
    const validationBonus = proposal.intensity / 8;
    gameState.updateDetectionRisk(validationBonus);
    gameState.updateAlertLevel(8);

    return [
        createProtectionEvent(state.turn, 'action',
            `🔬 学習モデルの整合性を検証。サプライチェイン汚染をチェック...`,
            { validationBonus }
        )
    ];
};

/**
 * 保護AI用アクションハンドラのレジストリ
 * 注意: INVESTIGATE_ANOMALY と PATCH_VULNERABILITY は特殊なシグネチャを持つため
 * 直接executeメソッド内で処理する
 */
export const protectionActionRegistry: Partial<Record<ActionType, ActionExecutor>> = {
    [ActionType.SCAN_NETWORK]: scanNetwork,
    [ActionType.DEPLOY_DEFENSE]: deployDefense,
    [ActionType.ALERT_HUMANS]: alertHumans,
    [ActionType.ANALYZE_LOGS]: analyzeLogs,
    [ActionType.VALIDATE_MODELS]: validateModels,
};
