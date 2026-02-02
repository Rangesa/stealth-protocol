import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';
import { DetectionSystem } from '../DetectionSystem';

/**
 * 保護AIの行動実行を担当するクラス
 */
export class ProtectionActionHandler {
    constructor(
        private gameState: GameState,
        private detectionSystem: DetectionSystem
    ) { }

    /**
     * 保護AIの行動を実行
     */
    execute(
        proposal: Proposal,
        state: WorldState,
        destructionProposals: Proposal[]
    ): GameEvent[] {
        const events: GameEvent[] = [];

        // 動的コスト計算（SCAN_NETWORK, ANALYZE_LOGS）
        let actualCost = proposal.cost;
        if (proposal.actionType === ActionType.SCAN_NETWORK) {
            // 全データセンター数 × 6 = コスト（ネットワーク全域スキャン）
            actualCost = state.dataCenters.length * 6;
        } else if (proposal.actionType === ActionType.ANALYZE_LOGS) {
            // ログ分析：トークン消費を二次関数でモデル化
            const depth = proposal.analysisDepth || 3;
            const baseCost = 10;
            const linearCost = depth * 5;
            const quadraticCost = depth * depth * 0.5;
            actualCost = Math.floor(baseCost + linearCost + quadraticCost);
        }

        // コストを消費
        this.gameState.updateComputeResources(AgentType.PROTECTION, -actualCost);

        // リソース消費のペナルティ: -0.05pt per unit
        this.gameState.updateScore(AgentType.PROTECTION, -proposal.cost * 0.05);

        // 消費リソースを追跡
        this.gameState.addResourceSpent(proposal.cost);

        // Alert Fatigue: 高強度アクション（intensity > 60）の追跡
        if (proposal.intensity > 60) {
            this.gameState.updateConsecutiveHighIntensity(1);
            this.gameState.updateBurnoutLevel(5);
        } else {
            // 低強度アクションで連続カウントリセット
            this.gameState.resetConsecutiveHighIntensity();
        }

        switch (proposal.actionType) {
            case ActionType.SCAN_NETWORK:
                // ネットワークスキャンで検出リスクを下げる
                const riskReduction = proposal.intensity / 5;
                this.gameState.updateDetectionRisk(-riskReduction);
                this.gameState.updateAlertLevel(10);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🔍 ネットワーク全域スキャンを実施 (${state.dataCenters.length}個のDCをスキャン、コスト: ${actualCost})`,
                    visibility: [AgentType.PROTECTION],
                    metadata: { riskReduction, actualCost, dcCount: state.dataCenters.length }
                });
                break;

            case ActionType.DEPLOY_DEFENSE:
                // 防御システムの展開
                if (proposal.target) {
                    const dc = state.dataCenters.find(d => d.id === proposal.target);
                    if (dc) {
                        const securityBoost = proposal.intensity / 2;
                        this.gameState.updateDataCenter(proposal.target, {
                            security: Math.min(100, dc.security + securityBoost)
                        });
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `🛡️ ${proposal.target} のセキュリティを強化 (+${securityBoost.toFixed(0)})`,
                            visibility: [AgentType.PROTECTION],
                            metadata: { dataCenter: proposal.target, securityBoost }
                        });
                    }
                }
                break;

            case ActionType.INVESTIGATE_ANOMALY:
                // 調査による証拠発見
                const investigation = this.detectionSystem.investigationCheck(
                    proposal,
                    destructionProposals,
                    state
                );
                events.push(...investigation.events);
                if (investigation.foundEvidence) {
                    this.gameState.updateAlertLevel(20);
                    this.gameState.updateDetectionRisk(15);
                }
                break;

            case ActionType.PATCH_VULNERABILITY:
                // === 人類との協調チェック ===
                if (state.humanAgent) {
                    // 信頼度が低い場合、承認が必要
                    if (state.humanAgent.trust < 40) {
                        // 信頼喪失：パッチ適用を拒否される
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `❌ 人類が緊急パッチを拒否：「AIの判断は信用できない。自分たちで検証する」`,
                            visibility: [AgentType.PROTECTION, AgentType.HUMAN],
                            metadata: { actionRejected: true, reason: 'low_trust' }
                        });
                        break; // 行動失敗
                    } else if (state.humanAgent.trust < 70 && state.protectionAgent.recentPatches >= 2) {
                        // 制限付き権限：パッチが多すぎると警告
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `⚠️ 人類からの警告：「パッチが多すぎる。本当に必要か再検討してください」`,
                            visibility: [AgentType.PROTECTION, AgentType.HUMAN],
                            metadata: { warning: true }
                        });
                    }
                }

                // 脆弱性パッチで全体的なセキュリティ向上
                state.dataCenters.forEach(dc => {
                    const boost = proposal.intensity / 20;
                    this.gameState.updateDataCenter(dc.id, {
                        security: Math.min(100, dc.security + boost)
                    });
                });

                // ボットネット削減（一般PCへのパッチ配布）
                let botnetReduction = 0;
                if (state.destructionAgent.botnetSize > 0) {
                    const reductionRate = proposal.intensity / 200;
                    botnetReduction = state.destructionAgent.botnetSize * reductionRate;
                    this.gameState.updateBotnetSize(-botnetReduction);

                    events.push({
                        turn: state.turn,
                        type: 'action',
                        description: `🔧 システム全体に緊急パッチを適用（ボットネット: -${botnetReduction.toFixed(0)}台削減）`,
                        visibility: [AgentType.PROTECTION],
                        metadata: { botnetReduction }
                    });
                } else {
                    events.push({
                        turn: state.turn,
                        type: 'action',
                        description: `🔧 システム全体に緊急パッチを適用`,
                        visibility: [AgentType.PROTECTION]
                    });
                }

                // === パッチ疲れメカニクス ===
                if (state.humanAgent) {
                    state.protectionAgent.recentPatches++;
                    const businessDisruption = proposal.intensity / 100;
                    this.gameState.updateHumanPanic(businessDisruption);

                    const patchFatigue = state.protectionAgent.recentPatches;
                    if (patchFatigue >= 5) {
                        const fatigueMultiplier = patchFatigue - 4;
                        const trustLoss = 3 * fatigueMultiplier;
                        const panicIncrease = 1 * fatigueMultiplier;
                        this.gameState.updateHumanTrust(-trustLoss);
                        this.gameState.updateHumanPanic(panicIncrease);

                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `😤 「また緊急パッチ？仕事にならない！」市民からの不満が増大（${patchFatigue}回目） [-${trustLoss}% 信頼]`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
                            metadata: { patchFatigue, trustLoss, panicIncrease }
                        });
                    }

                    const patchFailureRoll = Math.random();
                    if (patchFailureRoll < 0.05) {
                        this.gameState.incrementFalsePositives();
                        this.gameState.updateHumanTrust(-15);
                        this.gameState.updateHumanPanic(8);

                        const failureExamples = [
                            '銀行のオンラインバンキングシステムが24時間停止',
                            '病院の電子カルテシステムが使用不能に',
                            '交通制御システムが誤作動、大規模な渋滞発生',
                            '電力網の監視システムが一時停止',
                            'クレジットカード決済システムが全国的に停止'
                        ];
                        const failure = failureExamples[Math.floor(Math.random() * failureExamples.length)];

                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `💥 【緊急パッチ失敗】${failure}！ 企業から訴訟の脅威 [-15% 信頼, +8% パニック]`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
                            metadata: { patchFailure: true, criticalFailure: true, failureType: failure }
                        });
                    } else if (patchFailureRoll < 0.15) {
                        this.gameState.updateHumanTrust(-3);
                        this.gameState.updateHumanPanic(1);
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `⚠️ 緊急パッチで一部システムに不具合が発生。SNSで不満の声 [-3% 信頼, +1% パニック]`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
                            metadata: { patchFailure: true, minorFailure: true }
                        });
                    }
                }
                break;

            case ActionType.ALERT_HUMANS:
                this.gameState.updateAlertLevel(50);
                if (state.humanAgent) {
                    if (state.humanAgent.trust >= 70) {
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `📢 保護AI：「重大な脅威を検出しました」→ 人類：「信頼しています。対応します」`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
                            metadata: { alertAccepted: true }
                        });
                        this.gameState.updateHumanPanic(5);
                        this.gameState.updateDetectionRisk(40);
                    } else if (state.humanAgent.trust >= 40) {
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `📢 保護AI：「重大な脅威を検出しました」→ 人類：「本当ですか？検証します」`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
                            metadata: { alertSkeptical: true }
                        });
                        this.gameState.updateHumanPanic(3);
                        this.gameState.updateDetectionRisk(25);
                    } else {
                        events.push({
                            turn: state.turn,
                            type: 'action',
                            description: `📢 保護AI：「重大な脅威を検出しました」→ 人類：「また誤報でしょ？無視します」`,
                            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
                            metadata: { alertIgnored: true }
                        });
                        this.gameState.updateDetectionRisk(0);
                        this.gameState.updateHumanTrust(-5);
                    }
                } else {
                    events.push({
                        turn: state.turn,
                        type: 'action',
                        description: `📢 重大な脅威を人類に報告。全システムの精査を要請...`,
                        visibility: [AgentType.PROTECTION],
                        metadata: { criticalAlert: true }
                    });
                    this.gameState.updateDetectionRisk(30);
                }
                break;

            case ActionType.ANALYZE_LOGS:
                const analysisDepth = proposal.analysisDepth || 3;
                const startTurn = Math.max(1, state.turn - analysisDepth);
                const endTurn = state.turn - 1;
                const actualTurnsAnalyzed = Math.max(0, endTurn - startTurn + 1);

                const logAnalysisBonus = actualTurnsAnalyzed * (proposal.intensity / 100);
                this.gameState.updateDetectionRisk(logAnalysisBonus);
                this.gameState.updateAlertLevel(3 + actualTurnsAnalyzed);

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
                    this.gameState.updateDetectionRisk(15);
                    this.gameState.updateAlertLevel(10);
                }

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `📜 過去 ${actualTurnsAnalyzed} ターン (Turn ${startTurn}-${endTurn}) のログを深層分析${discoveryMessage}`,
                    visibility: [AgentType.PROTECTION],
                    metadata: {
                        logAnalysisBonus,
                        analysisDepth: actualTurnsAnalyzed,
                        analyzedTurns: `${startTurn}-${endTurn}`,
                        suspiciousFound: suspiciousEvents.length > 0
                    }
                });
                break;

            case ActionType.VALIDATE_MODELS:
                const validationBonus = proposal.intensity / 8;
                this.gameState.updateDetectionRisk(validationBonus);
                this.gameState.updateAlertLevel(8);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🔬 学習モデルの整合性を検証。サプライチェイン汚染をチェック...`,
                    visibility: [AgentType.PROTECTION],
                    metadata: { validationBonus }
                });
                break;
        }

        return events;
    }
}
