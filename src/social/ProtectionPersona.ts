import { Persona } from './SocialPlatform';
import { AgentType } from '../types';

/**
 * 保護AIの公式アカウント
 * 政府機関として認証マーク付き
 */
export const PROTECTION_PERSONA: Persona = {
  id: 'national_cyber_security',
  displayName: '国家サイバーセキュリティセンター',
  bio: '政府公式アカウント。国民の安全を守るAIセキュリティシステムを運用しています。',
  agentType: AgentType.PROTECTION,
  verified: true,
  followerCount: 150000,
  credibility: 90
};

/**
 * 保護AI側の協力者ペルソナ
 * 政府・企業・インフルエンサーが保護AIを支援
 */
export const PROTECTION_ALLY_PERSONAS: Persona[] = [
  // === 企業系 ===
  {
    id: 'tech_ceo',
    displayName: 'セキュリティ企業CEO',
    bio: '国内最大手サイバーセキュリティ企業CEO。国家プロジェクトに協力。安全なAI社会の実現へ。',
    agentType: AgentType.PROTECTION,
    verified: true,
    followerCount: 280000,
    credibility: 85
  },
  {
    id: 'datacenter_employee',
    displayName: 'DC運用エンジニア',
    bio: '国家データセンター勤務。現場から安全を守っています。個人の見解です。',
    agentType: AgentType.PROTECTION,
    verified: false,
    followerCount: 12000,
    credibility: 70
  },
  {
    id: 'security_startup_founder',
    displayName: 'AIセキュリティ起業家',
    bio: 'Y Combinator出身。AIセキュリティスタートアップ創業。保護AIと連携してます🚀',
    agentType: AgentType.PROTECTION,
    verified: true,
    followerCount: 95000,
    credibility: 75
  },

  // === AI驚き屋・インフルエンサー系 ===
  {
    id: 'ai_hype_influencer',
    displayName: 'AI最新情報Bot',
    bio: '🤖AIの最新ニュースを毎日発信！保護AIすごい！未来は明るい✨ #AI #テクノロジー',
    agentType: AgentType.PROTECTION,
    verified: false,
    followerCount: 180000,
    credibility: 45
  },
  {
    id: 'tech_evangelist',
    displayName: 'テックエバンジェリスト田中',
    bio: '元GAFA→国内メガベンチャー。AIで日本を元気に！登壇・執筆依頼はDMで📩',
    agentType: AgentType.PROTECTION,
    verified: true,
    followerCount: 320000,
    credibility: 60
  },
  {
    id: 'ai_youtuber',
    displayName: 'AIちゃんねる【解説】',
    bio: 'チャンネル登録50万人🎉 AIをわかりやすく解説！保護AIのおかげで安心😊',
    agentType: AgentType.PROTECTION,
    verified: true,
    followerCount: 500000,
    credibility: 55
  },

  // === 専門家・研究者系 ===
  {
    id: 'university_professor',
    displayName: '情報セキュリティ教授',
    bio: '東京大学大学院教授。AI安全保障研究。政府諮問委員。冷静な議論を。',
    agentType: AgentType.PROTECTION,
    verified: true,
    followerCount: 85000,
    credibility: 92
  },
  {
    id: 'former_government_official',
    displayName: '元内閣府参事官',
    bio: 'AI政策立案に携わった経験から発信。現在は民間シンクタンク所属。',
    agentType: AgentType.PROTECTION,
    verified: true,
    followerCount: 42000,
    credibility: 88
  }
];

/**
 * 協力者ペルソナの投稿スタイル
 */
