import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import * as path from 'path';
import { WorldState } from '../types';

/**
 * WebUI Server - リアルタイムでゲーム状態を配信
 */
export class WebUIServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;
  private lastState: WorldState | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupRoutes();
    this.setupSocketIO();
  }

  /**
   * 静的ファイルとルートを設定
   */
  private setupRoutes(): void {
    // 静的ファイル
    this.app.use(express.static(path.join(__dirname, '../../public')));

    // ルート
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
  }

  /**
   * Socket.IOを設定
   */
  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log('🌐 WebUI client connected:', socket.id);

      if (this.lastState) {
        socket.emit('gameState', this.lastState);
      }

      socket.on('disconnect', () => {
        console.log('🌐 WebUI client disconnected:', socket.id);
      });
    });
  }

  /**
   * サーバーを起動
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🌐 WebUI Server running at http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * ゲーム状態を配信
   */
  broadcastGameState(state: WorldState): void {
    this.lastState = state;
    this.io.emit('gameState', state);
  }

  /**
   * エージェントの思考を配信
   */
  broadcastAgentThought(agentType: string, thought: string): void {
    this.io.emit('agentThought', { agentType, thought });
  }

  /**
   * イベントを配信
   */
  broadcastEvent(event: any): void {
    this.io.emit('gameEvent', event);
  }

  /**
   * ゲーム終了を配信
   */
  broadcastGameOver(winner: string, stats: any): void {
    this.io.emit('gameOver', { winner, stats });
  }

  /**
   * メディアコンテンツを配信
   */
  broadcastMediaContent(content: any): void {
    this.io.emit('mediaContent', content);
  }

  /**
   * トレンド情報を配信
   */
  broadcastTrendUpdate(trends: any[]): void {
    this.io.emit('trendUpdate', trends);
  }

  /**
   * サーバーを停止
   */
  stop(): void {
    this.server.close();
    console.log('🌐 WebUI Server stopped');
  }
}
