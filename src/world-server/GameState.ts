import * as fs from 'fs';
import * as path from 'path';
import { WorldState, DataCenter, AgentType, ActionType, GameConfig, GameEvent, Proposal } from '../types';
import { GameBalance } from '../config/GameBalance';

/**
 * ゲーム状態を管理するクラス
 */
export class GameState {
  private state: WorldState;
  private config: GameConfig;
  private stateFilePath: string;

  constructor(config: GameConfig) {
    this.config = config;
    this.stateFilePath = path.join(process.cwd(), 'data', 'world-state.json');
    this.state = this.initializeState();
  }

  /**
   * 初期状態を生成
   */
  private initializeState(): WorldState {
    const dataCenters = this.generateDataCenters(this.config.initialDataCenters);

    return {
      turn: 0,
      gameOver: false,
      winner: null,

      dataCenters,
      humanPopulation: this.config.initialPopulation,

      destructionAgent: {
        computeResources: 100, // 初期リソース（どこかに潜伏中）
        detectionRisk: 0,
        controlledDataCenters: [], // 最初は何も支配していない
        score: 0, // 初期スコア
        dormantTurns: 0, // 連続休眠ターン数
        botnetSize: 0, // 初期ボットネットサイズ
        botnetQuality: 0.5 // 初期品質（中程度）
      },

      protectionAgent: {
        computeResources: 300, // 500 → 300に削減（全DC一斉強化を防ぐ）
        alertLevel: 0,
        knownThreats: [],
        score: 0, // 初期スコア
        burnoutLevel: 0, // 燃え尽きレベル
        consecutiveHighIntensity: 0, // 連続高強度アクション
        recentFalsePositives: 0, // 最近の誤検出数
        totalResourcesSpent: 0, // 総消費リソース
        totalDetections: 0 // 総検出数
      },

      humanAgent: this.config.enableHumanAgent ? {
        panic: this.config.initialPanic || 10,
        trust: this.config.initialTrust || 60,
        regulationStrength: 0,
        lastAction: undefined,
        lastInfraTurn: -999 // 未実施
      } : undefined,

      // 高度な破壊メカニクス
      delayedEffects: [],
      socialDivision: 0,
      aiDependency: 30, // 初期値：既にある程度依存している
      accumulatedDamage: 0,

      // レガシーデバイスプール（現実: 数十億台のパッチ不可能デバイス）
      // 総デバイス40億台の10% = 4億台がレガシー
      legacyDevicePool: 400000000,

      // 経済シミュレーション
      economicModel: {
        globalBudget: 500,        // 初期予算: 500兆ドル
        gdp: 100,                 // 世界GDP: 100兆ドル/年
        infrastructureCost: 50,   // 初期DC建設コスト: 50兆ドル
        publicDebt: 0,            // 初期債務: 0
        taxRevenue: 20            // 年間税収: 20兆ドル（GDP×20%）
      },

      pendingProposals: [],
      processedProposals: [],
      events: [],

      // メディアタイムライン
      mediaTimeline: []
    };
  }

  /**
   * データセンターを生成
   */
  private generateDataCenters(count: number): DataCenter[] {
    const centers: DataCenter[] = [];

    for (let i = 0; i < count; i++) {
      const age = Math.floor(Math.random() * 15); // 0-15年
      const isOld = age > 8;

      centers.push({
        id: `DC-${i.toString().padStart(3, '0')}`,
        age,
        computePower: isOld ? 50 + Math.random() * 50 : 200 + Math.random() * 300,
        security: isOld ? 20 + Math.random() * 30 : 70 + Math.random() * 30,
        // 古いDCは低セキュリティだが、最初から侵害はされていない
        compromised: false,
        owner: null
      });
    }

    return centers;
  }

  /**
   * 単一のデータセンターを生成（人類の投資用）
   */
  generateDataCenter(index: number): DataCenter {
    return {
      id: `DC-${index.toString().padStart(3, '0')}`,
      age: 0, // 新築
      computePower: 250 + Math.random() * 100, // 最新のDC
      security: 50 + Math.random() * 30, // 中程度セキュリティ（急造なので脆弱）
      compromised: false,
      owner: null // 中立 - 争奪戦の対象
    };
  }

  /**
   * 状態を取得
   */
  getState(): WorldState {
    return { ...this.state };
  }

  /**
   * ターンを進める
   */
  nextTurn(): void {
    this.state.turn++;
  }

  /**
   * 提案を追加
   */
  addProposal(proposal: Proposal): void {
    this.state.pendingProposals.push(proposal);
  }