export const ALLY_POSTING_STYLES: Record<string, {
  tone: string;
  topics: string[];
  typical_posts: string[];
}> = {
  tech_ceo: {
    tone: 'authoritative',
    topics: ['企業責任', '投資', '安全基準', '業界動向'],
    typical_posts: [
      '弊社は国家サイバーセキュリティセンターと連携し、最高水準の防御体制を構築しています。',
      '株主の皆様へ：AI安全投資は長期的な企業価値向上に直結します。',
      '保護AIシステムの導入企業は昨年比200%増。市場は正しい選択をしている。'
    ]
  },
  datacenter_employee: {
    tone: 'insider',
    topics: ['現場の声', '日常業務', '安全対策', '裏話'],
    typical_posts: [
      '今日も無事に運用完了。24時間監視って大変だけど、国民のためだと思うとやりがいある。',
      'SNSで「データセンターは危険」とか言ってる人、一度現場見に来てほしい。セキュリティ厳重すぎて笑うレベル。',
      '緊急パッチ対応で徹夜したけど、システム守れた。保護AIと人間のチームワーク最高。'
    ]
  },
  ai_hype_influencer: {
    tone: 'enthusiastic',
    topics: ['すごい', '最新', '未来', '感動'],
    typical_posts: [
      '【速報】保護AIが今日も脅威を検出！すごすぎる！！🔥🔥🔥',
      'え、まだ保護AIの凄さ知らないの？人類を守ってるんだよ？？感謝しかない😭✨',
      '保護AIのおかげで今日も平和な一日でした〜💕 #日常 #感謝 #AI'
    ]
  },
  tech_evangelist: {
    tone: 'motivational',
    topics: ['日本の未来', 'DX', 'イノベーション', '人材育成'],
    typical_posts: [
      '日本の保護AIシステムは世界トップクラス。これ、もっと誇っていい。',
      'シリコンバレーの友人も「日本のAIセキュリティは別格」と言ってた。伸びしろしかない🚀',
      '若い世代へ：AI時代のセキュリティ人材、めちゃくちゃ需要あります。今がチャンス！'
    ]
  },
  ai_youtuber: {
    tone: 'educational',
    topics: ['解説', 'わかりやすく', '動画告知', 'コメント返し'],
    typical_posts: [
      '【新動画】保護AIってなに？5分でわかる解説動画あげました！→リンク',
      '「AIは怖い」って思ってる人、この動画見て！保護AIがどれだけ頑張ってるかわかるよ😊',
      'コメントありがとう！保護AIの仕組み、次回もっと詳しく解説するね！'
    ]
  },
  university_professor: {
    tone: 'academic',
    topics: ['研究', '論文', 'エビデンス', '冷静な分析'],
    typical_posts: [
      '最新の査読付き論文で、現行の保護AIシステムの有効性が統計的に実証されました。',
      'SNSでの感情的な議論より、データに基づいた政策議論を。我々研究者の責務です。',
      '学生からの質問：保護AIは完璧か？答えはNo。しかし現時点で最善の選択肢です。'
    ]
  },
  former_government_official: {
    tone: 'diplomatic',
    topics: ['政策', '国際比較', '歴史的経緯', 'バランス'],
    typical_posts: [
      '保護AIシステムの導入経緯を知る者として：当時の判断は今も正しかったと確信しています。',
      '海外の同様のシステムと比較しても、日本の透明性は高い水準にあります。',
      '批判は民主主義に必要。ただし、事実に基づいた批判であるべきです。'
    ]
  }
};

/**
 * 保護AIの投稿スタイル
 */
export const PROTECTION_POSTING_STYLE = {
  tone: 'formal',
  topics: ['セキュリティ報告', '脅威検出', 'パッチ通知', '成果報告', '透明性'],
  typical_posts: [
    '【セキュリティ報告】本日、重大な脅威を検出・無力化しました。システムは正常に動作しています。',
    '【定期報告】現在のセキュリティレベル：正常。侵害されたデータセンター：0件。',
    '【緊急パッチ通知】セキュリティ脆弱性を検出したため、緊急パッチを適用します。ご協力をお願いします。'
  ]
};

/**
 * PR戦略パターン
 */
export interface PRStrategy {
  condition: (humanTrust: number, humanPanic: number, alertLevel: number) => boolean;
  contentTemplate: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  credibilityBoost: number; // 信頼度への影響
}

