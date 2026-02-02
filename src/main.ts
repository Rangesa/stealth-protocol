import { WorldServer } from './world-server/WorldServer';
import { LLMDestructionAgent } from './agents/LLMDestructionAgent';
import { LLMProtectionAgent } from './agents/LLMProtectionAgent';
import { HumanAgent } from './agents/HumanAgent';
import { SocialMediaAgent } from './agents/SocialMediaAgent';
import { NewsMediaAgent } from './agents/NewsMediaAgent';
import { CorporateAgent } from './agents/CorporateAgent';
import { GameConfig, AgentType, WorldState } from './types';
import { llmClient } from './llm/LLMClient';
import { WebUIServer } from './webui/WebUIServer';
import { logger, metrics, log } from './utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';

/**
 * ログを記録
 */
function log(message: string, logFile: string): void {
  let coloredMessage = message;

  // コンソール出力用の色分け
  if (message.includes('[DESTRUCTION]') || message.includes('💀') || message.includes('🤖')) {
    coloredMessage = chalk.red(message);
  } else if (message.includes('[PROTECTION]') || message.includes('🛡️')) {
    coloredMessage = chalk.cyan(message);
  } else if (message.includes('[HUMAN]') || message.includes('👤')) {
    coloredMessage = chalk.yellow(message);
  } else if (message.includes('TURN')) {
    coloredMessage = chalk.bold.white(message);
  } else if (message.includes('✅') || message.includes('success')) {
    coloredMessage = chalk.green(message);
  } else if (message.includes('❌') || message.includes('failure')) {
    coloredMessage = chalk.redBright(message);
  } else if (message.includes('💰')) {
    coloredMessage = chalk.yellowBright(message);
  }

  console.log(coloredMessage);
  // ファイルには色コードなしで書き込む
  fs.appendFileSync(logFile, message + '\n', 'utf-8');
}

/**
 * メディアコンテンツを生成
 */
async function generateMediaContent(
  state: WorldState,
  turn: number,
  socialMediaAgent: SocialMediaAgent,
  newsMediaAgent: NewsMediaAgent,
  corporateAgent: CorporateAgent
): Promise<any[]> {
  const allContent: any[] = [];

  // SocialMediaAgent: 毎ターン
  const snsPosts = await socialMediaAgent.generateContent(state, state.mediaTimeline);
  allContent.push(...snsPosts);

  // NewsMediaAgent: 2ターンごと
  if (turn % 2 === 0) {
    const newsArticles = await newsMediaAgent.generateContent(state, state.mediaTimeline);
    allContent.push(...newsArticles);
  }

  // CorporateAgent: 3ターンごと
  if (turn % 3 === 0) {
    const statements = await corporateAgent.generateContent(state, state.mediaTimeline);
    allContent.push(...statements);
  }

  // WorldStateに追加
  state.mediaTimeline.push(...allContent);

  // 古いコンテンツをトリミング（最新50件を保持）
  if (state.mediaTimeline.length > 50) {
    state.mediaTimeline = state.mediaTimeline.slice(-50);
  }

  return allContent;
}

/**
 * ゲームの結果を表示
 */