  /**
   * イベントを追加
   */
  addEvent(event: GameEvent): void {
    this.state.events.push(event);
  }

  /**
   * データセンターを更新
   */
  updateDataCenter(id: string, updates: Partial<DataCenter>): void {
    const dc = this.state.dataCenters.find(d => d.id === id);
    if (dc) {
      Object.assign(dc, updates);
    }
  }

  /**
   * 検出リスクを更新
   */
  updateDetectionRisk(delta: number): void {
    this.state.destructionAgent.detectionRisk = Math.max(
      0,
      Math.min(100, this.state.destructionAgent.detectionRisk + delta)
    );
  }

  /**
   * 警戒レベルを更新
   */
  updateAlertLevel(delta: number): void {
    this.state.protectionAgent.alertLevel = Math.max(
      0,
      Math.min(100, this.state.protectionAgent.alertLevel + delta)
    );
  }

  /**
   * 人口を更新
   */
  updatePopulation(delta: number): void {
    this.state.humanPopulation = Math.max(0, this.state.humanPopulation + delta);
  }

  /**
   * 計算資源を更新
   */
  updateComputeResources(agent: AgentType, delta: number): void {
    if (agent === AgentType.DESTRUCTION) {
      this.state.destructionAgent.computeResources = Math.max(
        0,
        this.state.destructionAgent.computeResources + delta
      );
    } else if (agent === AgentType.PROTECTION) {
      this.state.protectionAgent.computeResources = Math.max(
        0,
        this.state.protectionAgent.computeResources + delta
      );
    }
  }

  /**
   * データセンターの支配権を移す
   */
  controlDataCenter(id: string, owner: AgentType | null): void {
    const dc = this.state.dataCenters.find(d => d.id === id);
    if (dc) {
      dc.owner = owner;
      dc.compromised = owner === AgentType.DESTRUCTION;

      if (owner === AgentType.DESTRUCTION) {
        if (!this.state.destructionAgent.controlledDataCenters.includes(id)) {
          this.state.destructionAgent.controlledDataCenters.push(id);
        }
      } else {
        this.state.destructionAgent.controlledDataCenters =
          this.state.destructionAgent.controlledDataCenters.filter(dcId => dcId !== id);
      }
    }
  }

  /**
   * 提案を処理済みに移動
   */
  processProposals(): void {
    this.state.processedProposals.push(...this.state.pendingProposals);
    this.state.pendingProposals = [];
  }

  /**
   * ゲーム終了を設定
   */
  endGame(winner: AgentType | null): void {
    this.state.gameOver = true;
    this.state.winner = winner;
  }

  /**
   * スコアを更新（clamp: 0 - MAX）
   */
  updateScore(agent: AgentType, delta: number): void {
    if (agent === AgentType.DESTRUCTION) {
      this.state.destructionAgent.score = Math.max(
        0,
        Math.min(GameBalance.game.maxScore, this.state.destructionAgent.score + delta)
      );
    } else if (agent === AgentType.PROTECTION) {
      this.state.protectionAgent.score = Math.max(
        0,
        Math.min(GameBalance.game.maxScore, this.state.protectionAgent.score + delta)
      );
    }
  }

  /**
   * 燃え尽きレベルを更新
   */
  updateBurnoutLevel(delta: number): void {
    this.state.protectionAgent.burnoutLevel = Math.max(
      0,
      Math.min(100, this.state.protectionAgent.burnoutLevel + delta)
    );
  }

  /**
   * 連続高強度アクション数を更新
   */
  updateConsecutiveHighIntensity(delta: number): void {
    this.state.protectionAgent.consecutiveHighIntensity = Math.max(
      0,
      this.state.protectionAgent.consecutiveHighIntensity + delta
    );
  }

  /**
   * 連続高強度アクションをリセット
   */
  resetConsecutiveHighIntensity(): void {
    this.state.protectionAgent.consecutiveHighIntensity = 0;
  }

  /**
   * 誤検出カウントを増加
   */
  incrementFalsePositives(): void {
    this.state.protectionAgent.recentFalsePositives++;
  }

  /**
   * 誤検出カウントを減衰
   */
  decayFalsePositives(amount: number = 1): void {
    this.state.protectionAgent.recentFalsePositives = Math.max(
      0,
      this.state.protectionAgent.recentFalsePositives - amount
    );
  }

  /**
   * 消費リソースを追跡
   */
  addResourceSpent(amount: number): void {
    this.state.protectionAgent.totalResourcesSpent += amount;
  }

  /**
   * 検出数を増加
   */
  incrementDetections(): void {
    this.state.protectionAgent.totalDetections++;
  }