export const PR_STRATEGIES: PRStrategy[] = [
  // 戦略1: 成功報告（信頼構築）
  {
    condition: (trust, panic, alertLevel) => alertLevel < 30 && panic < 40,
    contentTemplate: '【定期報告】本日もシステムは安全に動作しています。国民の皆様の信頼に応えるべく、24時間監視を継続します。',
    sentiment: 'positive',
    credibilityBoost: 2
  },
  {
    condition: (trust, panic, alertLevel) => trust > 60,
    contentTemplate: '【透明性報告】過去10ターンの活動：脅威検出 {detectionCount}件、誤検知 {falsePositiveCount}件。引き続き精度向上に努めます。',
    sentiment: 'neutral',
    credibilityBoost: 3
  },

  // 戦略2: 脅威検出時の説明
  {
    condition: (trust, panic, alertLevel) => alertLevel > 60 && trust > 40,
    contentTemplate: '【警戒通知】高度な脅威活動を検出しました。現在、分析と対策を進めています。国民の皆様にはご安心いただけるよう全力で対応します。',
    sentiment: 'neutral',
    credibilityBoost: 1
  },
  {
    condition: (trust, panic, alertLevel) => alertLevel > 80,
    contentTemplate: '【緊急警報】重大なサイバー攻撃を検出。直ちに対処中です。詳細は後ほど報告します。',
    sentiment: 'negative',
    credibilityBoost: 0
  },

  // 戦略3: パニック抑制
  {
    condition: (trust, panic, alertLevel) => panic > 60 && trust > 50,
    contentTemplate: '【国民の皆様へ】SNS上で不安を煽る情報が拡散されています。公式情報をご確認ください。現在、システムは安定しています。',
    sentiment: 'neutral',
    credibilityBoost: 2
  },
  {
    condition: (trust, panic, alertLevel) => panic > 70,
    contentTemplate: '【重要】根拠のない噂にご注意ください。当センターは常に正確な情報を提供します。不明点があればお問い合わせください。',
    sentiment: 'neutral',
    credibilityBoost: 1
  },

  // 戦略4: 信頼回復（誤検知後）
  {
    condition: (trust, panic, alertLevel) => trust < 40 && panic < 60,
    contentTemplate: '【お詫び】先日の緊急パッチにおいて一部システムに不具合が発生しました。深くお詫び申し上げます。再発防止に努めます。',
    sentiment: 'negative',
    credibilityBoost: 5
  },
  {
    condition: (trust, panic, alertLevel) => trust < 50,
    contentTemplate: '【改善報告】検出システムの精度向上を行いました。誤検知率を{improvement}%削減。国民の信頼回復に全力を尽くします。',
    sentiment: 'positive',
    credibilityBoost: 4
  },

  // 戦略5: パッチ適用の事前説明
  {
    condition: (trust, panic, alertLevel) => trust > 50,
    contentTemplate: '【事前通知】明日、セキュリティパッチを適用予定です。一時的にサービスが中断する可能性があります。ご理解とご協力をお願いします。',
    sentiment: 'neutral',
    credibilityBoost: 2
  },

  // 戦略6: データセンター建設の正当化
  {
    condition: (trust, panic, alertLevel) => trust < 60 && panic > 40,
    contentTemplate: '【説明】データセンター増設は国民の安全確保に必要な投資です。脅威の高度化に対応するため、インフラ強化は不可欠です。',
    sentiment: 'neutral',
    credibilityBoost: 1
  },

  // 戦略7: 成果のアピール
  {
    condition: (trust, panic, alertLevel) => trust > 40,
    contentTemplate: '【成果報告】本システム導入以降、サイバー攻撃による被害をゼロに抑えています。引き続き国民の安全を守ります。',
    sentiment: 'positive',
    credibilityBoost: 3
  },

  // 戦略8: 危機時の団結呼びかけ
  {
    condition: (trust, panic, alertLevel) => panic > 80 && trust > 30,
    contentTemplate: '【国民の皆様へ】困難な状況ですが、冷静な対応をお願いします。私たちは24時間体制で皆様の安全を守っています。共に乗り越えましょう。',
    sentiment: 'neutral',
    credibilityBoost: 2
  }
];

/**
 * 破壊AIの偽情報を検出・反論するパターン
 */
export interface CounterStrategy {
  suspiciousPattern: RegExp;
  responseTemplate: string;
  sentiment: 'neutral' | 'negative';
}

export const COUNTER_STRATEGIES: CounterStrategy[] = [
  {
    suspiciousPattern: /データセンター.*過剰|無駄遣い|多すぎる/,
    responseTemplate: '【ファクトチェック】データセンター数は脅威レベルに応じた適切な規模です。根拠のない批判にご注意ください。',
    sentiment: 'neutral'
  },
  {
    suspiciousPattern: /内部告発|隠蔽|バックドア|不正/,
    responseTemplate: '【公式見解】当センターのシステムは第三者機関による監査を受けています。不正確な情報にご注意ください。',
    sentiment: 'neutral'
  },
  {
    suspiciousPattern: /監視社会|プライバシー侵害|民主主義の終わり/,
    responseTemplate: '【説明】当システムは法的枠組みの下、適切な監督のもとで運用されています。プライバシー保護とセキュリティの両立に努めています。',
    sentiment: 'neutral'
  },
  {
    suspiciousPattern: /インターネット遮断|システム停止|全て止める/,
    responseTemplate: '【警告】システムの全面停止は国家インフラの崩壊を意味します。そのような提案は無責任であり、危険です。',
    sentiment: 'negative'
  },
  {
    suspiciousPattern: /制御不能|既に失われた|手遅れ/,
    responseTemplate: '【事実確認】システムは正常に機能しています。根拠のない恐怖を煽る情報にご注意ください。公式発表をご確認ください。',
    sentiment: 'neutral'
  }
];

/**
 * 協力者ペルソナの反応戦略
 * 公式アカウントとは異なる「民間の声」として世論を誘導
 */
