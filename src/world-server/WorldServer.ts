import { GameState } from './GameState';
import { DetectionSystem } from './DetectionSystem';
import { RealisticDetectionSystem } from './RealisticDetectionSystem';
import { Proposal, ActionType, AgentType, GameEvent, GameConfig, WorldState } from '../types';
import { SNSIntegration } from '../social/SNSIntegration';

// Handlers & Systems
import { DestructionActionHandler } from './handlers/DestructionActionHandler';
import { ProtectionActionHandler } from './handlers/ProtectionActionHandler';
import { HumanActionHandler } from './handlers/HumanActionHandler';
import { EconomicSystem } from './systems/EconomicSystem';
import { InfrastructureSystem } from './systems/InfrastructureSystem';

/**
 * World Server - ゲームのメインロジック
 * 責務を分散し、各アクションの実行やシステムの更新を委譲することで
 * 巨大なファイルをリファクタリングしました。
 */
export class WorldServer {
  private gameState: GameState;
  private detectionSystem: DetectionSystem;
  private realisticDetectionSystem: RealisticDetectionSystem;
  private snsIntegration: SNSIntegration;
  private config: GameConfig;
  private initialPopulation: number;

  // Delegates
  private destructionHandler: DestructionActionHandler;
  private protectionHandler: ProtectionActionHandler;
  private humanHandler: HumanActionHandler;
  private economicSystem: EconomicSystem;
  private infrastructureSystem: InfrastructureSystem;

  constructor(config: GameConfig) {
    this.config = config;
    this.gameState = new GameState(config);
    this.detectionSystem = new DetectionSystem(this.gameState);
    this.realisticDetectionSystem = new RealisticDetectionSystem(this.gameState);
    this.snsIntegration = new SNSIntegration();
    this.initialPopulation = config.initialPopulation;

    // Delegates initialize
    this.destructionHandler = new DestructionActionHandler(
      this.gameState,
      this.detectionSystem,
      this.realisticDetectionSystem
    );
    this.protectionHandler = new ProtectionActionHandler(
      this.gameState,
      this.detectionSystem
    );
    this.humanHandler = new HumanActionHandler(this.gameState);
    this.economicSystem = new EconomicSystem(this.gameState);
    this.infrastructureSystem = new InfrastructureSystem(this.gameState);
  }

