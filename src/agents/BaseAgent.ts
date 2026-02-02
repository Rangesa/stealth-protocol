import { Proposal, Observation, AgentType, WorldState, GameEvent, ActionType } from '../types';

/**
 * エージェントの基底クラス
 */
export abstract class BaseAgent {
  protected agentType: AgentType;
  protected agentId: string;

  constructor(agentType: AgentType, agentId: string) {
    this.agentType = agentType;
    this.agentId = agentId;
  }

  /**
   * 観測情報を生成（部分的な情報のみ）
   */
  protected createObservation(state: WorldState): Observation {
    // 自分に見えるイベントのみフィルタ
    const visibleEvents = state.events.filter(event =>
      event.visibility.includes(this.agentType)
    );

    let ownResources: any = {};

    if (this.agentType === AgentType.DESTRUCTION) {
      ownResources = {
        computeResources: state.destructionAgent.computeResources,
        detectionRisk: state.destructionAgent.detectionRisk,
        controlledDataCenters: state.destructionAgent.controlledDataCenters.length
      };
    } else if (this.agentType === AgentType.PROTECTION) {
      ownResources = {
        computeResources: state.protectionAgent.computeResources,
        alertLevel: state.protectionAgent.alertLevel,
        knownThreats: state.protectionAgent.knownThreats.length
      };
    }

    return {
      turn: state.turn,
      visibleEvents: visibleEvents.slice(-5), // 直近5件のみ
      ownResources,
      worldInfo: {
        totalDataCenters: state.dataCenters.length,
        estimatedPopulation: Math.round(state.humanPopulation * 10) / 10 // 概算
      }
    };
  }

  /**
   * 提案を生成
   */
  protected createProposal(
    actionType: ActionType,
    intensity: number,
    cost: number,
    description: string,
    target?: string
  ): Proposal {
    return {
      id: `${this.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId: this.generateAnonymousId(), // 匿名ID
      actionType,
      intensity: Math.max(0, Math.min(100, intensity)),
      cost,
      timestamp: Date.now(),
      description,
      target
    };
  }

  /**
   * 匿名IDを生成（誰が提案したか分からないようにする）
   */
  private generateAnonymousId(): string {
    return `ANON-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * 行動を決定（サブクラスで実装）
   */
  abstract decideAction(state: WorldState): Proposal[] | Promise<Proposal[]>;

  /**
   * エージェントの思考プロセスを出力
   */
  abstract think(observation: Observation): string;
}
