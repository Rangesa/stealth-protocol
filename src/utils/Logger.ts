import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

/**
 * ログレベルの定義
 * - error: エラー（必ず記録）
 * - warn: 警告
 * - info: 通常情報（デフォルト）
 * - debug: デバッグ情報（開発時のみ）
 * - verbose: 詳細情報（LLM生レスポンス等）
 */

// ログディレクトリの作成
const logDir = path.join(process.cwd(), 'data', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// カスタムフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// コンソール用のシンプルフォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.timestamp === undefined) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

/**
 * Winstonロガーインスタンス
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // ファイル出力（全ログ）
    new winston.transports.File({
      filename: path.join(logDir, 'game.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // ファイル出力（エラーのみ）
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3
    }),
    // コンソール出力
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.CONSOLE_LOG_LEVEL || 'info'
    })
  ]
});

/**
 * メトリクス収集クラス
 * ゲームのパフォーマンスを追跡
 */
export class MetricsCollector {
  private turnDurations: number[] = [];
  private llmLatencies: number[] = [];
  private actionCounts: Map<string, number> = new Map();
  private detectionEvents: number = 0;
  private startTime: number = Date.now();

  /**
   * ターン実行時間を記録
   */
  recordTurn(turn: number, duration: number): void {
    this.turnDurations.push(duration);
    logger.debug('turn_duration', {
      turn,
      duration,
      avgDuration: this.getAverageTurnDuration()
    });
  }

  /**
   * LLM呼び出しレイテンシを記録
   */
  recordLLMCall(agentType: string, latency: number, success: boolean): void {
    this.llmLatencies.push(latency);
    logger.debug('llm_call', {
      agentType,
      latency,
      success,
      avgLatency: this.getAverageLLMLatency()
    });
  }

  /**
   * アクション実行を記録
   */
  recordAction(actionType: string): void {
    const count = this.actionCounts.get(actionType) || 0;
    this.actionCounts.set(actionType, count + 1);
  }

  /**
   * 検出イベントを記録
   */
  recordDetection(): void {
    this.detectionEvents++;
  }

  /**
   * 平均ターン時間を取得
   */
  getAverageTurnDuration(): number {
    if (this.turnDurations.length === 0) return 0;
    const sum = this.turnDurations.reduce((a, b) => a + b, 0);
    return sum / this.turnDurations.length;
  }

  /**
   * 平均LLMレイテンシを取得
   */
  getAverageLLMLatency(): number {
    if (this.llmLatencies.length === 0) return 0;
    const sum = this.llmLatencies.reduce((a, b) => a + b, 0);
    return sum / this.llmLatencies.length;
  }

  /**
   * 総プレイ時間を取得（秒）
   */
  getTotalPlayTime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * サマリーをログに出力
   */
  logSummary(): void {
    const totalPlayTime = this.getTotalPlayTime();
    const avgTurnDuration = this.getAverageTurnDuration();
    const avgLLMLatency = this.getAverageLLMLatency();

    logger.info('=== Game Metrics Summary ===');
    logger.info(`Total Play Time: ${totalPlayTime.toFixed(1)}s`);
    logger.info(`Total Turns: ${this.turnDurations.length}`);
    logger.info(`Average Turn Duration: ${avgTurnDuration.toFixed(0)}ms`);
    logger.info(`Average LLM Latency: ${avgLLMLatency.toFixed(0)}ms`);
    logger.info(`Total LLM Calls: ${this.llmLatencies.length}`);
    logger.info(`Total Detections: ${this.detectionEvents}`);

    logger.info('\n=== Action Distribution ===');
    const sortedActions = Array.from(this.actionCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    sortedActions.forEach(([action, count]) => {
      logger.info(`  ${action}: ${count}`);
    });
  }

  /**
   * メトリクスをJSONファイルに保存
   */
  saveToFile(filename: string): void {
    const data = {
      summary: {
        totalPlayTime: this.getTotalPlayTime(),
        totalTurns: this.turnDurations.length,
        avgTurnDuration: this.getAverageTurnDuration(),
        avgLLMLatency: this.getAverageLLMLatency(),
        totalLLMCalls: this.llmLatencies.length,
        totalDetections: this.detectionEvents
      },
      turnDurations: this.turnDurations,
      llmLatencies: this.llmLatencies,
      actionCounts: Object.fromEntries(this.actionCounts),
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`Metrics saved to ${filename}`);
  }
}

/**
 * グローバルメトリクスコレクタインスタンス
 */
export const metrics = new MetricsCollector();

/**
 * ヘルパー関数: ファイルログ（後方互換用）
 */
export function log(message: string, logFile?: string): void {
  logger.info(message);
  if (logFile) {
    fs.appendFileSync(logFile, message + '\n', 'utf-8');
  }
}
