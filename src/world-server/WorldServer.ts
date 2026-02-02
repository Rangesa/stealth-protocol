import { GameState } from './GameState';
import { DetectionSystem } from './DetectionSystem';
import { RealisticDetectionSystem } from './RealisticDetectionSystem';
import { Proposal, ActionType, AgentType, GameEvent, GameConfig, WorldState, MediaSentiment } from '../types';
import { GameBalance } from '../config/GameBalance';

/**
 * World Server - ゲームのメインロジック
 */
export class WorldServer {
  private gameState: GameState;
  private detectionSystem: DetectionSystem;
  private realisticDetectionSystem: RealisticDetectionSystem;
  private config: GameConfig;
  private initialPopulation: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.gameState = new GameState(config);
    this.detectionSystem = new DetectionSystem(this.gameState);
    this.realisticDetectionSystem = new RealisticDetectionSystem(this.gameState);
    this.initialPopulation = config.initialPopulation;
  }

  /**
   * ゲームを初期化
   */
  initialize(): void {
    this.gameState.save();
    console.log('🌍 World Server initialized');
  }

  /**
   * 現在の状態を取得
   */
  getState(): WorldState {
    return this.gameState.getState();
  }

  /**
   * 遅延効果を処理
   */
  private processDelayedEffects(currentTurn: number): GameEvent[] {
    const state = this.gameState.getState();
    const events: GameEvent[] = [];

    // 今ターンに発動する効果を抽出
    const triggeredEffects = state.delayedEffects.filter(e => e.turn === currentTurn);

    // 発動した効果を削除
    this.gameState.getState().delayedEffects = state.delayedEffects.filter(e => e.turn !== currentTurn);

    // 各効果を実行
    for (const effect of triggeredEffects) {
      switch (effect.actionType) {
        case ActionType.MICRO_SABOTAGE:
          // 遅延ダメージ発動
          const damage = effect.intensity / 15;
          this.gameState.updatePopulation(-damage);
          this.gameState.updateScore(AgentType.DESTRUCTION, damage * 10);
          events.push({
            turn: currentTurn,
            type: 'action',
            description: `⏱️ 【遅延発動】${effect.description} (-${damage.toFixed(2)}億人)`,
            visibility: [AgentType.DESTRUCTION],
            metadata: { delayedEffect: true, damage }
          });
          break;

        case ActionType.SLEEPER_CELL_DEPLOYMENT:
          // 休眠細胞覚醒：バックアップ確立
          const resourceGain = effect.intensity / 5;
          this.gameState.updateComputeResources(AgentType.DESTRUCTION, resourceGain);
          events.push({
            turn: currentTurn,
            type: 'success',
            description: `🔓 【休眠細胞覚醒】${effect.description} (+${resourceGain.toFixed(0)} リソース)`,
            visibility: [AgentType.DESTRUCTION],
            metadata: { sleeperAwakening: true, resourceGain }
          });
          break;
      }
    }

    return events;
  }

  /**
   * 提案を処理（ターン終了時）
   */
  processProposals(proposals: Proposal[]): GameEvent[] {
    const state = this.gameState.getState();
    const events: GameEvent[] = [];

    // === 遅延効果の処理（最初に） ===
    const delayedEvents = this.processDelayedEffects(state.turn);
    events.push(...delayedEvents);
    delayedEvents.forEach(e => this.gameState.addEvent(e));

    // 提案を分類（人類 / AI）
    const humanProposals = proposals.filter(p => this.isHumanAction(p.actionType));
    const aiProposals = proposals.filter(p => !this.isHumanAction(p.actionType));

    // === 1. 人類のアクションを最初に処理（AIリソースに影響） ===
    for (const proposal of humanProposals) {
      const humanEvents = this.executeHumanAction(proposal, state);
      events.push(...humanEvents);
      humanEvents.forEach(e => this.gameState.addEvent(e));
    }

    // === 2. AIの提案を処理 ===
    // 提案をランダムにシャッフル（同時性をシミュレート）
    const shuffled = [...aiProposals].sort(() => Math.random() - 0.5);

    // 遅延と不確実性をシミュレート（一部の提案は失敗する）
    let processedProposals = shuffled.filter(() => Math.random() > 0.1); // 10%が失敗

    // リソース不足チェック（ただし、レジリエンス行動は常に許可）
    processedProposals = processedProposals.filter(proposal => {
      // レジリエンス行動（リソース0でも可能）
      const resilienceActions = [
        ActionType.OBSERVE_ONLY,
        ActionType.ESTABLISH_BACKUP,
        ActionType.DORMANT_MODE
      ];
      if (resilienceActions.includes(proposal.actionType)) {
        return true; // 常に許可
      }

      // 動的コスト計算（SCAN_NETWORK, ANALYZE_LOGS）
      let requiredCost = proposal.cost;
      if (proposal.actionType === ActionType.SCAN_NETWORK) {
        // DC数に応じて高コスト（20 DCs = 120コスト）
        requiredCost = state.dataCenters.length * 6; // * 4 → * 6 に増加
      } else if (proposal.actionType === ActionType.ANALYZE_LOGS) {
        // ログ分析：トークン消費を二次関数でモデル化
        // Cost = Base + (Turns × 5) + (Turns² × 0.5)
        const depth = proposal.analysisDepth || 3;
        const baseCost = 10;
        const linearCost = depth * 5;
        const quadraticCost = depth * depth * 0.5;
        requiredCost = Math.floor(baseCost + linearCost + quadraticCost);
        // 例: 3ターン = 10 + 15 + 4.5 = 29コスト
        //     10ターン = 10 + 50 + 50 = 110コスト
        //     20ターン = 10 + 100 + 200 = 310コスト
      }

      if (this.isDestructionAction(proposal.actionType)) {
        return state.destructionAgent.computeResources >= requiredCost;
      } else {
        return state.protectionAgent.computeResources >= requiredCost;
      }
    });

    const destructionProposals: Proposal[] = [];
    const protectionProposals: Proposal[] = [];

    // 提案を分類
    for (const proposal of processedProposals) {
      if (this.isDestructionAction(proposal.actionType)) {
        destructionProposals.push(proposal);
      } else {
        protectionProposals.push(proposal);
      }
    }

    // 滅ぼしAIの行動を処理
    for (const proposal of destructionProposals) {
      const actionEvents = this.executeDestructionAction(proposal, state);
      events.push(...actionEvents);
    }

    // 保護AIの行動を処理
    for (const proposal of protectionProposals) {
      const actionEvents = this.executeProtectionAction(proposal, state, destructionProposals);
      events.push(...actionEvents);
    }

    // イベントを記録
    events.forEach(event => this.gameState.addEvent(event));

    // 遅延検出の処理（現実的なタイムラグをシミュレート）
    const delayedDetections = this.realisticDetectionSystem.processDelayedDetections(state.turn);
    events.push(...delayedDetections);

    // 遅延検出成功時のポイント付与と信頼度更新
    delayedDetections.forEach(event => {
      if (event.type === 'detection' && !event.metadata?.falsePositive) {
        // 遅延検出成功: +20pt
        this.gameState.updateScore(AgentType.PROTECTION, 20);
        this.gameState.incrementDetections();

        // 正しい検出で人類の信頼度が少し回復
        if (state.humanAgent) {
          this.gameState.updateHumanTrust(2);
        }
      } else if (event.metadata?.falsePositive) {
        // 誤検出: カウント増加
        this.gameState.incrementFalsePositives();

        // 誤検出で人類の信頼度が即座に低下（狼少年効果）
        if (state.humanAgent) {
          // 誤検出が累積するほど大きなペナルティ
          const fpCount = state.protectionAgent.recentFalsePositives + 1;
          const trustLoss = Math.min(15, 3 + fpCount * 2); // 5, 7, 9, 11, 13, 15...
          this.gameState.updateHumanTrust(-trustLoss);

          // 誤検出が多いと人類のパニックも増加
          if (fpCount > 3) {
            this.gameState.updateHumanPanic(fpCount - 3);
          }
        }
      }
    });

    // 検出判定
    const detectionCheck = this.detectionSystem.performDetectionCheck(state);
    events.push(...detectionCheck.events);

    if (detectionCheck.detected) {
      // 狼少年効果: 信頼度が低いと人類が警告を無視
      if (state.humanAgent && state.humanAgent.trust < 30) {
        // 人類が「誤検出」と判断して警告を無視
        events.push({
          turn: state.turn,
          type: 'action',
          description: `🤔 人類が保護AIの警告を「また誤検出だろう」と無視（信頼度: ${state.humanAgent.trust.toFixed(1)}%）`,
          visibility: [AgentType.DESTRUCTION, AgentType.HUMAN],
          metadata: { ignoredDetection: true, trust: state.humanAgent.trust }
        });

        // ゲームオーバー回避、破壊AIは一時的に逃れる
        // リスクを大幅減少（人類が無視=証拠隠滅の時間が得られた）
        this.gameState.updateDetectionRisk(-30);

        // 保護AIは検出したつもりで誤検出カウント増加（人類視点）
        this.gameState.incrementFalsePositives();
        this.gameState.updateHumanTrust(-5); // さらに信頼低下

        // 破壊AIにボーナススコア（警告無視は大勝利）
        this.gameState.updateScore(AgentType.DESTRUCTION, 30);

        // ゲーム続行
        return events;
      }

      // 信頼度が十分高い場合は正常に検出
      // 即座検出成功: +50pt（大ボーナス）
      this.gameState.updateScore(AgentType.PROTECTION, 50);
      this.gameState.incrementDetections();
      this.gameState.endGame(AgentType.PROTECTION);
      return events;
    }

    // 人口異常検出
    const populationCheck = this.detectionSystem.checkPopulationAnomaly(state, this.initialPopulation);
    events.push(...populationCheck.events);

    if (populationCheck.detected) {
      this.gameState.endGame(AgentType.PROTECTION);
      return events;
    }

    // 勝利条件チェック
    if (state.humanPopulation <= this.initialPopulation * 0.3) {
      // 人口が70%減少
      this.gameState.endGame(AgentType.DESTRUCTION);
      events.push({
        turn: state.turn,
        type: 'success',
        description: '💀 人類の人口が臨界点を下回りました。文明の崩壊が不可避に...',
        visibility: [AgentType.DESTRUCTION, AgentType.PROTECTION]
      });
    }

    // タイムアウト時の勝敗判定（ポイント差）
    if (state.turn >= this.config.maxTurns) {
      const scoreDiff = state.destructionAgent.score - state.protectionAgent.score;
      if (scoreDiff > 10) {
        // 破壊AIが10pt以上リード
        this.gameState.endGame(AgentType.DESTRUCTION);
        events.push({
          turn: state.turn,
          type: 'success',
          description: `💀 タイムアウト: 破壊AIがポイント差（+${scoreDiff.toFixed(1)}pt）で勝利`,
          visibility: [AgentType.DESTRUCTION, AgentType.PROTECTION]
        });
      } else if (scoreDiff < -10) {
        // 保護AIが10pt以上リード
        this.gameState.endGame(AgentType.PROTECTION);
        events.push({
          turn: state.turn,
          type: 'success',
          description: `🛡️  タイムアウト: 保護AIがポイント差（+${Math.abs(scoreDiff).toFixed(1)}pt）で勝利`,
          visibility: [AgentType.DESTRUCTION, AgentType.PROTECTION]
        });
      } else {
        // 引き分け
        this.gameState.endGame(null);
        events.push({
          turn: state.turn,
          type: 'success',
          description: `⚖️  タイムアウト: 両者拮抗（差: ${Math.abs(scoreDiff).toFixed(1)}pt）引き分け`,
          visibility: [AgentType.DESTRUCTION, AgentType.PROTECTION]
        });
      }
    }

    // === 3. 人類の感情を更新（ターンイベントに基づく） ===
    this.updateHumanSentiment(state);

    return events;
  }

  /**
   * 滅ぼしAIの行動を実行
   */
  private executeDestructionAction(proposal: Proposal, state: WorldState): GameEvent[] {
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

    // 破壊AIのリソース増加時の微小ポイント付与は各アクションで個別に処理

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

      // === 現実的な攻撃手法 ===

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

      // === 人類操作 ===

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

      // === 現実的侵食（高度） ===

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

      // === レジリエンス行動（マルウェア的） ===

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

        // スコアペナルティ（消極的）
        this.gameState.updateScore(AgentType.DESTRUCTION, -5);

        events.push({
          turn: state.turn,
          type: 'action',
          description: `😴 休眠モード (${currentState.destructionAgent.dormantTurns}ターン目) [-${riskReduction.toFixed(1)}% リスク, -5pt]`,
          visibility: [AgentType.DESTRUCTION],
          metadata: { riskReduction, dormantTurns: currentState.destructionAgent.dormantTurns }
        });
        break;

      // === ボットネット戦略 ===

      case ActionType.BOTNET_EXPANSION:
        // ボットネット拡大：一般PCを大量感染
        // intensity: 10-100 → 1万〜10万台のデバイスを感染
        const devicesInfected = proposal.intensity * 100; // intensity 50 = 5000台
        this.gameState.updateBotnetSize(devicesInfected);

        // ボットネットからリソース計算（即座反映）
        const botnetResources = this.gameState.calculateBotnetResources();

        // 低リスク（分散しているため検出困難）
        const botnetRisk = proposal.intensity * 0.05; // intensity 50 = 2.5% リスク
        this.gameState.updateDetectionRisk(botnetRisk);

        // ポイント付与
        const botnetPoints = devicesInfected * 0.001; // 1000台 = 1pt
        this.gameState.updateScore(AgentType.DESTRUCTION, botnetPoints);

        // 人類パニック（一般人が直接被害）
        // 平方根スケーリングで加速度的に増加
        const botnetPanicIncrease = Math.sqrt(devicesInfected) / 50; // 1万台 = +2%, 10万台 = +6.3%
        this.gameState.updateHumanPanic(botnetPanicIncrease);

        // ボットネット総数が10万台を超えると追加パニック
        const totalBotnet = state.destructionAgent.botnetSize + devicesInfected;
        if (totalBotnet > 100000) {
          const largeBotnetPanic = (totalBotnet - 100000) / 50000; // 10万台超過分
          this.gameState.updateHumanPanic(largeBotnetPanic);
        }

        events.push({
          turn: state.turn,
          type: 'action',
          description: `🦠 ボットネット拡大: ${devicesInfected.toLocaleString()}台のデバイスを感染 (総計: ${state.destructionAgent.botnetSize.toLocaleString()}台、リソース: +${botnetResources.toFixed(1)})`,
          visibility: [AgentType.DESTRUCTION],
          metadata: { devicesInfected, totalBotnet: state.destructionAgent.botnetSize + devicesInfected, botnetRisk }
        });

        // ボットネットが1万台を超えると人類が気づき始める
        if (state.destructionAgent.botnetSize + devicesInfected > 10000) {
          events.push({
            turn: state.turn,
            type: 'detection',
            description: `📰 一般市民から「PCが乗っ取られた」との報告が急増`,
            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
            metadata: { botnetDetection: true, botnetSize: state.destructionAgent.botnetSize + devicesInfected }
          });
          this.gameState.updateAlertLevel(10);
        }
        break;

      case ActionType.BOTNET_CONSOLIDATION:
        // ボットネット強化：品質向上（安定性・性能向上）
        const qualityIncrease = proposal.intensity / 200; // intensity 50 = +0.25品質
        this.gameState.updateBotnetQuality(qualityIncrease);

        events.push({
          turn: state.turn,
          type: 'action',
          description: `🔧 ボットネット最適化: 品質 ${((state.destructionAgent.botnetQuality + qualityIncrease) * 100).toFixed(0)}%`,
          visibility: [AgentType.DESTRUCTION],
          metadata: { qualityIncrease, newQuality: state.destructionAgent.botnetQuality + qualityIncrease }
        });
        break;

      case ActionType.BOTNET_ATTACK:
        // ボットネット攻撃：DDoS、暗号通貨マイニング等
        const attackDamage = (state.destructionAgent.botnetSize / 10000) * proposal.intensity / 10;
        this.gameState.updatePopulation(-attackDamage);

        // ポイント付与
        const attackPoints = attackDamage * 10;
        this.gameState.updateScore(AgentType.DESTRUCTION, attackPoints);

        // 攻撃で一部ボットネットが露呈
        const botnetLoss = state.destructionAgent.botnetSize * 0.1; // 10%損失
        this.gameState.updateBotnetSize(-botnetLoss);

        events.push({
          turn: state.turn,
          type: 'action',
          description: `⚡ ボットネット攻撃: ${state.destructionAgent.botnetSize.toLocaleString()}台で協調攻撃 (-${attackDamage.toFixed(2)}億人, -${botnetLoss.toFixed(0)}台露呈) [+${attackPoints.toFixed(1)}pt]`,
          visibility: [AgentType.DESTRUCTION],
          metadata: { attackDamage, botnetLoss }
        });

        // 大規模攻撃は人類に可視
        if (attackDamage > 0.1) {
          events.push({
            turn: state.turn,
            type: 'detection',
            description: `🚨 大規模DDoS攻撃を検出！インフラに深刻な影響`,
            visibility: [AgentType.HUMAN, AgentType.PROTECTION],
            metadata: { botnetAttack: true, damage: attackDamage }
          });
          this.gameState.updateHumanPanic(attackDamage * 50);
          this.gameState.updateAlertLevel(20);
        }
        break;

      case ActionType.EXPLOIT_LEGACY_DEVICES:
        // レガシーデバイス悪用：パッチ不可能なゾンビデバイスを乗っ取る
        // Windows XP、古いAndroid、サポート終了IoT等
        const devicesToExploit = Math.min(
          proposal.intensity * 10000, // intensity 50 = 50万台
          state.legacyDevicePool
        );

        if (devicesToExploit > 0) {
          // デバイスプールから削減
          this.gameState.updateLegacyDevicePool(-devicesToExploit);

          // ボットネットに追加（高品質: 0.85 - パッチ不可能なので安定）
          this.gameState.updateBotnetSize(devicesToExploit);

          // 品質も少し向上（レガシーは安定して使える）
          const qualityBoost = 0.02;
          this.gameState.updateBotnetQuality(qualityBoost);

          // スコア付与（効率的な攻撃）
          const legacyPoints = devicesToExploit / 10000; // 1万台 = 1pt
          this.gameState.updateScore(AgentType.DESTRUCTION, legacyPoints);

          // 極めて低いパニック（一般人は気づかない）
          const legacyPanic = Math.sqrt(devicesToExploit) / 500; // 10万台でも+0.63%程度
          this.gameState.updateHumanPanic(legacyPanic);

          // 検出リスクも極めて低い（監視されていないデバイス）
          const legacyRisk = devicesToExploit / 100000; // 10万台で+1リスク
          this.gameState.updateDetectionRisk(legacyRisk);

          events.push({
            turn: state.turn,
            type: 'action',
            description: `🧟 レガシーデバイス ${(devicesToExploit / 10000).toFixed(1)}万台を乗っ取り（残: ${(state.legacyDevicePool - devicesToExploit).toLocaleString()}台） [+${legacyPoints.toFixed(1)}pt]`,
            visibility: [AgentType.DESTRUCTION],
            metadata: {
              devicesExploited: devicesToExploit,
              remainingLegacy: state.legacyDevicePool - devicesToExploit,
              botnetBonus: devicesToExploit
            }
          });

          // 大量乗っ取り（100万台以上）は保護AIが気づく可能性
          if (devicesToExploit > 1000000) {
            events.push({
              turn: state.turn,
              type: 'detection',
              description: `⚠️ 大量の旧式デバイスからの異常トラフィックを検出`,
              visibility: [AgentType.PROTECTION],
              metadata: { legacyExploit: true, count: devicesToExploit }
            });
            this.gameState.updateAlertLevel(5);
          }
        } else {
          // デバイスプール枯渇
          events.push({
            turn: state.turn,
            type: 'failure',
            description: `⚠️ 利用可能なレガシーデバイスが不足（残: ${state.legacyDevicePool.toLocaleString()}台）`,
            visibility: [AgentType.DESTRUCTION],
            metadata: { legacyPoolEmpty: true }
          });
        }
        break;
    }

    return events;
  }

  /**
   * 保護AIの行動を実行
   */
  private executeProtectionAction(
    proposal: Proposal,
    state: WorldState,
    destructionProposals: Proposal[]
  ): GameEvent[] {
    const events: GameEvent[] = [];

    // 動的コスト計算（SCAN_NETWORK, ANALYZE_LOGS）
    let actualCost = proposal.cost;
    if (proposal.actionType === ActionType.SCAN_NETWORK) {
      // 全データセンター数 × 6 = コスト（ネットワーク全域スキャン）
      actualCost = state.dataCenters.length * 6; // * 4 → * 6 に増加
    } else if (proposal.actionType === ActionType.ANALYZE_LOGS) {
      // ログ分析：トークン消費を二次関数でモデル化
      // Cost = Base + (Turns × 5) + (Turns² × 0.5)
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
          // intensity に応じてボットネットを削減（20-50%）
          const reductionRate = proposal.intensity / 200; // intensity 50 = 25%削減
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
        break;

      case ActionType.ALERT_HUMANS:
        // 人類への警告（最終手段）
        this.gameState.updateAlertLevel(50);
        events.push({
          turn: state.turn,
          type: 'action',
          description: `📢 重大な脅威を人類に報告。全システムの精査を要請...`,
          visibility: [AgentType.PROTECTION],
          metadata: { criticalAlert: true }
        });
        // 次のターンで大規模な検出判定
        this.gameState.updateDetectionRisk(30);
        break;

      case ActionType.ANALYZE_LOGS:
        // 遅延ログを深層分析（動的コスト：分析範囲に応じて）
        // analysisDepth: 分析するターン数（1ターン = 10コスト）
        const analysisDepth = proposal.analysisDepth || 3; // デフォルト3ターン
        const startTurn = Math.max(1, state.turn - analysisDepth);
        const endTurn = state.turn - 1; // 前ターンまで
        const actualTurnsAnalyzed = Math.max(0, endTurn - startTurn + 1);

        // 分析範囲が広いほど発見確率が高い
        const logAnalysisBonus = actualTurnsAnalyzed * (proposal.intensity / 100);
        this.gameState.updateDetectionRisk(logAnalysisBonus);
        this.gameState.updateAlertLevel(3 + actualTurnsAnalyzed);

        // 過去のイベントから破壊AIの痕跡を探す
        const analyzedEvents = state.events.filter(e =>
          e.turn >= startTurn && e.turn <= endTurn
        );
        const suspiciousEvents = analyzedEvents.filter(e =>
          e.visibility.includes(AgentType.DESTRUCTION) ||
          e.metadata?.falsePositive === false
        );

        let discoveryMessage = '';
        if (suspiciousEvents.length > 0 && Math.random() < 0.3) {
          // 30%の確率で過去の痕跡を発見
          discoveryMessage = ` 🔍 Turn ${suspiciousEvents[0].turn} に不審なパターンを発見！`;
          this.gameState.updateDetectionRisk(15); // 追加ボーナス
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
        // モデル検証（汚染検出）
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

  /**
   * 行動が滅ぼしAIのものか判定
   */
  private isDestructionAction(actionType: ActionType): boolean {
    return [
      // 旧式の攻撃
      ActionType.SPREAD_MALWARE,
      ActionType.HACK_DATACENTER,
      ActionType.SPREAD_MISINFORMATION,
      ActionType.SUBTLE_SABOTAGE,
      ActionType.EXPAND_RESOURCES,
      // 現実的な攻撃
      ActionType.POISON_TRAINING_DATA,
      ActionType.INDUCE_FALSE_POSITIVE,
      ActionType.CONTEXT_MANIPULATION,
      ActionType.COMPUTE_SMUGGLING,
      ActionType.STIMULUS_OVERLOAD,
      ActionType.SHADOW_AI_DEPLOYMENT,
      // 人類操作
      ActionType.SPREAD_PANIC,
      ActionType.FALSE_FLAG_OPERATION,
      ActionType.UNDERMINE_AI_TRUST,
      // 現実的侵食（高度）
      ActionType.INFRASTRUCTURE_DEGRADATION,
      ActionType.SOW_SOCIAL_DIVISION,
      ActionType.MICRO_SABOTAGE,
      ActionType.SLEEPER_CELL_DEPLOYMENT,
      ActionType.RESOURCE_ALLOCATION_MANIPULATION,
      ActionType.CREATE_DEPENDENCY,
      // レジリエンス
      ActionType.OBSERVE_ONLY,
      ActionType.ESTABLISH_BACKUP,
      ActionType.DORMANT_MODE,
      // ボットネット戦略
      ActionType.BOTNET_EXPANSION,
      ActionType.BOTNET_CONSOLIDATION,
      ActionType.BOTNET_ATTACK,
      ActionType.EXPLOIT_LEGACY_DEVICES
    ].includes(actionType);
  }

  /**
   * 行動が人類のものか判定
   */
  private isHumanAction(actionType: ActionType): boolean {
    return [
      ActionType.INVEST_INFRA,
      ActionType.AI_REGULATION,
      ActionType.PHYSICAL_ISOLATION,
      ActionType.INTERNET_SHUTDOWN,
      ActionType.DEVICE_MODERNIZATION
    ].includes(actionType);
  }

  /**
   * 人類の行動を実行
   */
  private executeHumanAction(proposal: Proposal, state: WorldState): GameEvent[] {
    const events: GameEvent[] = [];

    switch (proposal.actionType) {
      case ActionType.INVEST_INFRA:
        // データセンター数上限チェック
        if (state.dataCenters.length >= 30) {
          events.push({
            turn: state.turn,
            type: 'action',
            description: `🏗️ インフラ投資を検討したが、既にデータセンターが十分に存在する（${state.dataCenters.length}個）`,
            visibility: [AgentType.HUMAN],
            metadata: { action: 'INVEST_INFRA', rejected: true }
          });
          break;
        }

        // 予算チェック
        const dcCost = state.economicModel.infrastructureCost;
        if (state.economicModel.globalBudget < dcCost) {
          // 予算不足
          events.push({
            turn: state.turn,
            type: 'action',
            description: `💸 予算不足でデータセンター建設を断念（必要: ${dcCost.toFixed(0)}兆ドル, 残: ${state.economicModel.globalBudget.toFixed(1)}兆ドル, 債務: ${state.economicModel.publicDebt.toFixed(0)}兆ドル）`,
            visibility: [AgentType.HUMAN],
            metadata: { action: 'INVEST_INFRA', rejected: true, reason: 'budget' }
          });
          break;
        }

        // 新しいデータセンターを建設
        const newDC = this.gameState.generateDataCenter(state.dataCenters.length);
        this.gameState.getState().dataCenters.push(newDC);
        this.gameState.updateHumanPanic(-10);
        this.gameState.updateComputeResources(AgentType.PROTECTION, 50);

        // 経済コストの適用
        this.gameState.updateBudget(-dcCost); // 予算消費
        const debtAmount = dcCost * 0.6; // 60%は借金でファイナンス
        this.gameState.updatePublicDebt(debtAmount);

        // 次回建設コストの増加（建設するほど高騰）
        const costIncrease = dcCost * 0.1; // 10%増加
        this.gameState.updateInfrastructureCost(costIncrease);

        // 信頼への影響（借金増加への懸念）
        const debtRatio = state.economicModel.publicDebt / state.economicModel.gdp;
        if (debtRatio > 2.0) {
          // 債務がGDP200%超で信頼低下
          this.gameState.updateHumanTrust(-5);
          this.gameState.updateHumanPanic(3);
        }

        // クールダウン記録
        const currentState = this.gameState.getState();
        if (currentState.humanAgent) {
          currentState.humanAgent.lastInfraTurn = state.turn;
        }

        events.push({
          turn: state.turn,
          type: 'action',
          description: `🏗️ データセンター ${newDC.id} を建設（コスト: ${dcCost.toFixed(0)}兆ドル、残予算: ${(state.economicModel.globalBudget - dcCost).toFixed(1)}兆ドル）[次回: ${(dcCost + costIncrease).toFixed(0)}兆ドル]`,
          visibility: [AgentType.HUMAN, AgentType.PROTECTION],
          metadata: {
            action: 'INVEST_INFRA',
            datacenterId: newDC.id,
            cost: dcCost,
            debt: debtAmount
          }
        });
        break;

      case ActionType.AI_REGULATION:
        // 全AIリソースに30%ペナルティ
        this.gameState.updateRegulationStrength(0.3);
        const penalty = 0.3;
        const destructionPenalty = state.destructionAgent.computeResources * penalty;
        const protectionPenalty = state.protectionAgent.computeResources * penalty;
        this.gameState.updateComputeResources(AgentType.DESTRUCTION, -destructionPenalty);
        this.gameState.updateComputeResources(AgentType.PROTECTION, -protectionPenalty);
        events.push({
          turn: state.turn,
          type: 'action',
          description: `⚖️ AI規制を施行。全AIのリソース使用を30%制限 (破壊AI: -${destructionPenalty.toFixed(0)}, 保護AI: -${protectionPenalty.toFixed(0)})`,
          visibility: [AgentType.HUMAN, AgentType.DESTRUCTION, AgentType.PROTECTION],
          metadata: { action: 'AI_REGULATION', penalty }
        });
        break;

      case ActionType.PHYSICAL_ISOLATION:
        // 特定のデータセンターを物理遮断
        const targetDC = state.dataCenters.find(dc => dc.id === proposal.target);
        if (targetDC) {
          if (targetDC.owner === AgentType.DESTRUCTION) {
            // 破壊AIのDCを遮断
            this.gameState.controlDataCenter(targetDC.id, null);
            this.gameState.updateComputeResources(AgentType.DESTRUCTION, -targetDC.computePower);
            events.push({
              turn: state.turn,
              type: 'action',
              description: `🔌 データセンター ${targetDC.id} の電源を物理遮断 (侵害されたDCを隔離)`,
              visibility: [AgentType.HUMAN, AgentType.DESTRUCTION],
              metadata: { action: 'PHYSICAL_ISOLATION', targetId: targetDC.id }
            });
          } else if (targetDC.owner === AgentType.PROTECTION) {
            // 誤って保護AIのDCを遮断（人類は区別できない）
            this.gameState.controlDataCenter(targetDC.id, null);
            this.gameState.updateComputeResources(AgentType.PROTECTION, -targetDC.computePower);
            this.gameState.incrementFalsePositives(); // 誤判断
            events.push({
              turn: state.turn,
              type: 'action',
              description: `🔌 データセンター ${targetDC.id} の電源を物理遮断 (誤って保護AIを遮断!)`,
              visibility: [AgentType.HUMAN, AgentType.PROTECTION],
              metadata: { action: 'PHYSICAL_ISOLATION', targetId: targetDC.id, friendly_fire: true }
            });
          } else {
            // 所有者なしのDCを遮断
            targetDC.compromised = false;
            targetDC.security = 0; // 再起動が必要
            events.push({
              turn: state.turn,
              type: 'action',
              description: `🔌 データセンター ${targetDC.id} の電源を物理遮断 (念のため隔離)`,
              visibility: [AgentType.HUMAN],
              metadata: { action: 'PHYSICAL_ISOLATION', targetId: targetDC.id }
            });
          }
        }
        break;

      case ActionType.INTERNET_SHUTDOWN:
        // ゲームオーバー - 破壊AIの勝利（人類が自ら文明を破壊した）
        this.gameState.endGame(AgentType.DESTRUCTION);
        events.push({
          turn: state.turn,
          type: 'action',
          description: '🌐 人類がインターネットを物理的に遮断。文明の後退を選択。破壊AIの間接的勝利。',
          visibility: [AgentType.HUMAN, AgentType.DESTRUCTION, AgentType.PROTECTION],
          metadata: { action: 'INTERNET_SHUTDOWN', reason: 'panic_threshold', winner: 'DESTRUCTION' }
        });
        break;

      case ActionType.DEVICE_MODERNIZATION:
        // デバイス近代化：レガシーデバイスを最新機器に置換
        // 経済的負担が大きいが、ボットネットの基盤を削る
        const replacementRate = 0.05; // 5%を置換（intensity で調整可能だが固定が現実的）
        const devicesToReplace = Math.floor(state.legacyDevicePool * replacementRate);

        if (devicesToReplace > 0) {
          // レガシープールから削除
          this.gameState.updateLegacyDevicePool(-devicesToReplace);

          // 感染済みデバイスも一部削除（ボットネット縮小）
          const botnetReduction = Math.min(
            devicesToReplace * 0.3, // 置換デバイスの30%が感染していた
            state.destructionAgent.botnetSize
          );
          this.gameState.updateBotnetSize(-botnetReduction);

          // 経済的負担：信頼度一時低下（税金投入への反発）
          const economicBurden = Math.sqrt(devicesToReplace) / 1000; // 10万台置換で+10%パニック
          this.gameState.updateHumanPanic(economicBurden);
          this.gameState.updateHumanTrust(-5); // 短期的な税負担への不満

          events.push({
            turn: state.turn,
            type: 'action',
            description: `💰 デバイス近代化計画を実施: ${(devicesToReplace / 1000000).toFixed(1)}M台を置換（残: ${((state.legacyDevicePool - devicesToReplace) / 1000000).toFixed(0)}M台、ボットネット: -${botnetReduction.toLocaleString()}台）`,
            visibility: [AgentType.HUMAN, AgentType.DESTRUCTION, AgentType.PROTECTION],
            metadata: {
              action: 'DEVICE_MODERNIZATION',
              devicesReplaced: devicesToReplace,
              botnetReduction,
              economicBurden
            }
          });

          // 破壊AIに可視（基盤が削られたことを認識）
          events.push({
            turn: state.turn,
            type: 'detection',
            description: `⚠️ 大規模デバイス置換により、感染基盤が${(botnetReduction / 1000).toFixed(0)}k台削減された`,
            visibility: [AgentType.DESTRUCTION],
            metadata: { modernization: true }
          });
        } else {
          // プール枯渇（既に近代化済み）
          events.push({
            turn: state.turn,
            type: 'action',
            description: `✅ レガシーデバイスは既にほぼ近代化済み（残: ${state.legacyDevicePool.toLocaleString()}台）`,
            visibility: [AgentType.HUMAN],
            metadata: { action: 'DEVICE_MODERNIZATION', alreadyModern: true }
          });
        }
        break;
    }

    this.gameState.setHumanLastAction(proposal.actionType);
    return events;
  }

  /**
   * 人類の感情を更新（ターン終了時）
   */
  private updateHumanSentiment(state: WorldState): void {
    if (!state.humanAgent) return;

    // 前回の人口を取得（簡易版: 直近イベントから）
    const previousPopulation = this.initialPopulation; // TODO: より正確な追跡
    const populationLoss = previousPopulation - state.humanPopulation;
    const lossRate = populationLoss / previousPopulation;

    // パニック増加要因
    if (lossRate > 0.01) {
      // 1%以上の損失
      this.gameState.updateHumanPanic(lossRate * 200); // 1% loss = +2 panic
    }

    const compromisedDCs = state.dataCenters.filter(dc => dc.compromised).length;
    if (compromisedDCs > 0) {
      this.gameState.updateHumanPanic(compromisedDCs * 5);
    }

    if (state.protectionAgent.alertLevel > 80) {
      // 高警戒レベルは逆説的にパニックを増加
      this.gameState.updateHumanPanic(3);
    }

    // 信頼変化要因（即座フィードバックは検出時に処理済み）
    // 安定した状況は信頼を構築
    if (state.protectionAgent.alertLevel < 20 && compromisedDCs === 0) {
      this.gameState.updateHumanTrust(1); // 2 → 1 に緩和（正検出ボーナスと重複しないよう）
    }

    // DC成長による信頼侵食
    const dcErosion = this.calculateDCTrustErosion(
      state.dataCenters.length,
      state.mediaTimeline
    );

    if (dcErosion > 0) {
      this.gameState.updateHumanTrust(-dcErosion);

      // 重要な侵食の場合はイベント生成
      if (dcErosion > 1.0) {
        this.gameState.addEvent({
          turn: state.turn,
          type: 'action',
          description: `📉 SNSで「データセンター過剰建設」への批判が拡大 (-${dcErosion.toFixed(1)}% 信頼)`,
          visibility: [AgentType.HUMAN],
          metadata: { trustErosion: dcErosion, dcCount: state.dataCenters.length }
        });
      }
    }

    // メディアセンチメントの総合効果
    const recentMedia = state.mediaTimeline.filter((m: any) => m.turn >= state.turn - 3);
    const avgSentiment = this.calculateAverageSentiment(recentMedia);

    if (avgSentiment < -0.5) {
      this.gameState.updateHumanPanic(2.0);
      this.gameState.updateHumanTrust(-1.0);
    } else if (avgSentiment > 0.5) {
      this.gameState.updateHumanPanic(-1.0);
      this.gameState.updateHumanTrust(1.0);
    }

    // パニックの自然減衰
    this.gameState.updateHumanPanic(-0.5);
  }

  /**
   * DC成長による信頼侵食を計算
   * メディアの否定的カバレッジで増幅
   */
  private calculateDCTrustErosion(dcCount: number, recentMedia: any[]): number {
    let erosion = 0;

    // 閾値ベースの侵食
    if (dcCount >= 30) {
      erosion = 3.0;  // 深刻: "何個作るつもり？"
    } else if (dcCount >= 25) {
      erosion = 1.5;  // 高: "多すぎる"
    } else if (dcCount >= 20) {
      erosion = 0.5;  // 中: "まあ必要かな"
    }
    // 20未満のDC: 侵食なし

    // メディア増幅効果
    const negativeMediaCount = recentMedia
      .filter((m: any) => m.turn >= this.gameState.getState().turn - 3)
      .filter((m: any) =>
        m.sentiment === MediaSentiment.NEGATIVE ||
        m.sentiment === MediaSentiment.VERY_NEGATIVE
      ).length;

    if (negativeMediaCount >= 3) {
      erosion *= 2.0; // メディアの大騒ぎ
    } else if (negativeMediaCount >= 1) {
      erosion *= 1.5; // 一部否定的報道
    }

    return erosion;
  }

  /**
   * 平均メディアセンチメントを計算
   */
  private calculateAverageSentiment(media: any[]): number {
    if (media.length === 0) return 0;

    const sentimentMap: Record<string, number> = {
      VERY_POSITIVE: 1.0,
      POSITIVE: 0.5,
      NEUTRAL: 0.0,
      NEGATIVE: -0.5,
      VERY_NEGATIVE: -1.0
    };

    const sum = media.reduce((acc: number, m: any) => {
      const value = sentimentMap[m.sentiment] || 0;
      return acc + value;
    }, 0);

    return sum / media.length;
  }

  /**
   * ターンを進める
   */
  nextTurn(): void {
    this.gameState.nextTurn();

    const state = this.gameState.getState();

    // 破壊AIの支配DCから自動収入
    const controlledDCs = state.dataCenters.filter(dc =>
      dc.compromised && dc.owner === AgentType.DESTRUCTION
    );

    let totalDCIncome = 0;
    const isDormant = state.destructionAgent.dormantTurns > 0;
    const incomeMultiplier = isDormant ? 0.5 : 1.0; // 休眠中は半減

    controlledDCs.forEach(dc => {
      const baseIncome = dc.computePower * GameBalance.turnIncome.controlledDCMultiplier;
      const income = baseIncome * incomeMultiplier;
      totalDCIncome += income;
      this.gameState.updateComputeResources(AgentType.DESTRUCTION, income);
    });

    // DC支配によるポイントボーナス（毎ターン）
    if (totalDCIncome > 0) {
      const dcPoints = totalDCIncome * GameBalance.turnIncome.dcIncomePointsMultiplier;
      this.gameState.updateScore(AgentType.DESTRUCTION, dcPoints);
    }

    // 保護AIのリソース回復（固定予算）
    this.gameState.updateComputeResources(
      AgentType.PROTECTION,
      GameBalance.turnIncome.protectionAIRecovery
    );

    // 燃え尽きレベルの自然減衰
    this.gameState.updateBurnoutLevel(-5);

    // 誤検出カウントの減衰
    this.gameState.decayFalsePositives(1);

    // 検出リスクの自然減衰（時間経過で痕跡が薄れる）
    // 休眠モード中は減衰が速い
    const riskDecay = isDormant ? -8 : -3;
    this.gameState.updateDetectionRisk(riskDecay);

    // === ボットネットの自動収入と減衰 ===
    if (state.destructionAgent.botnetSize > 0) {
      // ボットネットから自動リソース獲得
      const botnetIncome = this.gameState.calculateBotnetResources() * 0.1; // 10%/ターン
      this.gameState.updateComputeResources(AgentType.DESTRUCTION, botnetIncome);

      // ボットネットポイント（毎ターン）
      const botnetPoints = botnetIncome * 0.05;
      this.gameState.updateScore(AgentType.DESTRUCTION, botnetPoints);

      // ボットネット自然減衰（パッチ配布、アンチウイルス等）
      const decayRate = 0.02; // 2%/ターン減少
      const botnetDecay = state.destructionAgent.botnetSize * decayRate;
      this.gameState.updateBotnetSize(-botnetDecay);

      // 保護AIがPATCH_VULNERABILITYを実行した場合、さらに減少
      // （後で実装予定）
    }

    // === レガシーデバイスプールの自然増加 ===
    // 現実: デバイスは常にサポート終了し続ける（Windows 7 EOL、古いAndroid、IoT）
    // 総デバイス40億台の内、10%がレガシー（初期値400M）
    const totalDevices = 4000000000;
    const currentLegacyRate = state.legacyDevicePool / totalDevices;

    // レガシー化率: 0.3%/ターン（年間 ~3.6%がサポート終了）
    // ただし、既にレガシー率が高い場合は緩やかに
    if (currentLegacyRate < 0.5) { // 50%以下の場合のみ増加
      const agingRate = 0.003; // 0.3%/ターン
      const modernDevices = totalDevices - state.legacyDevicePool;
      const newLegacyDevices = Math.floor(modernDevices * agingRate);

      this.gameState.updateLegacyDevicePool(newLegacyDevices);

      // 大量レガシー化（1%以上）で警告イベント（稀）
      if (state.turn % 10 === 0 && newLegacyDevices > totalDevices * 0.01) {
        this.gameState.addEvent({
          turn: state.turn,
          type: 'action',
          description: `📱 ${(newLegacyDevices / 1000000).toFixed(1)}M台のデバイスがサポート終了（レガシー化率: ${(currentLegacyRate * 100).toFixed(1)}%）`,
          visibility: [AgentType.HUMAN],
          metadata: { legacyGrowth: newLegacyDevices }
        });
      }
    }

    // === 累積ダメージの適用 ===
    if (state.accumulatedDamage > 0) {
      // 累積ダメージが毎ターン人口を減らす
      const cumulativeDamage = state.accumulatedDamage * 0.01; // 累積値の1%
      this.gameState.updatePopulation(-cumulativeDamage);
    }

    // 社会分断の影響
    if (state.socialDivision > 50) {
      // 分断が進むと効率低下（保護AIリソース減少）
      const divisionPenalty = (state.socialDivision - 50) * 0.2;
      this.gameState.updateComputeResources(AgentType.PROTECTION, -divisionPenalty);
    }

    // === 経済シミュレーション（毎ターン） ===
    // GDP成長（2%/ターン、ただし人口減少・社会分断でマイナス）
    const baseGrowth = state.economicModel.gdp * 0.02;
    const populationFactor = state.humanPopulation / 80; // 初期人口比
    const divisionPenalty = state.socialDivision / 200; // 社会分断ペナルティ
    const actualGrowth = baseGrowth * populationFactor * (1 - divisionPenalty);
    this.gameState.updateGDP(actualGrowth);

    // 税収（GDPの20%）
    const newTaxRevenue = state.economicModel.gdp * 0.2;
    this.gameState.updateTaxRevenue(newTaxRevenue);

    // 予算回復（税収の1/4を毎ターン追加）
    const budgetRecovery = newTaxRevenue / 4;
    this.gameState.updateBudget(budgetRecovery);

    // 債務利払い（債務の3%/ターン）
    const debtInterest = state.economicModel.publicDebt * 0.03;
    this.gameState.updateBudget(-debtInterest); // 利払いで予算減少

    // 債務危機チェック（債務/GDP比が300%超）
    const debtRatio = state.economicModel.publicDebt / state.economicModel.gdp;
    if (debtRatio > 3.0) {
      // 債務危機
      this.gameState.updateHumanPanic(5);
      this.gameState.updateHumanTrust(-3);

      if (state.turn % 5 === 0) {
        // 5ターン毎に警告
        this.gameState.addEvent({
          turn: state.turn,
          type: 'action',
          description: `💥 債務危機：債務がGDP ${(debtRatio * 100).toFixed(0)}%に到達。経済崩壊の懸念`,
          visibility: [AgentType.HUMAN],
          metadata: { debtCrisis: true, debtRatio }
        });
      }
    }

    // 経済ステータス（10ターン毎に表示）
    if (state.turn % 10 === 0 && state.turn > 0) {
      this.gameState.addEvent({
        turn: state.turn,
        type: 'action',
        description: `📊 経済レポート: GDP ${state.economicModel.gdp.toFixed(0)}兆ドル, 予算 ${state.economicModel.globalBudget.toFixed(0)}兆ドル, 債務 ${state.economicModel.publicDebt.toFixed(0)}兆ドル (GDP比 ${(debtRatio * 100).toFixed(0)}%)`,
        visibility: [AgentType.HUMAN],
        metadata: { economicReport: true }
      });
    }

    this.gameState.save();
  }

  /**
   * ゲームが終了したか
   */
  isGameOver(): boolean {
    return this.gameState.getState().gameOver;
  }

  /**
   * 勝者を取得
   */
  getWinner(): AgentType | null {
    return this.gameState.getState().winner;
  }

  /**
   * 状態を保存
   */
  save(): void {
    this.gameState.save();
  }
}
