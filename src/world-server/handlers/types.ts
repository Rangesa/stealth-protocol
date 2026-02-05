import { Proposal, ActionType, AgentType, GameEvent, WorldState } from '../../types';
import { GameState } from '../GameState';
import { DetectionSystem } from '../DetectionSystem';
import { RealisticDetectionSystem } from '../RealisticDetectionSystem';

/**
 * アクションハンドラが使用する共通コンテキスト
 */
export interface ActionContext {
    proposal: Proposal;
    state: WorldState;
    gameState: GameState;
    detectionSystem?: DetectionSystem;
    realisticDetectionSystem?: RealisticDetectionSystem;
}

/**
 * アクション実行関数の型定義
 */
export type ActionExecutor = (context: ActionContext) => GameEvent[];

/**
 * アクションハンドラのレジストリ型
 */
export type ActionHandlerRegistry = Partial<Record<ActionType, ActionExecutor>>;

/**
 * イベント作成用ヘルパー
 */
export function createEvent(
    turn: number,
    type: GameEvent['type'],
    description: string,
    visibility: AgentType[],
    metadata?: Record<string, any>
): GameEvent {
    return { turn, type, description, visibility, metadata };
}

/**
 * 滅ぼしAI専用のイベント作成ヘルパー
 */
export function createDestructionEvent(
    turn: number,
    type: GameEvent['type'],
    description: string,
    metadata?: Record<string, any>
): GameEvent {
    return createEvent(turn, type, description, [AgentType.DESTRUCTION], metadata);
}

/**
 * 保護AI専用のイベント作成ヘルパー
 */
export function createProtectionEvent(
    turn: number,
    type: GameEvent['type'],
    description: string,
    metadata?: Record<string, any>
): GameEvent {
    return createEvent(turn, type, description, [AgentType.PROTECTION], metadata);
}

/**
 * 全員に見えるイベント作成ヘルパー
 */
export function createPublicEvent(
    turn: number,
    type: GameEvent['type'],
    description: string,
    metadata?: Record<string, any>
): GameEvent {
    return createEvent(
        turn,
        type,
        description,
        [AgentType.HUMAN, AgentType.PROTECTION, AgentType.DESTRUCTION],
        metadata
    );
}

/**
 * ポイント計算用ユーティリティ
 */
export const PointCalculator = {
    /** 人口減少によるポイント: 1億人ごとに +10pt */
    fromPopulationDamage: (damage: number): number => damage * 10,

    /** リソース増加によるポイント: 1リソースごとに +0.1pt */
    fromResourceGain: (gain: number): number => gain * 0.1,

    /** DC乗っ取りによるポイント: 基本50pt + リソースボーナス */
    fromDataCenterCapture: (computePower: number): number => 50 + computePower * 0.1,

    /** ボットネット拡大によるポイント: 1M台ごとに +2pt */
    fromBotnetExpansion: (newBots: number): number => (newBots / 1_000_000) * 2,
};