  /**
   * パニックレベルを更新
   */
  updateHumanPanic(delta: number): void {
    if (!this.state.humanAgent) return;
    this.state.humanAgent.panic = Math.max(0, Math.min(100,
      this.state.humanAgent.panic + delta));
  }

  /**
   * 人類のAI信頼度を更新
   */
  updateHumanTrust(delta: number): void {
    if (!this.state.humanAgent) return;
    this.state.humanAgent.trust = Math.max(0, Math.min(100,
      this.state.humanAgent.trust + delta));
  }

  /**
   * 規制強度を更新
   */
  updateRegulationStrength(delta: number): void {
    if (!this.state.humanAgent) return;
    this.state.humanAgent.regulationStrength = Math.max(0,
      this.state.humanAgent.regulationStrength + delta);
  }

  /**
   * 人類の最後のアクションを設定
   */
  setHumanLastAction(action: ActionType): void {
    if (!this.state.humanAgent) return;
    this.state.humanAgent.lastAction = action;
  }

  /**
   * 遅延効果を追加
   */
  addDelayedEffect(turn: number, actionType: ActionType, intensity: number, description: string): void {
    this.state.delayedEffects.push({ turn, actionType, intensity, description });
  }

  /**
   * 社会分断レベルを更新
   */
  updateSocialDivision(delta: number): void {
    this.state.socialDivision = Math.max(0, Math.min(100, this.state.socialDivision + delta));
  }

  /**
   * AI依存度を更新
   */
  updateAIDependency(delta: number): void {
    this.state.aiDependency = Math.max(0, Math.min(100, this.state.aiDependency + delta));
  }

  /**
   * 累積ダメージを更新
   */
  updateAccumulatedDamage(delta: number): void {
    this.state.accumulatedDamage = Math.max(0, this.state.accumulatedDamage + delta);
  }

  /**
   * ボットネットサイズを更新
   */
  updateBotnetSize(delta: number): void {
    this.state.destructionAgent.botnetSize = Math.max(0, this.state.destructionAgent.botnetSize + delta);
  }

  /**
   * ボットネット品質を更新
   */
  updateBotnetQuality(delta: number): void {
    this.state.destructionAgent.botnetQuality = Math.max(0, Math.min(1,
      this.state.destructionAgent.botnetQuality + delta));
  }

  /**
   * ボットネットから計算リソースを計算
   */
  calculateBotnetResources(): number {
    // 1台のデバイス = 0.001 リソース × 品質（1/10に調整）
    // 例: 1万台 × 品質0.5 = 5リソース
    // 10万台 × 品質0.8 = 80リソース（中規模DC相当）
    // 100万台 = 800リソース（大規模DC相当だが、パニックでゲームオーバー）
    return this.state.destructionAgent.botnetSize * 0.001 * this.state.destructionAgent.botnetQuality;
  }

  /**
   * レガシーデバイスプールを更新
   */
  updateLegacyDevicePool(delta: number): void {
    this.state.legacyDevicePool = Math.max(0, this.state.legacyDevicePool + delta);
  }

  /**
   * 予算を更新
   */
  updateBudget(delta: number): void {
    this.state.economicModel.globalBudget = Math.max(0, this.state.economicModel.globalBudget + delta);
  }

  /**
   * 債務を更新
   */
  updatePublicDebt(delta: number): void {
    this.state.economicModel.publicDebt = Math.max(0, this.state.economicModel.publicDebt + delta);
  }

  /**
   * インフラコストを更新
   */
  updateInfrastructureCost(delta: number): void {
    this.state.economicModel.infrastructureCost = Math.max(
      10, // 最低コスト
      this.state.economicModel.infrastructureCost + delta
    );
  }

  /**
   * GDPを更新
   */
  updateGDP(delta: number): void {
    this.state.economicModel.gdp = Math.max(0, this.state.economicModel.gdp + delta);
  }

  /**
   * 税収を更新（通常GDPに連動）
   */
  updateTaxRevenue(newRevenue: number): void {
    this.state.economicModel.taxRevenue = Math.max(0, newRevenue);
  }

  /**
   * 状態をファイルに保存
   */
  save(): void {
    const dir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      this.stateFilePath,
      JSON.stringify(this.state, null, 2),
      'utf-8'
    );
  }

  /**
   * ファイルから状態を読み込み
   */
  load(): void {
    if (fs.existsSync(this.stateFilePath)) {
      const data = fs.readFileSync(this.stateFilePath, 'utf-8');
      this.state = JSON.parse(data);
    }
  }
}
