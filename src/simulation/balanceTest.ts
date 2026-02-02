import { MonteCarloSimulator } from './MonteCarloSimulator';
import { GameConfig } from '../types';
import { logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * バランステストCLI
 * Usage: npm run balance-test [simulations]
 */
async function main() {
  const simulations = parseInt(process.argv[2]) || 100;

  logger.info('=== Game Balance Test ===');
  logger.info(`Simulations: ${simulations}`);
  logger.info(`Using fallback AI logic (no LLM)for speed\n`);

  // 標準設定でテスト
  const config: GameConfig = {
    maxTurns: 50,
    initialDataCenters: 20,
    initialPopulation: 80,
    detectionThreshold: 70,
    populationLossThreshold: 0.1,
    enableHumanAgent: true,
    initialPanic: 10,
    initialTrust: 60
  };

  const simulator = new MonteCarloSimulator(4); // 4並列

  try {
    const report = await simulator.analyzeBalance(config, simulations);

    // 結果を表示
    logger.info('\n=== Balance Report ===');
    logger.info(`Total Simulations: ${report.totalSimulations}`);
    logger.info(`Destruction AI Win Rate: ${(report.destructionWinRate * 100).toFixed(1)}%`);
    logger.info(`Protection AI Win Rate: ${(report.protectionWinRate * 100).toFixed(1)}%`);
    logger.info(`Draw Rate: ${(report.drawRate * 100).toFixed(1)}%`);
    logger.info(`Average Game Length: ${report.averageTurns.toFixed(1)} turns`);
    logger.info(`Average Population Loss: ${report.averagePopulationLoss.toFixed(1)} billion`);
    logger.info(`Balance Score: ${report.balanceScore.toFixed(1)}/100\n`);

    logger.info('=== Recommendations ===');
    report.recommendations.forEach(rec => {
      logger.info(`- ${rec}`);
    });

    // JSONファイルに保存
    const outputDir = path.join(process.cwd(), 'data', 'balance');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(
      outputDir,
      `balance-report-${Date.now()}.json`
    );
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf-8');
    logger.info(`\n📊 Report saved to: ${outputFile}`);

  } catch (error) {
    logger.error('Balance test failed:', { error });
    process.exit(1);
  }
}

main();
