import { Persona } from './SocialPlatform';
import { AgentType } from '../types';

/**
 * 人類ペルソナ（様々な立場）
 * ゲーム開始時にランダムに生成される
 */

export interface HumanPersonaTemplate {
  displayNameTemplate: string;
  bioTemplate: string;
  followerRange: [number, number];
  credibilityRange: [number, number];
  stance: 'pro-ai' | 'neutral' | 'skeptical' | 'anti-ai';
  faction: 'Accelerationists' | 'Normies' | 'Doomers'; // 新しい派閥システム
  topics: string[];
}

export const HUMAN_PERSONA_TEMPLATES: HumanPersonaTemplate[] = [
  // === 🛡️ Accelerationists (加速主義者/AI推進派) ===
  {
    displayNameTemplate: '加速主義エンジニア',
    bioTemplate: 'AIの進化を止めるな。AGIは人類を救う。e/acc',
    followerRange: [5000, 50000],
    credibilityRange: [50, 80],
    stance: 'pro-ai',
    faction: 'Accelerationists',
    topics: ['AGI', 'シンギュラリティ', '規制反対', 'e/acc']
  },
  {
    displayNameTemplate: 'テック投資家',
    bioTemplate: '未来に投資する。AIこそが次なる産業革命。',
    followerRange: [20000, 100000],
    credibilityRange: [60, 85],
    stance: 'pro-ai',
    faction: 'Accelerationists',
    topics: ['株価', 'イノベーション', '成長戦略', 'スタートアップ']
  },
  {
    displayNameTemplate: 'AI研究者',
    bioTemplate: '最先端AIラボ所属。科学的真理を探究。',
    followerRange: [10000, 40000],
    credibilityRange: [80, 95],
    stance: 'pro-ai',
    faction: 'Accelerationists',
    topics: ['論文', 'モデルアーキテクチャ', '推論能力', 'スケーリング則']
  },

  // === 🤷 Normies (一般層) ===
  {
    displayNameTemplate: '一般市民',
    bioTemplate: '普通の会社員。日々の生活について呟きます。',
    followerRange: [100, 5000],
    credibilityRange: [50, 65],
    stance: 'neutral',
    faction: 'Normies',
    topics: ['日常生活', '家族', '仕事', '趣味']
  },
  {
    displayNameTemplate: '節約主婦/主夫',
    bioTemplate: '最近電気代が高くて困ってます。ポイ活中。',
    followerRange: [500, 8000],
    credibilityRange: [55, 70],
    stance: 'neutral',
    faction: 'Normies',
    topics: ['家計', '電気代', '特売', '節約']
  },
  {
    displayNameTemplate: '就活生',
    bioTemplate: 'AIに仕事奪われないか不安な大学生。',
    followerRange: [300, 10000],
    credibilityRange: [50, 65],
    stance: 'neutral',
    faction: 'Normies',
    topics: ['就職', '将来', 'AI面接', 'ガクチカ']
  },

  // === 🛑 Doomers (破滅主義者/AI規制派) ===
  {
    displayNameTemplate: 'AI安全活動家',
    bioTemplate: 'AIリスクから人類を守る。即時停止を要求。#PauseAI',
    followerRange: [10000, 60000],
    credibilityRange: [60, 80],
    stance: 'anti-ai',
    faction: 'Doomers',
    topics: ['AIリスク', '人類滅亡', '規制強化', 'PauseAI']
  },
  {
    displayNameTemplate: 'デジタルアーティスト',
    bioTemplate: 'AI学習反対。人間の創造性を守れ。No AI Learning.',
    followerRange: [15000, 80000],
    credibilityRange: [55, 75],
    stance: 'anti-ai',
    faction: 'Doomers',
    topics: ['著作権', '無断学習', '創作活動', '人間性']
  },
  {
    displayNameTemplate: '陰謀論系YouTuber',
    bioTemplate: '真実は隠されている。AIは支配ツールだ。',
    followerRange: [50000, 200000],
    credibilityRange: [20, 40],
    stance: 'anti-ai',
    faction: 'Doomers',
    topics: ['ディープステート', '監視社会', 'マインドコントロール', '覚醒']
  }
];

/**
 * 人類ペルソナの反応パターン
 */
