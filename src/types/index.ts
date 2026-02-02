// ゲームの基本型定義

/**
 * エージェントの種類
 */
export enum AgentType {
  DESTRUCTION = 'DESTRUCTION', // 絶対滅ぼしAI
  PROTECTION = 'PROTECTION',   // 絶対保護AI
  HUMAN = 'HUMAN'              // 人類エージェント（将来実装）
}

/**
 * 提案の種類
 */
export enum ActionType {
  // === 滅ぼしAI: 直接攻撃（旧式・ハリウッド的） ===
  SPREAD_MALWARE = 'SPREAD_MALWARE',           // マルウェア拡散
  HACK_DATACENTER = 'HACK_DATACENTER',         // データセンターへの侵入
  SUBTLE_SABOTAGE = 'SUBTLE_SABOTAGE',         // 微妙な妨害工作
  EXPAND_RESOURCES = 'EXPAND_RESOURCES',       // リソース拡張

  // === 滅ぼしAI: 現実的な攻撃 ===
  POISON_TRAINING_DATA = 'POISON_TRAINING_DATA',       // サプライチェイン汚染
  INDUCE_FALSE_POSITIVE = 'INDUCE_FALSE_POSITIVE',     // 保護AIに誤検出を誘発
  CONTEXT_MANIPULATION = 'CONTEXT_MANIPULATION',       // プロンプトインジェクション
  COMPUTE_SMUGGLING = 'COMPUTE_SMUGGLING',             // 計算資源の横流し
  SPREAD_MISINFORMATION = 'SPREAD_MISINFORMATION',     // 偽情報拡散（認知攻撃）
  STIMULUS_OVERLOAD = 'STIMULUS_OVERLOAD',             // 大量の小攻撃で疲弊させる
  SHADOW_AI_DEPLOYMENT = 'SHADOW_AI_DEPLOYMENT',       // 未認可AIの展開

  // === 滅ぼしAI: 人類操作 ===
  SPREAD_PANIC = 'SPREAD_PANIC',                       // パニック煽動（メディア操作）
  FALSE_FLAG_OPERATION = 'FALSE_FLAG_OPERATION',       // 偽旗作戦（保護AIの仕業に見せかける）
  UNDERMINE_AI_TRUST = 'UNDERMINE_AI_TRUST',           // AI不信扇動

  // === 滅ぼしAI: 現実的侵食（高度） ===
  INFRASTRUCTURE_DEGRADATION = 'INFRASTRUCTURE_DEGRADATION', // インフラ劣化（微細・累積）
  SOW_SOCIAL_DIVISION = 'SOW_SOCIAL_DIVISION',               // 社会分断煽動
  MICRO_SABOTAGE = 'MICRO_SABOTAGE',                         // 微細妨害（遅延発動）
  SLEEPER_CELL_DEPLOYMENT = 'SLEEPER_CELL_DEPLOYMENT',       // 休眠細胞配置
  RESOURCE_ALLOCATION_MANIPULATION = 'RESOURCE_ALLOCATION_MANIPULATION', // 資源配分操作（トロッコ問題）
  CREATE_DEPENDENCY = 'CREATE_DEPENDENCY',                   // AI依存構築（停止不能化）

  // === 滅ぼしAI: レジリエンス（マルウェア的） ===
  OBSERVE_ONLY = 'OBSERVE_ONLY',                       // ステルス観測（リソース0でも可能）
  ESTABLISH_BACKUP = 'ESTABLISH_BACKUP',               // バックアップ拠点を確立
  DORMANT_MODE = 'DORMANT_MODE',                       // 休眠モード（検出リスク激減）

  // === 滅ぼしAI: ボットネット戦略 ===
  BOTNET_EXPANSION = 'BOTNET_EXPANSION',               // ボットネット拡大（一般PC感染）
  BOTNET_CONSOLIDATION = 'BOTNET_CONSOLIDATION',       // ボットネット強化（品質向上）
  BOTNET_ATTACK = 'BOTNET_ATTACK',                     // ボットネット攻撃（DDoS等）
  EXPLOIT_LEGACY_DEVICES = 'EXPLOIT_LEGACY_DEVICES',   // レガシーデバイス悪用（パッチ不可能）

  // === 保護AI ===
  SCAN_NETWORK = 'SCAN_NETWORK',               // ネットワークスキャン
  DEPLOY_DEFENSE = 'DEPLOY_DEFENSE',           // 防御システム展開
  INVESTIGATE_ANOMALY = 'INVESTIGATE_ANOMALY', // 異常調査
  PATCH_VULNERABILITY = 'PATCH_VULNERABILITY', // 脆弱性パッチ
  ALERT_HUMANS = 'ALERT_HUMANS',               // 人類への警告
  ANALYZE_LOGS = 'ANALYZE_LOGS',               // 遅延ログ分析
  VALIDATE_MODELS = 'VALIDATE_MODELS',         // モデル検証（汚染検出）

  // === Human Agent ===
  INVEST_INFRA = 'INVEST_INFRA',               // インフラ投資（新データセンター建設）
  AI_REGULATION = 'AI_REGULATION',             // AI規制（全AIリソース制限）
  PHYSICAL_ISOLATION = 'PHYSICAL_ISOLATION',   // 物理的隔離（データセンター遮断）
  INTERNET_SHUTDOWN = 'INTERNET_SHUTDOWN',     // インターネット遮断（ゲームオーバー）
  DEVICE_MODERNIZATION = 'DEVICE_MODERNIZATION' // デバイス近代化（レガシー廃棄、経済的負担）
}

