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
