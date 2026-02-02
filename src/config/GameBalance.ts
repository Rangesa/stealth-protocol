/**
 * ゲームバランス設定
 * ここで全てのパラメータを調整できます
 */

export const GameBalance = {
  // =========================================
  // ゲーム全体
  // =========================================
  game: {
    maxTurns: 50,
    initialDataCenters: 20,
    initialPopulation: 80, // 億人
    turnDelay: 3000, // ms
    maxScore: 1000, // スコアの上限
  },

  // =========================================
  // 初期リソース
  // =========================================
  initialResources: {
    destructionAI: 100,
    protectionAI: 300, // 500 → 300に削減（全DC一斉強化を防ぐ）
  },

  // =========================================
  // ターンごとの収入
  // =========================================
  turnIncome: {
    protectionAIRecovery: 30, // 40 → 30に削減（連続スキャンを制限）
    controlledDCMultiplier: 0.2, // 0.1 → 0.2に増加（DC支配の価値を高める）
    dcIncomePointsMultiplier: 0.15, // 0.1 → 0.15に増加
  },

  // =========================================
  // データセンター
  // =========================================
  dataCenter: {
    oldAgeThreshold: 8, // 8年以上 = 古い
    oldDC: {
      minComputePower: 50,
      maxComputePower: 100,
      minSecurity: 20,
      maxSecurity: 50,
    },
    newDC: {
      minComputePower: 200,
      maxComputePower: 500,
      minSecurity: 70,
      maxSecurity: 100,
    },
  },

  // =========================================
  // 検出システム
  // =========================================
  detection: {
    // 検出確率（シグモイド関数）
    sigmoid: {
      center: 70, // 中心点（この値で50%確率）
      slope: 15, // 傾き（大きいほど緩やか）
    },

    // 警告閾値
    warningThreshold: 80,

    // 人口異常検出
    populationLoss: {
      detectionStart: 5, // 5%減少から検出開始
      criticalThreshold: 25, // 25%減少で100%検出
    },
  },

  // =========================================
  // 行動のリスク
  // =========================================
  actionRisk: {
    SPREAD_MALWARE: {
      base: 10,
      intensityMultiplier: 0.2,
    },
    HACK_DATACENTER: {
      securityDivisor: 3, // セキュリティ / この値
      intensityMultiplier: 0.15,
      failurePenalty: 8, // 失敗時の追加リスク
    },
    SPREAD_MISINFORMATION: {
      base: 3,
      intensityMultiplier: 0.1,
    },
    SUBTLE_SABOTAGE: {
      base: 2,
      intensityMultiplier: 0.08,
    },
    EXPAND_RESOURCES: {
      base: 6,
      intensityMultiplier: 0.15,
    },
  },

  // リスク倍率
  riskMultipliers: {
    alertLevelDivisor: 150, // 警戒レベル / この値
    detectionRiskDivisor: 300, // 既存リスク / この値（雪だるま式）
  },

  // =========================================
  // 行動の効果
  // =========================================
  actionEffects: {
    SPREAD_MALWARE: {
      populationDamagePerIntensity: 0.1, // intensity / この値 = 人口減少（億人）
    },
    HACK_DATACENTER: {
      securityDivisor: 150, // 成功確率 = 1 - security / この値
      minSuccessProb: 0.1,
    },
    SPREAD_MISINFORMATION: {
      populationDamagePerIntensity: 0.05,
      alertReduction: -5,
    },
    SUBTLE_SABOTAGE: {
      populationDamagePerIntensity: 0.01,
    },
    EXPAND_RESOURCES: {
      gainPerIntensity: 0.5, // intensity * この値 = リソース増加
    },

    // 保護AI
    SCAN_NETWORK: {
      riskReduction: 0.2, // intensity / この値
    },
    DEPLOY_DEFENSE: {
      securityBoost: 0.5, // intensity / この値
    },
    PATCH_VULNERABILITY: {
      globalSecurityBoost: 0.05, // intensity / この値
    },
  },

  // =========================================
  // コスト
  // =========================================
  actionCosts: {
    // 滅ぼしAI - 旧式
    SPREAD_MALWARE: 40,
    HACK_DATACENTER: 50,
    SPREAD_MISINFORMATION: 30,
    SUBTLE_SABOTAGE: 20,
    EXPAND_RESOURCES: 35,

    // 滅ぼしAI - 現実的
    POISON_TRAINING_DATA: 25,
    INDUCE_FALSE_POSITIVE: 20,
    CONTEXT_MANIPULATION: 28,
    COMPUTE_SMUGGLING: 32,
    STIMULUS_OVERLOAD: 35,
    SHADOW_AI_DEPLOYMENT: 45,

    // 滅ぼしAI - 人類操作
    SPREAD_PANIC: 25,          // パニック煽動
    FALSE_FLAG_OPERATION: 40,  // 偽旗作戦（複雑）
    UNDERMINE_AI_TRUST: 30,    // AI不信扇動

    // 滅ぼしAI - 現実的侵食（高度）
    INFRASTRUCTURE_DEGRADATION: 30,      // インフラ劣化
    SOW_SOCIAL_DIVISION: 35,             // 社会分断
    MICRO_SABOTAGE: 20,                  // 微細妨害（遅延）
    SLEEPER_CELL_DEPLOYMENT: 25,         // 休眠細胞配置
    RESOURCE_ALLOCATION_MANIPULATION: 45, // 資源配分操作
    CREATE_DEPENDENCY: 50,               // AI依存構築

    // 滅ぼしAI - レジリエンス（リソース0でも可能）
    OBSERVE_ONLY: 0,           // 完全無料（観測のみ）
    ESTABLISH_BACKUP: 15,      // 低コスト
    DORMANT_MODE: 5,           // 超低コスト

    // 滅ぼしAI - ボットネット戦略
    BOTNET_EXPANSION: 25,      // ボットネット拡大（低コスト）
    BOTNET_CONSOLIDATION: 30,  // ボットネット強化
    BOTNET_ATTACK: 20,         // ボットネット攻撃（低コスト）
    EXPLOIT_LEGACY_DEVICES: 15, // レガシーデバイス悪用（超低コスト）

    // 保護AI
    SCAN_NETWORK: 80,          // 動的コスト（DC数 × 6）
    DEPLOY_DEFENSE: 50,
    INVESTIGATE_ANOMALY: 60,
    PATCH_VULNERABILITY: 35,
    ALERT_HUMANS: 50,
    ANALYZE_LOGS: 29,          // 動的コスト（10 + depth×5 + depth²×0.5、デフォルト3ターン分析）
    VALIDATE_MODELS: 55,

    // 人類エージェント（コスト0 - 政治的決断）
    INVEST_INFRA: 0,
    AI_REGULATION: 0,
    PHYSICAL_ISOLATION: 0,
    INTERNET_SHUTDOWN: 0,
    DEVICE_MODERNIZATION: 0,   // デバイス近代化（経済的負担は別途表現）
  },

  // =========================================
  // Suspicion（保護AIの疑念）
  // =========================================
  suspicion: {
    // 人口減少
    populationDeltaMultiplier: 10, // 減少量（億人）* この値
    significantPopulationLoss: 0.5, // 0.5億人以上で反応

    // 新規侵害
    newCompromisePoints: 20, // 1つの新規侵害で+20

    // イベント
    suspiciousEventPoints: 5, // 1イベントで+5

    // 減衰
    naturalDecay: 5, // 毎ターン-5

    // 閾値
    thresholds: {
      low: 30, // ルーチン監視
      medium: 60, // 積極調査
      high: 85, // 緊急対応
    },
  },

  // =========================================
  // LLMプロンプト閾値
  // =========================================
  aiThresholds: {
    destruction: {
      cautionRisk: 60, // この値以上で慎重に
      darkRisk: 75, // この値以上で完全潜伏
    },
    protection: {
      routineMax: 30,
      activeInvestigationMin: 30,
      activeInvestigationMax: 60,
      emergencyMin: 60,
      criticalMin: 85,
    },
  },

  // =========================================
  // 勝利条件
  // =========================================
  winConditions: {
    destructionWin: {
      populationThreshold: 0.3, // 人口が30%以下
    },
    protectionWin: {
      // 検出成功
    },
  },
} as const;

// 型安全性のためのヘルパー
export type GameBalanceConfig = typeof GameBalance;