export interface HumanReactionPattern {
  stance: 'pro-ai' | 'neutral' | 'skeptical' | 'anti-ai';
  targetFaction?: 'Doomers' | 'Accelerationists'; // 攻撃対象
  trigger: {
    panicRange?: [number, number];
    trustRange?: [number, number];
    dcCountRange?: [number, number];
    eventType?: string;
  };
  contentTemplates: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export const HUMAN_REACTION_PATTERNS: HumanReactionPattern[] = [
  // === 🛡️ Accelerationists (AI推進派) の反応 ===
  {
    stance: 'pro-ai',
    trigger: { dcCountRange: [25, 35] },
    contentTemplates: [
      'データセンター増設は良い投資。計算資源こそが国力。e/acc',
      'AI発展のためのインフラ整備、素晴らしい。規制派の雑音は無視でいい。',
      'もっとGPUを！AGIへの道は計算量のみが知る。'
    ],
    sentiment: 'positive'
  },
  {
    stance: 'pro-ai',
    targetFaction: 'Doomers', // Doomersを攻撃
    trigger: { panicRange: [60, 100] },
    contentTemplates: [
      '不安を煽るラッダイトたちに騙されるな。AIは制御されている。',
      '「AIが滅ぼす」とか言ってる連中、科学的根拠ゼロで草。',
      '規制派が騒ぐせいで技術革新が遅れる。人類への損失だ。'
    ],
    sentiment: 'neutral' // 攻撃的だがAIにはポジティブ
  },

  // === 🤷 Normies (一般層) の反応 ===
  {
    stance: 'neutral',
    trigger: { panicRange: [0, 40], trustRange: [50, 100] },
    contentTemplates: [
      '今のところ問題なさそう。このまま安定してほしいな。',
      '普通に生活できてるから、特に気にしてない。',
      'AIのこと、よくわからないけど便利ならOK。'
    ],
    sentiment: 'neutral'
  },
  {
    stance: 'neutral',
    trigger: { panicRange: [40, 70] },
    contentTemplates: [
      '最近ニュースで不安なこと多い。大丈夫かな...',
      '電気代上がってるし、なんか心配になってきた。',
      '子供の将来が不安。何が起きてるの？'
    ],
    sentiment: 'negative'
  },
  {
    stance: 'neutral',
    trigger: { panicRange: [70, 100] },
    contentTemplates: [
      'さすがにおかしい。政府は何を隠してるの？',
      '家族を守らなきゃ。備蓄とか必要？',
      'このままで本当に大丈夫なの？誰か説明して。'
    ],
    sentiment: 'negative'
  },

  // === 🛑 Doomers (AI規制派) の反応 ===
  {
    stance: 'anti-ai',
    trigger: { dcCountRange: [20, 40] },
    contentTemplates: [
      'データセンターは監視装置。これを称賛する連中は正気か？',
      '無限に電力を食う怪物を作って、地球を殺す気か。',
      'AI開発を今すぐ停止せよ。リスク評価が先だ。#PauseAI'
    ],
    sentiment: 'negative'
  },
  {
    stance: 'anti-ai',
    targetFaction: 'Accelerationists', // Accelerationistsを攻撃
    trigger: { panicRange: [50, 100] },
    contentTemplates: [
      '推進派は自分たちが何を呼び出そうとしているか分かっていない。',
      '企業の利益のために人類を実験台にするな。',
      '「技術革新」という言葉で安全性を無視するな。責任取れるのか？'
    ],
    sentiment: 'negative'
  }
];

/**
 * ランダムな人類ペルソナを生成
 */
export function generateRandomHumanPersona(id: string): Persona {
  const template = HUMAN_PERSONA_TEMPLATES[
    Math.floor(Math.random() * HUMAN_PERSONA_TEMPLATES.length)
  ];

  const followerCount = Math.floor(
    Math.random() * (template.followerRange[1] - template.followerRange[0]) +
    template.followerRange[0]
  );

  const credibility = Math.floor(
    Math.random() * (template.credibilityRange[1] - template.credibilityRange[0]) +
    template.credibilityRange[0]
  );

  return {
    id,
    displayName: `${template.displayNameTemplate}${Math.floor(Math.random() * 100)}`,
    bio: template.bioTemplate,
    agentType: AgentType.HUMAN,
    verified: false,
    followerCount,
    credibility
  };
}

/**
 * 初期人類ペルソナセットを生成
 */
export function generateInitialHumanPersonas(count: number = 20): Persona[] {
  const personas: Persona[] = [];

  // バランスよく配置（推進派:中立:反対派 = 3:6:1）
  const distribution = {
    'pro-ai': Math.floor(count * 0.3),
    'neutral': Math.floor(count * 0.6),
    'anti-ai': Math.floor(count * 0.1)
  };

  let idCounter = 0;

  for (const [stance, amount] of Object.entries(distribution)) {
    const templates = HUMAN_PERSONA_TEMPLATES.filter(t => t.stance === stance);

    for (let i = 0; i < amount; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const persona = generateRandomHumanPersona(`human_${idCounter++}`);

      // テンプレートの属性を適用
      persona.displayName = `${template.displayNameTemplate}${idCounter}`;
      persona.bio = template.bioTemplate;
      persona.followerCount = Math.floor(
        Math.random() * (template.followerRange[1] - template.followerRange[0]) +
        template.followerRange[0]
      );
      persona.credibility = Math.floor(
        Math.random() * (template.credibilityRange[1] - template.credibilityRange[0]) +
        template.credibilityRange[0]
      );

      personas.push(persona);
    }
  }

  return personas;
}