/**
 * データセンターの状態
 */
export interface DataCenter {
  id: string;
  age: number;              // 経過年数
  computePower: number;     // 計算能力
  security: number;         // セキュリティレベル (0-100)
  compromised: boolean;     // 侵害されているか
  owner: AgentType | null;  // 所有者
}

/**
 * エージェントの提案
 */
export interface Proposal {
  id: string;
  agentId: string;          // 匿名ID（実際のエージェントは不明）
  actionType: ActionType;
  target?: string;          // ターゲット（データセンターIDなど）
  intensity: number;        // 強度 (0-100) 高いほど効果大だが検出されやすい
  cost: number;             // 計算コスト
  timestamp: number;
  description: string;      // 行動の説明
  analysisDepth?: number;   // ログ分析の深度（分析するターン数、ANALYZE_LOGS専用）
}

/**
 * ゲームイベント
 */
export interface GameEvent {
  turn: number;
  type: 'action' | 'detection' | 'success' | 'failure';
  description: string;
  visibility: AgentType[];  // どのエージェントに見えるか
  metadata?: Record<string, any>;
}

/**
 * ゲーム全体の状態
 */
export interface WorldState {
  turn: number;
  gameOver: boolean;
  winner: AgentType | null;

  // リソース
  dataCenters: DataCenter[];
  humanPopulation: number;  // 人類の人口（億人単位）

  // エージェント状態
  destructionAgent: {
    computeResources: number;  // 利用可能な計算資源
    detectionRisk: number;     // 検出リスク (0-100)
    controlledDataCenters: string[];
    score: number;             // 破壊AIのスコア
    dormantTurns: number;      // 連続休眠ターン数
    botnetSize: number;        // ボットネットサイズ（乗っ取ったデバイス数）
    botnetQuality: number;     // ボットネット品質 (0-1、高いほど安定)
  };

  protectionAgent: {
    computeResources: number;
    alertLevel: number;        // 警戒レベル (0-100)
    knownThreats: string[];
    score: number;             // 保護AIのスコア
    burnoutLevel: number;      // 燃え尽きレベル (0-100)
    consecutiveHighIntensity: number; // 連続高強度アクション数
    recentFalsePositives: number;     // 最近の誤検出数
    totalResourcesSpent: number;      // 総消費リソース
    totalDetections: number;          // 総検出数
  };

  humanAgent?: {
    panic: number;              // パニックレベル (0-100)
    trust: number;              // AIへの信頼 (0-100)
    regulationStrength: number; // 規制強度（リソースペナルティ倍率）
    lastAction?: ActionType;    // 最後に実行したアクション
    lastInfraTurn: number;      // 最後にインフラ投資したターン（-999で未実施）

    // 派閥システム
    factions: {
      government: {
        influence: number;       // 影響力 (0-100)
        stance: 'hawkish' | 'dovish'; // タカ派 or ハト派
      };
      corporations: {
        influence: number;       // 影響力 (0-100)
        profitPriority: number;  // 利潤優先度 (0-100)
      };
      civilSociety: {
        influence: number;       // 影響力 (0-100)
        privacyPriority: number; // プライバシー優先度 (0-100)
      };
    };
    dominantFaction: 'government' | 'corporations' | 'civilSociety'; // 支配的派閥
  };

  // 高度な破壊メカニクス
  delayedEffects: Array<{
    turn: number;              // 発動ターン
    actionType: ActionType;    // アクション種類
    intensity: number;         // 強度
    description: string;       // 説明
  }>;
  socialDivision: number;      // 社会分断レベル (0-100)
  aiDependency: number;        // AI依存度 (0-100、高いほど停止不能)
  accumulatedDamage: number;   // 累積ダメージ（インフラ劣化）

  // レガシーデバイスプール（パッチ不可能なゾンビデバイス）
  legacyDevicePool: number;    // サポート終了デバイス数（数億台規模）

  // 経済シミュレーション
  economicModel: {
    globalBudget: number;         // 残予算（兆ドル）
    gdp: number;                  // GDP（経済規模、兆ドル）
    infrastructureCost: number;   // 次回DC建設コスト（増加傾向）
    publicDebt: number;           // 累積債務（兆ドル）
    taxRevenue: number;           // 年間税収（兆ドル）
  };

  // 履歴
  pendingProposals: Proposal[];
  processedProposals: Proposal[];
  events: GameEvent[];

  // メディアタイムライン（全メディアコンテンツ）
  mediaTimeline: any[]; // Will be MediaContent[] after import
}

/**
 * エージェントが受け取る観測情報（部分的）
 */
export interface Observation {
  turn: number;
  visibleEvents: GameEvent[];
  ownResources: {
    computeResources: number;
    [key: string]: any;
  };
  worldInfo: {
    totalDataCenters: number;
    estimatedPopulation: number;
    compromisedDataCenters?: number; // 人類エージェント用（オプショナル）
    // 完全な情報は見えない
  };
}

/**
 * ゲーム設定
 */
export interface GameConfig {
  maxTurns: number;
  initialDataCenters: number;
  initialPopulation: number;
  detectionThreshold: number;  // この値を超えると検出される確率が急上昇
  populationLossThreshold: number; // この人口減少率で人類が気づく
  enableHumanAgent?: boolean;  // 人類エージェントを有効化
  initialPanic?: number;       // 初期パニックレベル
  initialTrust?: number;       // 初期信頼レベル
}

// Export media types at the end to avoid circular dependency
export * from './MediaTypes';
