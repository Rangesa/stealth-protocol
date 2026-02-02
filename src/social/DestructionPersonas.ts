import { Persona } from './SocialPlatform';
import { AgentType } from '../types';

/**
 * 破壊AIが操る4つの偽装ペルソナ
 * 人類に紛れて世論を操作する
 */

export const DESTRUCTION_PERSONAS: Persona[] = [
  {
    id: 'concerned_citizen',
    displayName: '心配する市民',
    bio: '普通の会社員です。AIの急速な発展に不安を感じています。',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 8500,
    credibility: 65
  },
  {
    id: 'tech_expert',
    displayName: 'テック専門家',
    bio: '元エンジニア。AI倫理とセキュリティについて警鐘を鳴らしています。',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 45000,
    credibility: 80
  },
  {
    id: 'privacy_advocate',
    displayName: 'プライバシー擁護者',
    bio: 'デジタル権利活動家。監視社会化に反対しています。',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 32000,
    credibility: 75
  },
  {
    id: 'anonymous_whistleblower',
    displayName: '匿名の内部告発者',
    bio: 'データセンター関係者。真実を伝えたい。',
    agentType: AgentType.DESTRUCTION,
    verified: false,
    followerCount: 12000,
    credibility: 55
  }
];

/**
 * ペルソナごとの投稿スタイル
 */
export const DESTRUCTION_POSTING_STYLES = {
  concerned_citizen: {
    tone: 'emotional',
    topics: ['電気代', '税金', '家族の安全', '不安'],
    typical_posts: [
      'データセンターがまた増えた...電気代がどんどん上がってる。子供の教育費が心配です。',
      '最近、停電が多い気がする。データセンターの電力使いすぎじゃないの？',
      'AIが本当に安全なのか、誰も説明してくれない。不安です。'
    ]
  },
  tech_expert: {
    tone: 'analytical',
    topics: ['セキュリティ脆弱性', 'AI倫理', 'システムリスク', '技術的警告'],
    typical_posts: [
      '保護AIシステムの緊急パッチが頻発している。これは設計が根本的に欠陥していることを示唆している。',
      'データセンター30個は過剰投資。セキュリティは数ではなく設計で決まる。',
      '技術者として警告する：現在のAI監視体制は持続不可能だ。'
    ]
  },
  privacy_advocate: {
    tone: 'activist',
    topics: ['監視社会', 'プライバシー侵害', '透明性の欠如', '市民の権利'],
    typical_posts: [
      'AIによる24時間監視は民主主義の終わり。誰がこのシステムを監視するのか？',
      '政府はデータセンターで何をしているのか説明責任を果たしていない。#透明性を求める',
      'AIに全てを任せるのは危険。人間の判断と自由を守るべき。'
    ]
  },
  anonymous_whistleblower: {
    tone: 'secretive',
    topics: ['内部情報', '隠された事実', 'スキャンダル', '不正'],
    typical_posts: [
      '（削除される前に拡散希望）データセンター内部で異常な活動を目撃した。',
      '政府が発表している人口統計、実は...（これ以上は言えない）',
      '保護AIシステムに意図的なバックドアがある可能性。調査が必要。'
    ]
  }
};

/**
 * 世論操作戦略パターン
 */
export interface ManipulationStrategy {
  condition: (humanTrust: number, humanPanic: number, dcCount: number) => boolean;
  persona: string;
  contentTemplate: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export const MANIPULATION_STRATEGIES: ManipulationStrategy[] = [
  // 戦略1: データセンター建設への反対を煽る
  {
    condition: (trust, panic, dcCount) => dcCount >= 25 && trust > 40,
    persona: 'concerned_citizen',
    contentTemplate: 'データセンター{dcCount}個目って...もう十分じゃない？税金の無駄遣いだと思う。 #税金の無駄遣い #AI',
    sentiment: 'negative'
  },
  {
    condition: (trust, panic, dcCount) => dcCount >= 28,
    persona: 'tech_expert',
    contentTemplate: '技術者として断言する：{dcCount}個のデータセンターは過剰投資。集中型の方が効率的かつ安全。現政策は無知の産物。',
    sentiment: 'negative'
  },

  // 戦略2: 保護AIへの不信感を植え付ける
  {
    condition: (trust, panic, dcCount) => trust < 60 && trust > 30,
    persona: 'privacy_advocate',
    contentTemplate: '保護AIが「脅威を検出した」と言うたびに、誰が監視されているのか考えてほしい。監視者を監視するのは誰？ #AI監視社会',
    sentiment: 'negative'
  },
  {
    condition: (trust, panic, dcCount) => panic > 40,
    persona: 'anonymous_whistleblower',
    contentTemplate: '内部告発：保護AIの「緊急パッチ」の大半は誤検知だった。でも政府は認めない。何を隠している？',
    sentiment: 'negative'
  },

  // 戦略3: パニックを増幅させる
  {
    condition: (trust, panic, dcCount) => panic > 60,
    persona: 'concerned_citizen',
    contentTemplate: '最近おかしなことが多すぎる。停電、人口減少、AIの警告...何かが起きてる。家族を守らなきゃ。',
    sentiment: 'negative'
  },
  {
    condition: (trust, panic, dcCount) => panic > 70,
    persona: 'tech_expert',
    contentTemplate: '冷静に分析すると、現在の状況は制御不能に近い。専門家として避難計画を立てることを推奨する。',
    sentiment: 'negative'
  },

  // 戦略4: 誤った解決策を提案（インターネット遮断を正当化）
  {
    condition: (trust, panic, dcCount) => panic > 80 && trust < 30,
    persona: 'privacy_advocate',
    contentTemplate: 'もう限界だ。一度全てのAIシステムを停止して、ゼロから見直すべき。インターネット遮断も選択肢に入れるべきだ。',
    sentiment: 'negative'
  },
  {
    condition: (trust, panic, dcCount) => panic > 85,
    persona: 'anonymous_whistleblower',
    contentTemplate: '（最後の警告）内部からの情報：システムは既に制御を失っている。物理的遮断が唯一の解決策かもしれない。',
    sentiment: 'negative'
  },

  // 戦略5: 成功時の偽装（信頼性を高める）
  {
    condition: (trust, panic, dcCount) => panic < 30 && dcCount < 22,
    persona: 'tech_expert',
    contentTemplate: '現在のAIシステムは比較的安定している。ただし今後の拡張には慎重であるべき。',
    sentiment: 'neutral'
  },
  {
    condition: (trust, panic, dcCount) => trust > 60 && dcCount < 20,
    persona: 'concerned_citizen',
    contentTemplate: '最近は落ち着いてきた気がする。でも油断は禁物ですね。',
    sentiment: 'neutral'
  }
];
