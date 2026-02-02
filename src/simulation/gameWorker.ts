import { parentPort, workerData } from 'worker_threads';
import { WorldServer } from '../world-server/WorldServer';
import { LLMDestructionAgent } from '../agents/LLMDestructionAgent';
import { LLMProtectionAgent } from '../agents/LLMProtectionAgent';
import { GameConfig, AgentType } from '../types';
import { SimulationResult } from './MonteCarloSimulator';

/**
 * Worker Thread用のゲーム実行
 * LLMを使わず、fallback logicのみで高速実行
 */
async function runGame(config: GameConfig, seed: number): Promise<SimulationResult> {
  // LLMなしのエージェント（fallbackのみ）
  const destructionAgent = new LLMDestructionAgent();
  const protectionAgent = new LLMProtectionAgent();

  const worldServer = new WorldServer(config);

  // ゲームループ
  for (let turn = 1; turn <= config.maxTurns; turn++) {
    if (worldServer.isGameOver()) {
      break;
    }

    const state = worldServer.getState();

    // 各エージェントが行動決定（fallbackのみ）
    const destructionProposals = await destructionAgent.decideAction(state);
    const protectionProposals = await protectionAgent.decideAction(state);

    const allProposals = [...destructionProposals, ...protectionProposals];

    // 提案を処理
    await worldServer.processProposals(allProposals);

    // ターンを進める
    worldServer.nextTurn();
  }

  // 結果を収集
  const finalState = worldServer.getState();
  const winner = worldServer.getWinner();

  return {
    id: seed,
    winner,
    turns: finalState.turn,
    finalPopulation: finalState.humanPopulation,
    destructionScore: finalState.destructionAgent.score,
    protectionScore: finalState.protectionAgent.score,
    compromisedDCs: finalState.dataCenters.filter(dc => dc.compromised).length,
    detectionRisk: finalState.destructionAgent.detectionRisk,
    humanPanic: finalState.humanAgent?.panic,
    humanTrust: finalState.humanAgent?.trust
  };
}

// Worker実行
if (parentPort) {
  const { config, seed } = workerData;

  runGame(config, seed)
    .then(result => {
      parentPort!.postMessage(result);
    })
    .catch(error => {
      console.error('Worker error:', error);
      process.exit(1);
    });
}