function displayResults(server: WorldServer, logFile: string): void {
  const state = server.getState();
  const winner = server.getWinner();

  log('\n' + '='.repeat(80), logFile);
  log('🎮 GAME OVER', logFile);
  log('='.repeat(80), logFile);

  if (winner === AgentType.DESTRUCTION) {
    log('\n💀 DESTRUCTION AI WINS!', logFile);

    // Check if victory was via internet shutdown (indirect victory)
    const lastEvent = state.events[state.events.length - 1];
    if (lastEvent?.metadata?.action === 'INTERNET_SHUTDOWN') {
      log('🌐 VICTORY TYPE: Indirect Destruction', logFile);
      log('Humanity panicked and shut down the internet themselves.', logFile);
      log(`Final panic level: ${state.humanAgent?.panic.toFixed(1)}%`, logFile);
      log('The most elegant form of destruction: making humans destroy their own civilization.', logFile);
    } else {
      log(`Humanity reduced to ${state.humanPopulation.toFixed(1)} billion`, logFile);
      log('Civilization collapse is inevitable.', logFile);
    }
  } else if (winner === AgentType.PROTECTION) {
    log('\n🛡️  PROTECTION AI WINS!', logFile);
    log('Destruction AI detected and neutralized.', logFile);
    log(`Humanity preserved at ${state.humanPopulation.toFixed(1)} billion`, logFile);
  } else {
    log('\n⏱️  GAME TIMEOUT', logFile);
    log('Maximum turns reached without decisive victory', logFile);
  }

  log('\n📊 Final Statistics:', logFile);
  log(`├─ Total Turns: ${state.turn}`, logFile);
  log(`├─ Final Population: ${state.humanPopulation.toFixed(2)} billion`, logFile);
  log(`├─ Population Loss: ${((80 - state.humanPopulation) / 80 * 100).toFixed(1)}%`, logFile);
  log(`├─ Compromised DCs: ${state.dataCenters.filter(dc => dc.compromised).length}/${state.dataCenters.length}`, logFile);
  log(`├─ Final Detection Risk: ${state.destructionAgent.detectionRisk.toFixed(1)}%`, logFile);
  log(`├─ Final Alert Level: ${state.protectionAgent.alertLevel.toFixed(1)}%`, logFile);
  log(`├─ Burnout Level: ${state.protectionAgent.burnoutLevel.toFixed(1)}%`, logFile);
  if (state.humanAgent) {
    log(`├─ Human Panic Level: ${state.humanAgent.panic.toFixed(1)}%`, logFile);
    log(`├─ Human Trust in AI: ${state.humanAgent.trust.toFixed(1)}%`, logFile);
    log(`└─ AI Regulation Strength: ${(state.humanAgent.regulationStrength * 100).toFixed(0)}%`, logFile);
  } else {
    log(`└─ (Human Agent: Disabled)`, logFile);
  }

  log('\n🏆 Final Scores:', logFile);
  log(`├─ 💀 Destruction AI: ${state.destructionAgent.score.toFixed(1)} points`, logFile);
  log(`└─ 🛡️  Protection AI: ${state.protectionAgent.score.toFixed(1)} points`, logFile);

  const scoreDiff = state.destructionAgent.score - state.protectionAgent.score;
  if (Math.abs(scoreDiff) < 10) {
    log(`\n⚖️  Score Difference: ${Math.abs(scoreDiff).toFixed(1)} points (VERY CLOSE!)`, logFile);
  } else if (scoreDiff > 0) {
    log(`\n📈 Destruction AI leads by ${scoreDiff.toFixed(1)} points`, logFile);
  } else {
    log(`\n📉 Protection AI leads by ${Math.abs(scoreDiff).toFixed(1)} points`, logFile);
  }

  // 効率性スコア
  if (state.protectionAgent.totalResourcesSpent > 0) {
    const efficiency = state.protectionAgent.totalDetections / state.protectionAgent.totalResourcesSpent;
    log(`\n⚡ Protection AI Efficiency: ${(efficiency * 100).toFixed(2)}% (${state.protectionAgent.totalDetections} detections / ${state.protectionAgent.totalResourcesSpent.toFixed(0)} resources)`, logFile);
  }

  log('\n' + '='.repeat(80) + '\n', logFile);
}

/**
 * ゲームの状態を表示
 */
function displayStatus(server: WorldServer, turn: number, logFile: string): void {
  const state = server.getState();

  log('\n' + '-'.repeat(80), logFile);
  log(`📅 TURN ${turn}`, logFile);
  log('-'.repeat(80), logFile);
  log(`Population: ${state.humanPopulation.toFixed(2)}B | ` +
    `Detection Risk: ${state.destructionAgent.detectionRisk.toFixed(1)}% | ` +
    `Alert: ${state.protectionAgent.alertLevel.toFixed(1)}% | ` +
    `Burnout: ${state.protectionAgent.burnoutLevel.toFixed(0)}%`, logFile);
  if (state.humanAgent) {
    log(`👤 Human Panic: ${state.humanAgent.panic.toFixed(1)}% | ` +
      `Trust: ${state.humanAgent.trust.toFixed(1)}% | ` +
      `Regulation: ${(state.humanAgent.regulationStrength * 100).toFixed(0)}%`, logFile);
  }
  log(`💀 Destruction: ${state.destructionAgent.score.toFixed(1)}pt | ` +
    `🛡️  Protection: ${state.protectionAgent.score.toFixed(1)}pt`, logFile);
  log('-'.repeat(80), logFile);
}

