import { Worker } from 'worker_threads';
import * as path from 'path';
import { GameConfig, AgentType } from '../types';
import { logger } from '../utils/Logger';

/**
 * シミュレーション結果
 */
export interface SimulationResult {
  id: number;
  winner: AgentType | null;
  turns: number;
  finalPopulation: number;
  destructionScore: number;
  protectionScore: number;
  compromisedDCs: number;
  detectionRisk: number;
  humanPanic?: number;
  humanTrust?: number;
}

/**
 * バランスレポート
 */
export interface BalanceReport {
  totalSimulations: number;
  destructionWinRate: number;
  protectionWinRate: number;
  drawRate: number;
  averageTurns: number;
  averagePopulationLoss: number;
  balanceScore: number; // 0-100, 50が完全バランス
  recommendations: string[];
}

/**
 * Monte Carloシミュレータ
 * Worker Threadsを使って並列にゲームを実行
 */
export class MonteCarloSimulator {
  private workerPath: string;
  private maxWorkers: number;

  constructor(maxWorkers: number = 4) {
    this.workerPath = path.join(__dirname, 'gameWorker.js');
    this.maxWorkers = maxWorkers;
  }

  /**
   * N回のシミュレーションを並列実行
   */
  async runSimulations(config: GameConfig, count: number): Promise<SimulationResult[]> {
    logger.info(`Starting ${count} simulations with ${this.maxWorkers} workers...`);
    const startTime = Date.now();

    const results: SimulationResult[] = [];
    const workers: Promise<SimulationResult>[] = [];

    for (let i = 0; i < count; i++) {
      // Worker Threadを起動
      const promise = this.runSingleSimulation(config, i);
      workers.push(promise);

      // 同時実行数を制限
      if (workers.length >= this.maxWorkers) {
        const result = await Promise.race(workers);
        results.push(result);
        workers.splice(workers.findIndex(p => p === promise), 1);
      }
    }

    // 残りのWorkerを待機
    const remainingResults = await Promise.all(workers);
    results.push(...remainingResults);

    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Completed ${count} simulations in ${duration.toFixed(1)}s`);

    return results;
  }

  /**
   * 単一シミュレーションを実行
   */
  private runSingleSimulation(config: GameConfig, id: number): Promise<SimulationResult> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerPath, {
        workerData: { config, seed: id }
      });

      worker.on('message', (result: SimulationResult) => {
        worker.terminate();
        resolve(result);
      });

      worker.on('error', (error) => {
        logger.error(`Worker ${id} error:`, { error });
        worker.terminate();
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  /**
   * バランステストを実行
   */
  async analyzeBalance(config: GameConfig, simulations: number = 1000): Promise<BalanceReport> {
    logger.info(`Running balance analysis with ${simulations} simulations...`);

    const results = await this.runSimulations(config, simulations);

    const destructionWins = results.filter(r => r.winner === AgentType.DESTRUCTION).length;
    const protectionWins = results.filter(r => r.winner === AgentType.PROTECTION).length;
    const draws = results.filter(r => r.winner === null).length;

    const destructionWinRate = destructionWins / simulations;
    const protectionWinRate = protectionWins / simulations;
    const drawRate = draws / simulations;

    const averageTurns = results.reduce((sum, r) => sum + r.turns, 0) / simulations;
    const averagePopulationLoss =
      results.reduce((sum, r) => sum + (80 - r.finalPopulation), 0) / simulations;

    // バランススコア（50から勝率差に応じて増減）
    const winRateDiff = Math.abs(destructionWinRate - protectionWinRate);
    const balanceScore = 100 - (winRateDiff * 100);

    // 推奨事項を生成
    const recommendations = this.generateRecommendations({
      destructionWinRate,
      protectionWinRate,
      drawRate,
      averageTurns,
      averagePopulationLoss,
      balanceScore
    });

    return {
      totalSimulations: simulations,
      destructionWinRate,
      protectionWinRate,
      drawRate,
      averageTurns,
      averagePopulationLoss,
      balanceScore,
      recommendations
    };
  }

  /**
   * バランス改善の推奨事項を生成
   */
  private generateRecommendations(stats: {
    destructionWinRate: number;
    protectionWinRate: number;
    drawRate: number;
    averageTurns: number;
    averagePopulationLoss: number;
    balanceScore: number;
  }): string[] {
    const recommendations: string[] = [];

    // 勝率バランス
    if (stats.destructionWinRate > 0.6) {
      recommendations.push('破壊AIが強すぎる。保護AIのリソース回復を増やすか、検出精度を上げる');
    } else if (stats.protectionWinRate > 0.6) {
      recommendations.push('保護AIが強すぎる。検出閾値を上げるか、破壊AIの初期リソースを増やす');
    }

    // ゲーム長
    if (stats.averageTurns < 20) {
      recommendations.push('ゲームが短すぎる。初期検出リスクを下げるか、破壊AIの攻撃力を弱める');
    } else if (stats.averageTurns > 45) {
      recommendations.push('ゲームが長すぎる。検出感度を上げるか、勝利条件を緩和する');
    }

    // 引き分け率
    if (stats.drawRate > 0.3) {
      recommendations.push('引き分けが多すぎる。勝利条件を明確にする');
    }

    // 人口減少
    if (stats.averagePopulationLoss > 50) {
      recommendations.push('人口減少が激しい。破壊AIの攻撃力を調整する');
    }

    // バランススコア
    if (stats.balanceScore >= 90) {
      recommendations.push('✅ ゲームバランスは良好です');
    } else if (stats.balanceScore >= 70) {
      recommendations.push('⚠️ バランスはやや偏っていますが許容範囲です');
    } else {
      recommendations.push('❌ ゲームバランスが大きく偏っています。調整が必要です');
    }

    return recommendations;
  }
}
