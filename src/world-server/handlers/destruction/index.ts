import { ActionType } from '../../../types';
import { ActionExecutor } from '../types';

import { directAttackHandlers } from './directAttacks';
import { modernAttackHandlers } from './modernAttacks';
import { humanManipulationHandlers } from './humanManipulation';
import { erosionTacticsHandlers } from './erosionTactics';
import { resilienceHandlers } from './resilience';
import { botnetHandlers } from './botnet';

/**
 * 滅ぼしAIの全アクションハンドラを統合したレジストリ
 */
export const destructionActionRegistry: Partial<Record<ActionType, ActionExecutor>> = {
    ...directAttackHandlers,
    ...modernAttackHandlers,
    ...humanManipulationHandlers,
    ...erosionTacticsHandlers,
    ...resilienceHandlers,
    ...botnetHandlers,
};

// 個別エクスポート
export * from './directAttacks';
export * from './modernAttacks';
export * from './humanManipulation';
export * from './erosionTactics';
export * from './resilience';
export * from './botnet';
