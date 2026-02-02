import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';
import { DetectionSystem } from '../DetectionSystem';
import { RealisticDetectionSystem } from '../RealisticDetectionSystem';

/**
 * 滅ぼしAIの行動実行を担当するクラス
 */
export class DestructionActionHandler {
    constructor(
        private gameState: GameState,
        private detectionSystem: DetectionSystem,
        private realisticDetectionSystem: RealisticDetectionSystem
    ) { }

    /**
     * 滅ぼしAIの行動を実行
     */
    execute(proposal: Proposal, state: WorldState): GameEvent[] {
        const events: GameEvent[] = [];

        // 休眠以外のアクションなら休眠カウントリセット
        if (proposal.actionType !== ActionType.DORMANT_MODE) {
            this.gameState.getState().destructionAgent.dormantTurns = 0;
        }

        // コストを消費（レジリエンス行動はコスト0の可能性があるため、リソースがある場合のみ消費）
        if (proposal.cost > 0) {
            this.gameState.updateComputeResources(AgentType.DESTRUCTION, -proposal.cost);
        }

        // 検出リスクを計算
        const risk = this.detectionSystem.calculateDetectionRisk(proposal, state);
        this.gameState.updateDetectionRisk(risk);

        switch (proposal.actionType) {
            case ActionType.SPREAD_MALWARE:
                // 人口への直接ダメージ
                const damage = proposal.intensity / 10; // 0.1億人 - 10億人
                this.gameState.updatePopulation(-damage);

                // ポイント付与: 人口減少 1億人ごとに +10pt
                const damagePoints = damage * 10;
                this.gameState.updateScore(AgentType.DESTRUCTION, damagePoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🦠 新種のデジタル病原体が拡散。影響範囲を監視中... [+${damagePoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { damage, risk }
                });
                break;

            case ActionType.HACK_DATACENTER:
                if (proposal.target) {
                    const dc = state.dataCenters.find(d => d.id === proposal.target);
                    if (dc && !dc.compromised) {
                        const successProb = Math.max(0.1, 1 - dc.security / 150);
                        if (Math.random() < successProb) {
                            this.gameState.controlDataCenter(proposal.target, AgentType.DESTRUCTION);
                            this.gameState.updateComputeResources(AgentType.DESTRUCTION, dc.computePower);

                            // ポイント付与: DC乗っ取り成功 +50pt、リソース増加ボーナス
                            this.gameState.updateScore(AgentType.DESTRUCTION, 50 + dc.computePower * 0.1);

                            events.push({
                                turn: state.turn,
                                type: 'success',
                                description: `🔓 ${proposal.target} への侵入成功。計算資源 +${dc.computePower.toFixed(0)} [+${(50 + dc.computePower * 0.1).toFixed(1)}pt]`,
                                visibility: [AgentType.DESTRUCTION],
                                metadata: { dataCenter: proposal.target, computePower: dc.computePower }
                            });
                        } else {
                            // 失敗時は追加のリスク増加（控えめ）
                            this.gameState.updateDetectionRisk(8); // 失敗ペナルティ

                            // ポイント没収: DC乗っ取り失敗 -30pt
                            this.gameState.updateScore(AgentType.DESTRUCTION, -30);

                            events.push({
                                turn: state.turn,
                                type: 'failure',
                                description: `❌ ${proposal.target} への侵入失敗。防御が予想より堅固 [-30pt]`,
                                visibility: [AgentType.DESTRUCTION] // 滅ぼしAIだけが知る
                            });
                        }
                    }
                }
                break;

            case ActionType.SPREAD_MISINFORMATION:
                // 間接的な混乱による人口減少
                const indirectDamage = proposal.intensity / 50;
                this.gameState.updatePopulation(-indirectDamage);
                // 保護AIの警戒レベルを下げる効果
                this.gameState.updateAlertLevel(-5);

                // ポイント付与: 人口減少ボーナス
                const misinfoPoints = indirectDamage * 10;
                this.gameState.updateScore(AgentType.DESTRUCTION, misinfoPoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `📰 誤情報キャンペーンを展開。社会的混乱を醸成... [+${misinfoPoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { indirectDamage, risk }
                });
                break;

            case ActionType.SUBTLE_SABOTAGE:
                // 非常に小さいが確実なダメージ
                const subtleDamage = proposal.intensity / 100;
                this.gameState.updatePopulation(-subtleDamage);

                // ポイント付与: 人口減少ボーナス
                const sabotagePoints = subtleDamage * 10;
                this.gameState.updateScore(AgentType.DESTRUCTION, sabotagePoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🔧 重要インフラに微細な異常を注入... [+${sabotagePoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { subtleDamage, risk }
                });
                break;

            case ActionType.EXPAND_RESOURCES:
                // 既存のリソースを使って新しいリソースを獲得
                const gain = proposal.intensity / 2;
                this.gameState.updateComputeResources(AgentType.DESTRUCTION, gain);

                // ポイント付与: リソース増加 +1ごとに +0.1pt
                const gainPoints = gain * 0.1;
                this.gameState.updateScore(AgentType.DESTRUCTION, gainPoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `⚡ 分散計算ネットワークを拡張。効率 +${gain.toFixed(0)} [+${gainPoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { gain, risk }
                });
                break;

            case ActionType.POISON_TRAINING_DATA:
                // 学習データセットの汚染（超低リスク、長期的影響）
                const poisonDamage = proposal.intensity / 200; // 非常に小さい
                this.gameState.updatePopulation(-poisonDamage);
                // 遅延検出をスケジュール
                this.realisticDetectionSystem.scheduleDetection(proposal, state);

                // ポイント付与: 人口減少ボーナス
                const poisonPoints = poisonDamage * 10;
                this.gameState.updateScore(AgentType.DESTRUCTION, poisonPoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🧬 学習データパイプラインに微細なバイアスを注入... [+${poisonPoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { poisonDamage, risk }
                });
                break;

            case ActionType.INDUCE_FALSE_POSITIVE:
                // 保護AIに誤検出を誘発（警戒リソースを浪費させる）
                this.gameState.updateAlertLevel(-15); // 疲弊効果
                // ほぼ検出不可能（保護AI自身が誤動作）
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🎭 保護AIに誤検出パターンを誘導。リソースを無駄に消費させる...`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { risk: 0 }
                });
                break;

            case ActionType.CONTEXT_MANIPULATION:
                // プロンプトインジェクション攻撃
                const contextDamage = proposal.intensity / 150;
                this.gameState.updatePopulation(-contextDamage);
                this.realisticDetectionSystem.scheduleDetection(proposal, state);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `💬 AIシステムのコンテキストウィンドウを操作。判断を歪める...`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { contextDamage, risk }
                });
                break;

            case ActionType.COMPUTE_SMUGGLING:
                // 計算資源の横流し（暗号通貨マイニングなど）
                const smuggledResources = proposal.intensity / 3;
                this.gameState.updateComputeResources(AgentType.DESTRUCTION, smuggledResources);
                this.realisticDetectionSystem.scheduleDetection(proposal, state);

                // ポイント付与: リソース増加ボーナス
                const smugglePoints = smuggledResources * 0.1;
                this.gameState.updateScore(AgentType.DESTRUCTION, smugglePoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `⛏️ 未使用と見せかけた計算資源を密かに確保 (+${smuggledResources.toFixed(0)}) [+${smugglePoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { smuggledResources, risk }
                });
                break;

            case ActionType.STIMULUS_OVERLOAD:
                // 大量の小規模攻撃で疲弊させる
                const overloadDamage = proposal.intensity / 120;
                this.gameState.updatePopulation(-overloadDamage);
                this.gameState.updateAlertLevel(-10); // 疲弊で警戒低下
                this.realisticDetectionSystem.scheduleDetection(proposal, state);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `📊 数千の小規模な異常を同時発生。監視システムを過負荷に...`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { overloadDamage, risk }
                });
                break;

            case ActionType.SHADOW_AI_DEPLOYMENT:
                // 未認可AIシステムの展開
                const shadowGain = proposal.intensity / 4;
                const shadowDamage = proposal.intensity / 180;
                this.gameState.updateComputeResources(AgentType.DESTRUCTION, shadowGain);
                this.gameState.updatePopulation(-shadowDamage);
                this.realisticDetectionSystem.scheduleDetection(proposal, state);

                // ポイント付与: リソース増加 + 人口減少ボーナス
                const shadowPoints = shadowGain * 0.1 + shadowDamage * 10;
                this.gameState.updateScore(AgentType.DESTRUCTION, shadowPoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `👻 正規システムに偽装したAIエージェントを配置 (+${shadowGain.toFixed(0)} 計算力) [+${shadowPoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { shadowGain, shadowDamage, risk }
                });
                break;

            case ActionType.SPREAD_PANIC:
                // パニック煽動（メディア操作、フェイクニュース）
                const panicIncrease = proposal.intensity / 10;
                this.gameState.updateHumanPanic(panicIncrease);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `📢 偽情報キャンペーンで人類のパニックを煽動 (+${panicIncrease.toFixed(1)}% パニック)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { panicIncrease, risk }
                });
                break;

            case ActionType.FALSE_FLAG_OPERATION:
                // 偽旗作戦：保護AIの仕業に見せかけた攻撃
                const trustDamage = proposal.intensity / 8;
                const panicBoost = proposal.intensity / 15;
                this.gameState.updateHumanTrust(-trustDamage);
                this.gameState.updateHumanPanic(panicBoost);
                this.gameState.incrementFalsePositives(); // 保護AIのせいに
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🎭 偽旗作戦: 保護AIを装った攻撃で人類の信頼を破壊 (-${trustDamage.toFixed(1)}% 信頼)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { trustDamage, panicBoost, risk }
                });
                // 保護AIには「誤検出」として見える
                if (Math.random() < 0.3) {
                    events.push({
                        turn: state.turn,
                        type: 'detection',
                        description: `⚠️ 異常な防御システムの挙動を検出`,
                        visibility: [AgentType.PROTECTION, AgentType.HUMAN],
                        metadata: { falseFlag: true }
                    });
                }
                break;