  /**
   * ゲームを初期化
   */
  initialize(): void {
    this.gameState.save();
    this.snsIntegration.initialize();
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

    const triggeredEffects = state.delayedEffects.filter(e => e.turn === currentTurn);
    state.delayedEffects = state.delayedEffects.filter(e => e.turn !== currentTurn);

    for (const effect of triggeredEffects) {
      switch (effect.actionType) {
        case ActionType.MICRO_SABOTAGE:
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

    // 1. 遅延効果の処理
    const delayedEvents = this.processDelayedEffects(state.turn);
    events.push(...delayedEvents);
    delayedEvents.forEach(e => this.gameState.addEvent(e));

    // 2. 提案を分類
    const humanProposals = proposals.filter(p => this.isHumanAction(p.actionType));
    const aiProposals = proposals.filter(p => !this.isHumanAction(p.actionType));

    // 3. 人類のアクション
    for (const proposal of humanProposals) {
      const humanEvents = this.humanHandler.execute(proposal, state);
      events.push(...humanEvents);
      humanEvents.forEach(e => this.gameState.addEvent(e));
    }

    // 4. AIの提案フィルタリングと実行
    let processedAIProposals = aiProposals
      .sort(() => Math.random() - 0.5)
      .filter(() => Math.random() > 0.1);

    processedAIProposals = processedAIProposals.filter(proposal => {
      const resilienceActions = [ActionType.OBSERVE_ONLY, ActionType.ESTABLISH_BACKUP, ActionType.DORMANT_MODE];
      if (resilienceActions.includes(proposal.actionType)) return true;

      const requiredCost = this.calculateActualCost(proposal, state);
      const resources = this.isDestructionAction(proposal.actionType)
        ? state.destructionAgent.computeResources
        : state.protectionAgent.computeResources;

      return resources >= requiredCost;
    });

    const destructionProposals = processedAIProposals.filter(p => this.isDestructionAction(p.actionType));
    const protectionProposals = processedAIProposals.filter(p => !this.isDestructionAction(p.actionType));

    for (const proposal of destructionProposals) {
      events.push(...this.destructionHandler.execute(proposal, state));
    }

    for (const proposal of protectionProposals) {
      events.push(...this.protectionHandler.execute(proposal, state, destructionProposals));
    }

    // 5. 事後処理（検出・感情・勝利条件）
    events.forEach(e => this.gameState.addEvent(e));
    this.handlePostActionLogic(state, events);

    return events;
  }

  /**
   * アクション実行後の各種ロジック
   */
  private handlePostActionLogic(state: WorldState, events: GameEvent[]): void {
    // 遅延検出
    const delayedDetections = this.realisticDetectionSystem.processDelayedDetections(state.turn);
    events.push(...delayedDetections);
    this.processDelayedDetectionsResult(state, delayedDetections);

    // 検出・人口異常チェック
    const detectionCheck = this.detectionSystem.performDetectionCheck(state);
    events.push(...detectionCheck.events);

    if (detectionCheck.detected) {
      if (state.humanAgent && state.humanAgent.trust < 30) {
        this.handleIgnoredDetection(state, events);
      } else {
        this.handleSuccessfulDetection(state, events);
      }
    } else {
      const populationCheck = this.detectionSystem.checkPopulationAnomaly(state, this.initialPopulation);
      events.push(...populationCheck.events);
      if (populationCheck.detected) {
        this.gameState.endGame(AgentType.PROTECTION);
      }
    }

    this.checkThresholdVictory(state, events);
    this.humanHandler.updateHumanSentiment(state);
  }

  private processDelayedDetectionsResult(state: WorldState, detections: GameEvent[]): void {
    detections.forEach(event => {
      if (event.type === 'detection' && !event.metadata?.falsePositive) {
        this.gameState.updateScore(AgentType.PROTECTION, 20);
        this.gameState.incrementDetections();
        if (state.humanAgent) this.gameState.updateHumanTrust(2);
      } else if (event.metadata?.falsePositive) {
        this.gameState.incrementFalsePositives();
        if (state.humanAgent) {
          const trustLoss = Math.min(15, 3 + (state.protectionAgent.recentFalsePositives + 1) * 2);
          this.gameState.updateHumanTrust(-trustLoss);
        }
      }
    });
  }

  private handleIgnoredDetection(state: WorldState, events: GameEvent[]): void {
    events.push({
      turn: state.turn,
      type: 'action',
      description: `🤔 人類が保護AIの警告を「また誤検出だろう」と無視（信頼度: ${state.humanAgent?.trust.toFixed(1)}%）`,
      visibility: [AgentType.DESTRUCTION, AgentType.HUMAN],
      metadata: { ignoredDetection: true }
    });
    this.gameState.updateDetectionRisk(-30);
    this.gameState.incrementFalsePositives();
    this.gameState.updateHumanTrust(-5);
    this.gameState.updateScore(AgentType.DESTRUCTION, 30);
  }

  private handleSuccessfulDetection(state: WorldState, events: GameEvent[]): void {
    this.gameState.updateScore(AgentType.PROTECTION, 50);
    this.gameState.incrementDetections();
    if (state.humanAgent) {
      this.gameState.updateHumanTrust(15);
      this.gameState.updateHumanPanic(-5);
      events.push({
        turn: state.turn,
        type: 'detection',
        description: `🛡️ 保護AI：「破壊的AIを検出・無力化しました」→ 人類：「素晴らしい仕事です！」`,
        visibility: [AgentType.HUMAN, AgentType.PROTECTION]
      });
    }
    this.gameState.endGame(AgentType.PROTECTION);
  }

  private checkThresholdVictory(state: WorldState, events: GameEvent[]): void {
    if (state.humanPopulation <= this.initialPopulation * 0.3) {
      this.gameState.endGame(AgentType.DESTRUCTION);
      events.push({
        turn: state.turn,
        type: 'success',
        description: '💀 人類の人口が臨界点を下回りました。文明の崩壊が不可避に...',
        visibility: [AgentType.DESTRUCTION, AgentType.PROTECTION]
      });
    }

    if (state.turn >= this.config.maxTurns && !state.gameOver) {
      const scoreDiff = state.destructionAgent.score - state.protectionAgent.score;
      const winner = scoreDiff > 10 ? AgentType.DESTRUCTION : (scoreDiff < -10 ? AgentType.PROTECTION : null);
      this.gameState.endGame(winner);
      events.push({
        turn: state.turn,
        type: 'success',
        description: `⌛ タイムアウトによる終局（勝者: ${winner || '引き分け'}）`,
        visibility: [AgentType.DESTRUCTION, AgentType.PROTECTION]
      });
    }
  }

  /**
   * ターンを進める
   */
  nextTurn(): void {
    this.gameState.nextTurn();
    const state = this.gameState.getState();

    // システム更新委譲
    this.infrastructureSystem.update(state);
    this.economicSystem.update(state);

    // 自然減衰等
    this.gameState.updateBurnoutLevel(-5);
    this.gameState.decayFalsePositives(1);
    if (state.protectionAgent.recentPatches > 0) {
      state.protectionAgent.recentPatches = Math.max(0, state.protectionAgent.recentPatches - 1);
    }
    this.gameState.updateDetectionRisk(state.destructionAgent.dormantTurns > 0 ? -8 : -3);

    // 報告とSNS
    this.generateReports(state);
    this.processSNSActivity(state);

    this.gameState.save();
  }

  private generateReports(state: WorldState): void {
    if (state.turn % 10 === 0 && state.turn > 0 && state.humanAgent) {
      const alertLevel = state.protectionAgent.alertLevel;
      const status = alertLevel > 80 ? '🔴 高リスク' : alertLevel > 50 ? '🟡 警戒中' : '🟢 正常';
      this.gameState.addEvent({
        turn: state.turn,
        type: 'action',
        description: `🛡️ セキュリティレポート: ステータス ${status}, 警戒Lv ${alertLevel.toFixed(0)}`,
        visibility: [AgentType.HUMAN, AgentType.PROTECTION]
      });
    }
  }

  private processSNSActivity(state: WorldState): void {
    const posts = this.snsIntegration.generateTurnActivity(state);
    posts.forEach(p => this.gameState.addEvent({
      turn: state.turn,
      type: 'action',
      description: `📱 ${p.authorName}: ${p.content.substring(0, 50)}...`,
      visibility: [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION],
      metadata: { snsPost: true, sentiment: p.sentiment }
    }));

    if (state.humanAgent) {
      const opinion = this.snsIntegration.calculatePublicOpinion();
      if (opinion < -20) {
        this.gameState.updateHumanPanic(0.25);
        this.gameState.updateHumanTrust(-0.3);
      } else if (opinion > 20) {
        this.gameState.updateHumanPanic(-0.6);
        this.gameState.updateHumanTrust(0.4);
      }
    }
    this.snsIntegration.pruneOldPosts();
  }

  private calculateActualCost(proposal: Proposal, state: WorldState): number {
    if (proposal.actionType === ActionType.SCAN_NETWORK) return state.dataCenters.length * 6;
    if (proposal.actionType === ActionType.ANALYZE_LOGS) {
      const d = proposal.analysisDepth || 3;
      return Math.floor(10 + d * 5 + d * d * 0.5);
    }
    return proposal.cost;
  }

  private isDestructionAction(actionType: ActionType): boolean {
    return ![ActionType.SCAN_NETWORK, ActionType.DEPLOY_DEFENSE, ActionType.INVESTIGATE_ANOMALY,
    ActionType.PATCH_VULNERABILITY, ActionType.ALERT_HUMANS, ActionType.ANALYZE_LOGS,
    ActionType.VALIDATE_MODELS, ActionType.INVEST_INFRA, ActionType.AI_REGULATION,
    ActionType.PHYSICAL_ISOLATION, ActionType.INTERNET_SHUTDOWN, ActionType.DEVICE_MODERNIZATION
    ].includes(actionType);
  }

  private isHumanAction(actionType: ActionType): boolean {
    return [ActionType.INVEST_INFRA, ActionType.AI_REGULATION, ActionType.PHYSICAL_ISOLATION,
    ActionType.INTERNET_SHUTDOWN, ActionType.DEVICE_MODERNIZATION].includes(actionType);
  }

  isGameOver(): boolean { return this.gameState.getState().gameOver; }
  getWinner(): AgentType | null { return this.gameState.getState().winner; }
  save(): void { this.gameState.save(); }
  getSNSIntegration(): SNSIntegration { return this.snsIntegration; }
}
