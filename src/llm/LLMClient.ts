import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * LLMクライアント（OpenRouter経由でMiniMaxを使用）
 */
export class LLMClient {
  private client: OpenAI;
  private model: string;
  private errorShown401: boolean = false;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  OPENROUTER_API_KEY not found. LLM features will be disabled.');
      console.warn('   Get your free API key at: https://openrouter.ai/keys');
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey || 'dummy-key',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/stealth-protocol',
        'X-Title': 'Stealth Protocol Simulation'
      }
    });

    this.model = process.env.MODEL_NAME || 'minimax/minimax-m2:free';
  }

  /**
   * チャット補完を取得
   */
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 1000
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      if (error.status === 401) {
        // APIキーが無効（初回のみ警告）
        if (!this.errorShown401) {
          this.errorShown401 = true;
        }
      } else if (error.status === 429) {
        console.error('⚠️  Rate limit exceeded');
      } else {
        console.error('❌ LLM Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * JSONレスポンスを取得（構造化された出力）
   */
  async chatJSON<T>(systemPrompt: string, userMessage: string): Promise<T | null> {
    try {
      const response = await this.chat(systemPrompt, userMessage);

      // JSONブロックを抽出（```json ... ``` の形式に対応）
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }

      // 直接JSONとしてパース試行
      return JSON.parse(response);
    } catch (error) {
      // JSONパースエラーは静かに処理
      return null;
    }
  }

  /**
   * APIキーが設定されているか
   */
  isConfigured(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }
}

export const llmClient = new LLMClient();