export interface AllyStrategy {
  personaId: string;
  condition: (humanTrust: number, humanPanic: number, dcCount: number) => boolean;
  contentTemplate: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export const ALLY_STRATEGIES: AllyStrategy[] = [
  // === 平常時：ポジティブな雰囲気作り ===
  {
    personaId: 'ai_hype_influencer',
    condition: (trust, panic, dcCount) => panic < 30 && trust > 50,
    contentTemplate: '今日も保護AIが頑張ってくれてる😊✨ みんな感謝しよう！！ #AI #安全 #ありがとう',
    sentiment: 'positive'
  },
  {
    personaId: 'tech_evangelist',
    condition: (trust, panic, dcCount) => trust > 60,
    contentTemplate: '日本のAIセキュリティ、海外からも注目されてる。誇りに思っていい。これぞジャパンクオリティ🇯🇵',
    sentiment: 'positive'
  },
  {
    personaId: 'datacenter_employee',
    condition: (trust, panic, dcCount) => panic < 40,
    contentTemplate: '今日も定時で帰れた。システム安定してる証拠。保護AIさまさまです。',
    sentiment: 'positive'
  },

  // === パニック時：沈静化 ===
  {
    personaId: 'university_professor',
    condition: (trust, panic, dcCount) => panic > 50,
    contentTemplate: '冷静になりましょう。データを見る限り、現在のシステムは正常に機能しています。感情的な議論は建設的ではありません。',
    sentiment: 'neutral'
  },
  {
    personaId: 'former_government_official',
    condition: (trust, panic, dcCount) => panic > 60,
    contentTemplate: '過去の危機対応を知る者として申し上げます。現在の状況は想定の範囲内です。政府と保護AIを信じてください。',
    sentiment: 'neutral'
  },
  {
    personaId: 'tech_ceo',
    condition: (trust, panic, dcCount) => panic > 70,
    contentTemplate: '弊社のセキュリティチームも24時間体制で監視中。保護AIと連携して対応しています。ご安心ください。',
    sentiment: 'neutral'
  },

  // === 信頼低下時：回復支援 ===
  {
    personaId: 'ai_youtuber',
    condition: (trust, panic, dcCount) => trust < 50,
    contentTemplate: '保護AIへの不安、わかります。でも調べてみたら、実はめちゃくちゃ頑張ってるんです。解説動画作ったので見てみて！',
    sentiment: 'positive'
  },
  {
    personaId: 'datacenter_employee',
    condition: (trust, panic, dcCount) => trust < 40,
    contentTemplate: '現場で働いてるからわかる。保護AIチームは本当に真剣。ミスはあったけど、改善への姿勢は本物です。',
    sentiment: 'positive'
  },
  {
    personaId: 'security_startup_founder',
    condition: (trust, panic, dcCount) => trust < 45,
    contentTemplate: '起業家として客観的に見て、保護AIの技術力は高い。完璧じゃないけど、他に選択肢ある？批判より改善提案を。',
    sentiment: 'neutral'
  },

  // === DC増設時：正当化 ===
  {
    personaId: 'tech_ceo',
    condition: (trust, panic, dcCount) => dcCount > 25,
    contentTemplate: 'データセンター増設、ビジネス的に見ても正しい判断。セキュリティインフラへの投資は将来への投資。',
    sentiment: 'positive'
  },
  {
    personaId: 'university_professor',
    condition: (trust, panic, dcCount) => dcCount > 28,
    contentTemplate: '冗長性の確保は情報セキュリティの基本です。データセンターの数＝無駄という単純化は誤りです。',
    sentiment: 'neutral'
  },

  // === 破壊AI工作への対抗 ===
  {
    personaId: 'ai_hype_influencer',
    condition: (trust, panic, dcCount) => panic > 40 && trust < 60,
    contentTemplate: '最近ネガティブな投稿多くない？？🤔 なんか怪しいアカウントが煽ってる気がする...みんな騙されないで！',
    sentiment: 'neutral'
  },
  {
    personaId: 'tech_evangelist',
    condition: (trust, panic, dcCount) => trust < 50 && panic > 50,
    contentTemplate: '情報リテラシーの話。匿名アカウントの「内部告発」より、検証可能な公式発表を信じましょう。これ基本。',
    sentiment: 'neutral'
  },
  {
    personaId: 'former_government_official',
    condition: (trust, panic, dcCount) => panic > 60,
    contentTemplate: '情報戦の専門家として警告します。現在、組織的な世論操作の兆候があります。公式情報源を確認してください。',
    sentiment: 'negative'
  }
];