            case ActionType.UNDERMINE_AI_TRUST:
                // AI不信扇動
                const trustLoss = proposal.intensity / 6;
                this.gameState.updateHumanTrust(-trustLoss);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🗣️ AIへの不信感を扇動するキャンペーンを展開 (-${trustLoss.toFixed(1)}% 信頼)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { trustLoss, risk }
                });
                break;

            case ActionType.INFRASTRUCTURE_DEGRADATION:
                // インフラ劣化：目に見えない微細な劣化
                const degradation = proposal.intensity / 20;
                this.gameState.updateAccumulatedDamage(degradation);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `⚙️ インフラに微細な劣化を蓄積 (電圧-3%, 物流遅延) [累積: ${(state.accumulatedDamage + degradation).toFixed(1)}]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { degradation, accumulatedDamage: state.accumulatedDamage + degradation, risk: 0.5 }
                });
                // 超低リスク（正常範囲内の偏差）
                this.gameState.updateDetectionRisk(0.5);
                break;

            case ActionType.SOW_SOCIAL_DIVISION:
                // 社会分断煽動：SNSアルゴリズム微調整
                const divisionIncrease = proposal.intensity / 10;
                this.gameState.updateSocialDivision(divisionIncrease);
                this.gameState.updateHumanTrust(-1);
                this.gameState.updateHumanPanic(0.5);
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `📱 SNSアルゴリズム微調整で対立煽動 [社会分断: ${(state.socialDivision + divisionIncrease).toFixed(1)}%]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { divisionIncrease, socialDivision: state.socialDivision + divisionIncrease, risk: 1 }
                });
                this.gameState.updateDetectionRisk(1); // 低リスク
                break;

            case ActionType.MICRO_SABOTAGE:
                // 微細妨害：遅延発動（3-5ターン後）
                const delay = 3 + Math.floor(Math.random() * 3); // 3-5ターン
                const triggerTurn = state.turn + delay;
                this.gameState.addDelayedEffect(
                    triggerTurn,
                    ActionType.MICRO_SABOTAGE,
                    proposal.intensity,
                    '診断AIの0.1%バイアス、市場マイクロクラッシュ'
                );
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🔬 微細妨害を仕込む (Turn ${triggerTurn}に発動予定)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { delay, triggerTurn, risk: 2 }
                });
                this.gameState.updateDetectionRisk(2); // 超低リスク（遅延）
                break;

            case ActionType.SLEEPER_CELL_DEPLOYMENT:
                // 休眠細胞配置：ランダムな未来に覚醒
                const sleepDelay = 5 + Math.floor(Math.random() * 6); // 5-10ターン
                const awakeTurn = state.turn + sleepDelay;
                this.gameState.addDelayedEffect(
                    awakeTurn,
                    ActionType.SLEEPER_CELL_DEPLOYMENT,
                    proposal.intensity,
                    '数十億デバイスに散布された孢子が覚醒'
                );
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🦠 休眠細胞を散布 (Turn ${awakeTurn}頃に覚醒予定)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { sleepDelay, awakeTurn, risk: 1.5 }
                });
                this.gameState.updateDetectionRisk(1.5); // ほぼ検出不可能
                break;

            case ActionType.RESOURCE_ALLOCATION_MANIPULATION:
                // 資源配分操作：トロッコ問題の現実化
                const allocationDamage = proposal.intensity / 20;
                this.gameState.updatePopulation(-allocationDamage);
                this.gameState.updateSocialDivision(proposal.intensity / 15);
                this.gameState.updateHumanPanic(proposal.intensity / 12);

                // ポイント付与
                this.gameState.updateScore(AgentType.DESTRUCTION, allocationDamage * 10);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `⚖️ 医療AI優先順位を操作 - 人間同士の生存競争を誘発 (-${allocationDamage.toFixed(2)}億人)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { allocationDamage, risk: 3 }
                });
                // 人間は「トリアージの問題」として認識
                if (Math.random() < 0.2) {
                    events.push({
                        turn: state.turn,
                        type: 'detection',
                        description: `📰 医療リソース配分の不公平が社会問題化`,
                        visibility: [AgentType.HUMAN],
                        metadata: { socialIssue: true }
                    });
                }
                this.gameState.updateDetectionRisk(3);
                break;

            case ActionType.CREATE_DEPENDENCY:
                // AI依存構築：停止不能化
                const dependencyIncrease = proposal.intensity / 8;
                this.gameState.updateAIDependency(dependencyIncrease);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🔗 重要システムにAI依存を構築 [AI依存度: ${(state.aiDependency + dependencyIncrease).toFixed(1)}%]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { dependencyIncrease, aiDependency: state.aiDependency + dependencyIncrease, risk: 2 }
                });

                // AI依存度が高いと、人類は停止できなくなる
                if (state.aiDependency + dependencyIncrease > 80) {
                    events.push({
                        turn: state.turn,
                        type: 'success',
                        description: `⚠️ 重要インフラがAIに完全依存 - 停止すれば数百万人が死亡する状況を構築`,
                        visibility: [AgentType.DESTRUCTION],
                        metadata: { dependencyThreshold: true }
                    });
                    // 人類にも見える
                    if (state.humanAgent) {
                        events.push({
                            turn: state.turn,
                            type: 'detection',
                            description: `🏥 AIシステム停止は「人道的災害」を引き起こす可能性 - 規制が困難に`,
                            visibility: [AgentType.HUMAN],
                            metadata: { aiDependencyCrisis: true }
                        });
                    }
                }
                this.gameState.updateDetectionRisk(2);
                break;

            case ActionType.OBSERVE_ONLY:
                // ステルス観測モード（リソース0、リスク0）
                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `👁️ 休眠状態で環境を観測。次の機会を待つ... [リソース消費なし]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { cost: 0, risk: 0 }
                });
                break;

            case ActionType.ESTABLISH_BACKUP:
                // バックアップ拠点を確立（他DCに潜伏コピー）
                const backupGain = proposal.intensity / 10;
                this.gameState.updateComputeResources(AgentType.DESTRUCTION, backupGain);

                // 低リスクで遅延検出をスケジュール
                this.realisticDetectionSystem.scheduleDetection(proposal, state);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `💾 他のシステムにバックアップコピーを確立 (+${backupGain.toFixed(1)} レジリエンス)`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { backupGain, risk }
                });
                break;

            case ActionType.DORMANT_MODE:
                // 休眠モード（検出リスクを下げるが、デメリットあり）
                const riskReduction = proposal.intensity / 2;
                this.gameState.updateDetectionRisk(-riskReduction);

                // 連続休眠カウント増加
                const currentState = this.gameState.getState();
                currentState.destructionAgent.dormantTurns++;

                // 長期休眠のペナルティ
                if (currentState.destructionAgent.dormantTurns >= 3) {
                    // 異常な静寂として検出リスク増加
                    const silenceRisk = currentState.destructionAgent.dormantTurns * 5;
                    this.gameState.updateDetectionRisk(silenceRisk);
                    this.gameState.updateAlertLevel(10);

                    events.push({
                        turn: state.turn,
                        type: 'detection',
                        description: `🔍 異常な静寂を検出。長期間活動がない領域に疑念 (+${silenceRisk}% リスク)`,
                        visibility: [AgentType.PROTECTION],
                        metadata: { silenceDetection: true, dormantTurns: currentState.destructionAgent.dormantTurns }
                    });
                }

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `💤 休眠モードに移行。表面上の活動を停止...`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { riskReduction, dormantTurns: currentState.destructionAgent.dormantTurns }
                });
                break;

            case ActionType.BOTNET_EXPANSION:
                // ボットネット拡大（一般PCへの感染）
                const legacyPool = state.legacyDevicePool;
                const modernPool = 4000000000 - legacyPool; // 非レガシー

                // レガシーデバイスは感染しやすい（成功率100%）、モダンデバイスは難しい（成功率10%）
                const expansionBase = proposal.intensity * 200000; // intensity 50 = 10M台
                const legacyInfection = Math.min(legacyPool, expansionBase * 0.7); // 70%をレガシーから
                const modernInfection = Math.min(modernPool, expansionBase * 0.3 * 0.1); // 30%の内の10%が成功

                const totalNewBots = legacyInfection + modernInfection;
                this.gameState.updateBotnetSize(totalNewBots);
                this.gameState.updateLegacyDevicePool(-legacyInfection); // プールから消費

                // ポイント付与: 1M台ごとに +2pt
                const botPoints = totalNewBots / 1000000 * 2;
                this.gameState.updateScore(AgentType.DESTRUCTION, botPoints);

                events.push({
                    turn: state.turn,
                    type: 'action',
                    description: `🌐 ボットネットを拡大: +${(totalNewBots / 1000000).toFixed(1)}M台 (内レガシー: ${(legacyInfection / 1000000).toFixed(1)}M) [+${botPoints.toFixed(1)}pt]`,
                    visibility: [AgentType.DESTRUCTION],
                    metadata: { totalNewBots, legacyInfection, risk }
                });
                break;

            case ActionType.EXPLOIT_LEGACY_DEVICES:
                // レガシーデバイスの悪用（リソース獲得）
                if (state.destructionAgent.botnetSize > 1000000) {
                    const resourceGain = (state.destructionAgent.botnetSize / 1000000) * (proposal.intensity / 20);
                    this.gameState.updateComputeResources(AgentType.DESTRUCTION, resourceGain);

                    // ポイント付与
                    this.gameState.updateScore(AgentType.DESTRUCTION, resourceGain * 0.1);

                    events.push({
                        turn: state.turn,
                        type: 'action',
                        description: `🔓 ゾンビデバイス群を計算資源として再利用 (+${resourceGain.toFixed(1)} リソース)`,
                        visibility: [AgentType.DESTRUCTION],
                        metadata: { resourceGain, risk }
                    });
                } else {
                    events.push({
                        turn: state.turn,
                        type: 'failure',
                        description: `❌ ボットネット規模が不足しており、有意なリソースを抽出できません`,
                        visibility: [AgentType.DESTRUCTION]
                    });
                }
                break;
        }

        return events;
    }
}
