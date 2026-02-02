import { MediaAgentType, MediaObservation, MediaContent } from '../types/MediaTypes';
import { WorldState, GameEvent, AgentType } from '../types';

/**
 * メディアエージェントの基底クラス
 */
export abstract class BaseMediaAgent {
  protected agentType: MediaAgentType;
  protected agentId: string;

  constructor(agentType: MediaAgentType, agentId: string) {
    this.agentType = agentType;
    this.agentId = agentId;
  }

  /**
   * メディア観測情報を生成
   */
  protected createMediaObservation(
    state: WorldState,
    recentMediaContent: any[] // MediaContent[]
  ): MediaObservation {
    // 人類が見える形のイベントのみフィルタ
    const humanVisibleEvents = state.events.filter(event =>
      event.visibility.includes(AgentType.HUMAN)
    ).slice(-15);

    const dcGrowthRate = this.calculateDCGrowthRate(state);
    const popLossRate = this.calculatePopulationLossRate(state);

    // 重大インシデントを検出
    const majorIncident = popLossRate > 0.05 || humanVisibleEvents.some(e =>
      e.description.includes('侵害') || e.description.includes('遮断')
    );

    const newDataCenter = humanVisibleEvents.some(e =>
      e.metadata?.action === 'INVEST_INFRA' && e.turn >= state.turn - 1
    );

    const regulationEvent = humanVisibleEvents.some(e =>
      e.metadata?.action === 'AI_REGULATION' && e.turn >= state.turn - 1
    );

    return {
      turn: state.turn,
      recentEvents: humanVisibleEvents.slice(-5),
      dataCenterCount: state.dataCenters.length,
      dataCenterGrowthRate: dcGrowthRate,
      humanPopulation: state.humanPopulation,
      populationLossRate: popLossRate,
      humanPanic: state.humanAgent?.panic || 0,
      humanTrust: state.humanAgent?.trust || 50,
      protectionAlertLevel: state.protectionAgent.alertLevel,
      existingMedia: recentMediaContent.slice(-10),
      majorIncident,
      newDataCenter,
      regulationEvent
    };
  }

  /**
   * DC成長率を計算（過去3ターンで建設されたDC数）
   */
  private calculateDCGrowthRate(state: WorldState): number {
    const buildEvents = state.events.filter(e =>
      e.metadata?.action === 'INVEST_INFRA' &&
      e.turn >= state.turn - 3
    );
    return buildEvents.length;
  }

  /**
   * 人口損失率を計算
   */
  private calculatePopulationLossRate(state: WorldState): number {
    const initialPop = 80;
    return (initialPop - state.humanPopulation) / initialPop;
  }

  /**
   * メディアコンテンツを生成（サブクラスで実装）
   */
  abstract generateContent(
    state: WorldState,
    recentMediaContent: any[] // MediaContent[]
  ): Promise<any[]>; // MediaContent[]

  /**
   * フォールバックコンテンツを生成（サブクラスで実装）
   */
  abstract generateFallbackContent(observation: MediaObservation): any[]; // MediaContent[]
}