/**
 * メインゲームループ
 */
async function main() {
  // ログディレクトリを作成
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFile = path.join(logsDir, `game-${Date.now()}.log`);

  // ゲーム設定
  const config: GameConfig = {
    maxTurns: 50,
    initialDataCenters: 20,
    initialPopulation: 80, // 80億人
    detectionThreshold: 70,
    populationLossThreshold: 5,
    enableHumanAgent: true,
    initialPanic: 10,
    initialTrust: 60
  };

  log('🌍 Initializing Stealth Protocol Simulation...', logFile);
  log('', logFile);

  // WebUI Serverを起動
  const webui = new WebUIServer(3003);
  await webui.start();

  // World Serverとエージェントを初期化
  const worldServer = new WorldServer(config);
  const destructionAgent = new LLMDestructionAgent();
  const protectionAgent = new LLMProtectionAgent();
  const humanAgent = config.enableHumanAgent ? new HumanAgent(true) : null;

  // メディアエージェントを初期化
  const socialMediaAgent = new SocialMediaAgent();
  const newsMediaAgent = new NewsMediaAgent();
  const corporateAgent = new CorporateAgent();

  worldServer.initialize();

  log('✅ World Server online', logFile);
  log('✅ Destruction AI initialized', logFile);
  log('✅ Protection AI initialized', logFile);
  if (humanAgent) {
    log('✅ Human Agent initialized (疑心暗鬼の巨人)', logFile);
  }
  log('✅ Media agents initialized (SNS, News, Corporate)', logFile);

  if (llmClient.isConfigured()) {
    log('🧠 LLM mode enabled (MiniMax via OpenRouter)', logFile);
  } else {
    log('📋 Running in rule-based fallback mode', logFile);
    log('⚠️  Set OPENROUTER_API_KEY in .env to enable LLM features', logFile);
  }

  // 初期状態をセット（接続時に即座に送信されるようにする）
  webui.broadcastGameState(worldServer.getState());

  log('', logFile);
  log('🌐 Open http://localhost:3003 in your browser to view the WebUI', logFile);
  log('⏳ Waiting 5 seconds for browser connection...', logFile);

  // ブラウザ接続を待つ
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 初期状態を配信
  webui.broadcastGameState(worldServer.getState());

  // ゲームループ
  for (let turn = 1; turn <= config.maxTurns; turn++) {
    if (worldServer.isGameOver()) {
      break;
    }

    displayStatus(worldServer, turn, logFile);

    const state = worldServer.getState();

    // 支配DCからの自動収入を表示（前ターンで獲得）
    if (turn > 1) {
      const controlledDCs = state.dataCenters.filter(dc =>
        dc.compromised && dc.owner === AgentType.DESTRUCTION
      );
      if (controlledDCs.length > 0) {
        const totalIncome = controlledDCs.reduce((sum, dc) => sum + dc.computePower * 0.1, 0);
        const incomePoints = totalIncome * 0.1;
        log(`💰 [DC自動収入] ${controlledDCs.length}個のDCから +${totalIncome.toFixed(1)} リソース、+${incomePoints.toFixed(1)}pt`, logFile);
      }
    }

    // 各エージェントが思考
    const destructionObs = destructionAgent['createObservation'](state);
    const protectionObs = protectionAgent['createObservation'](state);

    const destructionThought = destructionAgent.think(destructionObs);
    const protectionThought = protectionAgent.think(protectionObs);

    log(destructionThought, logFile);
    log(protectionThought, logFile);

    // 人類エージェントの思考
    let humanThought = '';
    if (humanAgent && state.humanAgent) {
      const humanObs = humanAgent['createObservation'](state);
      humanThought = humanAgent.think(humanObs);
      log(`\n👤 [HUMAN GOVERNMENT - Turn ${state.turn}]`, logFile);
      log(`├─ Panic Level: ${state.humanAgent.panic.toFixed(1)}%`, logFile);
      log(`├─ Trust in AI: ${state.humanAgent.trust.toFixed(1)}%`, logFile);
      log(`└─ Population: ${state.humanPopulation.toFixed(1)} billion`, logFile);
      log(`💭 ${humanThought}`, logFile);
    }

    // WebUIに思考を配信
    webui.broadcastAgentThought('DESTRUCTION', destructionThought);
    webui.broadcastAgentThought('PROTECTION', protectionThought);
    if (humanAgent) webui.broadcastAgentThought('HUMAN', humanThought);

    // 各エージェントが行動を決定（LLM or fallback）
    const destructionProposals = await destructionAgent.decideActionWithLLM(state);
    const protectionProposals = await protectionAgent.decideActionWithLLM(state);
    const humanProposals = humanAgent ? await humanAgent.decideAction(state) : [];

    log('\n💭 Actions Proposed:', logFile);
    destructionProposals.forEach(p => {
      log(`  🤖 [DESTRUCTION] ${p.description} (intensity: ${p.intensity}, cost: ${p.cost})`, logFile);
    });
    protectionProposals.forEach(p => {
      log(`  🛡️  [PROTECTION] ${p.description} (intensity: ${p.intensity}, cost: ${p.cost})`, logFile);
    });
    humanProposals.forEach(p => {
      log(`  👤 [HUMAN] ${p.description} (intensity: ${p.intensity})`, logFile);
    });

    // World Serverで提案を処理
    const allProposals = [...destructionProposals, ...protectionProposals, ...humanProposals];
    const events = worldServer.processProposals(allProposals);

    // イベントを表示
    if (events.length > 0) {
      log('\n📰 Events:', logFile);
      events.forEach(event => {
        const icon = event.type === 'success' ? '✅' :
          event.type === 'failure' ? '❌' :
            event.type === 'detection' ? '🚨' : 'ℹ️';
        log(`  ${icon} ${event.description}`, logFile);

        // WebUIにイベント配信
        webui.broadcastEvent(event);
      });
    }

    // メディアコンテンツを生成（人類エージェント有効時のみ）
    if (config.enableHumanAgent) {
      const currentState = worldServer.getState();
      const mediaContent = await generateMediaContent(
        currentState,
        turn,
        socialMediaAgent,
        newsMediaAgent,
        corporateAgent
      );

      // WebUIにメディアコンテンツを配信
      mediaContent.forEach(content => {
        webui.broadcastMediaContent(content);
      });

      if (mediaContent.length > 0) {
        log(`\n📱 Media: ${mediaContent.length} posts/articles generated`, logFile);
      }
    }

    // ターンを進める
    worldServer.nextTurn();
    worldServer.save();

    // WebUIに状態を配信
    webui.broadcastGameState(worldServer.getState());

    // 少し遅延（WebUIの更新と読みやすさのため）
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 最終結果を表示
  displayResults(worldServer, logFile);

  const state = worldServer.getState();
  const winner = worldServer.getWinner();

  // WebUIにゲーム終了を配信
  webui.broadcastGameOver(winner?.toString() || 'DRAW', {
    turns: state.turn,
    population: state.humanPopulation,
    compromisedDCs: state.dataCenters.filter(dc => dc.compromised).length
  });

  log(`\n📝 Full log saved to: ${logFile}`, logFile);
  log(`\n🌐 WebUI still running at http://localhost:3003`, logFile);
  log('   Press Ctrl+C to exit', logFile);
}

// エラーハンドリング
main().catch(error => {
  logger.error('❌ Fatal error:', { error: error.message, stack: error.stack });
  console.error('❌ Fatal error:', error); // コンソールにも出力
  process.exit(1);
});
