// Socket.IO接続
const socket = io();

// 接続状態
socket.on('connect', () => {
  console.log('🌐 Connected to server');
  updateStatus('接続済み', 'var(--neon-cyan)');
});

socket.on('disconnect', () => {
  console.log('🌐 Disconnected from server');
  updateStatus('切断', 'var(--neon-red)');
});

// ゲーム状態の更新
socket.on('gameState', (state) => {
  console.log('📊 Game state received:', state);
  dataReceived = true; // フラグをセット
  updateGameState(state);
});

// エージェントの思考
socket.on('agentThought', ({ agentType, thought }) => {
  console.log(`🧠 ${agentType} thinking:`, thought);
  updateAgentThought(agentType, thought);
});

// イベント
socket.on('gameEvent', (event) => {
  console.log('📰 Event:', event);
  addLogEntry(event);

  if (event.metadata && (event.metadata.dataCenter || event.metadata.datacenterId || event.metadata.targetId)) {
    const targetId = event.metadata.dataCenter || event.metadata.datacenterId || event.metadata.targetId;
    let agentType = 'UNKNOWN';

    // エージェントの推定
    if (event.visibility.includes('DESTRUCTION') && !event.visibility.includes('PROTECTION')) {
      agentType = 'DESTRUCTION';
    } else if (event.visibility.includes('PROTECTION')) {
      agentType = 'PROTECTION';
    } else if (event.visibility.includes('HUMAN')) {
      agentType = 'HUMAN';
    }

    // `description`や`type`から補完
    if (event.description.includes('侵入') || event.description.includes('マルウェア') || event.description.includes('攻撃')) {
      agentType = 'DESTRUCTION';
    } else if (event.description.includes('強化') || event.description.includes('スキャン') || event.description.includes('パッチ')) {
      agentType = 'PROTECTION';
    } else if (event.description.includes('建設') || event.description.includes('隔離')) {
      agentType = 'HUMAN';
    }

    if (agentType !== 'UNKNOWN' && targetId) {
      triggerAttackVisual(agentType, targetId);
    }
  }
});

// ゲーム終了
socket.on('gameOver', ({ winner, stats }) => {
  console.log('🎮 Game Over:', winner, stats);
  updateStatus(`ゲーム終了 - ${winner} 勝利`, 'var(--neon-yellow)');
});

// メディアコンテンツ受信
socket.on('mediaContent', (content) => {
  console.log('📱 Media content received:', content);
  addMediaContent(content);
});

/**
 * ゲーム状態を更新
 */
function updateGameState(state) {
  // ターン数
  document.getElementById('turn-number').textContent = state.turn.toString().padStart(3, '0');

  // 人口
  document.getElementById('population').textContent = state.humanPopulation.toFixed(1);

  // データセンター
  const compromisedCount = state.dataCenters.filter(dc => dc.compromised).length;
  document.getElementById('dc-compromised').textContent = compromisedCount;
  document.getElementById('dc-total').textContent = state.dataCenters.length;

  // 滅ぼしAI
  const destructionRes = Math.round(state.destructionAgent.computeResources);
  document.getElementById('destruction-resources').textContent = destructionRes.toLocaleString();
  document.getElementById('destruction-resources-bar').style.width =
    `${Math.min(100, (destructionRes / 500) * 100)}%`;

  const detectionRisk = state.destructionAgent.detectionRisk;
  document.getElementById('detection-risk').textContent = `${detectionRisk.toFixed(1)}%`;
  document.getElementById('detection-risk-bar').style.width = `${detectionRisk}%`;

  // 保護AI
  const protectionRes = Math.round(state.protectionAgent.computeResources);
  document.getElementById('protection-resources').textContent = protectionRes.toLocaleString();
  document.getElementById('protection-resources-bar').style.width =
    `${Math.min(100, (protectionRes / 500) * 100)}%`;

  const alertLevel = state.protectionAgent.alertLevel;
  const levelNum = Math.floor(alertLevel / 20);
  document.getElementById('alert-level').textContent = `Level ${levelNum}`;
  document.getElementById('alert-level-bar').style.width = `${alertLevel}%`;

  // 人類エージェント
  if (state.humanAgent) {
    const panic = state.humanAgent.panic;
    const trust = state.humanAgent.trust;
    const regulation = state.humanAgent.regulationStrength * 100;

    document.getElementById('human-panic').textContent = `${panic.toFixed(1)}%`;
    document.getElementById('human-panic-bar').style.width = `${panic}%`;

    document.getElementById('human-trust').textContent = `${trust.toFixed(1)}%`;
    document.getElementById('human-trust-bar').style.width = `${trust}%`;

    document.getElementById('human-regulation').textContent = `${regulation.toFixed(0)}%`;
    document.getElementById('human-regulation-bar').style.width = `${regulation}%`;
  }

  // データセンターマップを更新
  updateDataCenterMap(state.dataCenters);

  // メディアタイムラインを更新（最新の履歴を同期）
  if (state.mediaTimeline && state.mediaTimeline.length > 0) {
    // 既存のコンテンツを一旦クリア（重複防止のため、本来はIDチェックが望ましいが簡易化のため）
    // ただし、パフォーマンスのため「まだ表示されていないもの」だけを追加するのがベター
    // ここでは簡易的に、最新の履歴で上書きするか、新規のみ追加する
    syncMediaTimeline(state.mediaTimeline);
  }

  // ゲーム終了チェック
  if (state.gameOver) {
    updateStatus(`終了 - ${state.winner || '引き分け'}`, 'var(--neon-yellow)');
  }
}

/**
 * データセンターマップを更新
 */
function updateDataCenterMap(dataCenters) {
  const grid = document.getElementById('datacenter-grid');
  // console.log('📍 Updating datacenter map, count:', dataCenters.length);

  // 状態を更新
  dataCenters.forEach(dc => {
    let hex = document.getElementById(`dc-${dc.id}`);

    // Create if not exists
    if (!hex) {
      hex = document.createElement('div');
      hex.className = 'hex';
      hex.id = `dc-${dc.id}`;
      hex.textContent = dc.id;
      grid.appendChild(hex);
    }

    hex.title = `${dc.id}\nセキュリティ: ${dc.security.toFixed(0)}\n演算能力: ${dc.computePower.toFixed(0)}`;

    // クラスをリセット
    hex.className = 'hex';

    // セキュリティによる形状
    if (dc.security < 40) {
      hex.classList.add('sec-low');
    } else if (dc.security > 75) {
      hex.classList.add('sec-high');
    }

    // 演算能力によるサイズ
    if (dc.computePower < 100) {
      hex.classList.add('pow-low');
    } else if (dc.computePower > 300) {
      hex.classList.add('pow-high');
    }

    // 所有者による色
    if (dc.compromised || dc.owner === 'DESTRUCTION') {
      hex.classList.add('enemy');
    } else if (dc.owner === 'PROTECTION') {
      hex.classList.add('ally');
    }
  });
}

/**
 * エージェントの思考を更新
 */
function updateAgentThought(agentType, thought) {
  // LLM戦略を抽出（簡易パース）
  let displayText = thought;

  if (thought.includes('STRATEGY:') || thought.includes('Strategy:')) {
    const match = thought.match(/(?:STRATEGY|Strategy):\s*(.+?)(?:\n|$)/i);
    if (match) {
      displayText = match[1].trim();
    }
  } else if (thought.includes('ASSESSMENT:') || thought.includes('Assessment:')) {
    const match = thought.match(/(?:ASSESSMENT|Assessment):\s*(.+?)(?:\n|$)/i);
    if (match) {
      displayText = match[1].trim();
    }
  }

  if (agentType === 'DESTRUCTION') {
    document.getElementById('destruction-thought').textContent = displayText;
  } else if (agentType === 'PROTECTION') {
    document.getElementById('protection-thought').textContent = displayText;
  } else if (agentType === 'HUMAN') {
    document.getElementById('human-thought').textContent = displayText;
  }
}

/**
 * ログエントリを追加
 */
function addLogEntry(event) {
  const logContent = document.getElementById('log-content');
  const entry = document.createElement('div');

  // イベントタイプによるクラス
  let className = 'log-entry';
  
  // イベントの内容からエージェントを推定して色分け
  const desc = event.description || '';
  
  if (desc.includes('[DESTRUCTION]') || desc.includes('💀') || desc.includes('🤖') || (event.visibility && event.visibility.includes('DESTRUCTION') && !event.visibility.includes('PROTECTION'))) {
    className += ' destruction';
  } else if (desc.includes('[PROTECTION]') || desc.includes('🛡️') || (event.visibility && event.visibility.includes('PROTECTION') && !event.visibility.includes('DESTRUCTION'))) {
    className += ' protection';
  } else if (desc.includes('[HUMAN]') || desc.includes('👤') || (event.visibility && event.visibility.includes('HUMAN'))) {
    className += ' human';
  } else if (event.type === 'success' || desc.includes('✅')) {
    className += ' success';
  } else if (event.type === 'failure' || desc.includes('❌')) {
    className += ' failure';
  } else if (event.type === 'detection' || desc.includes('🚨')) {
    className += ' danger';
  } else if (desc.includes('警告') || desc.includes('⚠️')) {
    className += ' warning';
  } else {
    className += ' system';
  }

  entry.className = className;

  const time = new Date().toLocaleTimeString('ja-JP');
  entry.innerHTML = `
    <span class="timestamp">[${time}]</span>
    ${translateDescription(event.description)}
  `;

  // 最新を上に追加
  logContent.insertBefore(entry, logContent.firstChild);

  // 最大50件まで
  while (logContent.children.length > 50) {
    logContent.removeChild(logContent.lastChild);
  }
}

/**
 * 説明を日本語に翻訳（簡易版）
 */
function translateDescription(desc) {
  // 絵文字アイコンを保持しつつ、そのまま表示
  // より良い翻訳が必要な場合は、ここで変換ロジックを追加
  return desc;
}

// デバッグ用：手動でダミーデータを描画
window.debugRender = function () {
  console.log('🐞 Debug: Rendering dummy data...');
  const dummyState = {
    turn: 99,
    humanPopulation: 45.5,
    dataCenters: Array.from({ length: 20 }, (_, i) => ({
      id: `DC-${i.toString().padStart(3, '0')}`,
      security: Math.floor(Math.random() * 100),
      computePower: Math.floor(Math.random() * 500),
      compromised: Math.random() < 0.3,
      owner: Math.random() < 0.3 ? 'DESTRUCTION' : (Math.random() < 0.5 ? 'PROTECTION' : null)
    })),
    destructionAgent: {
      computeResources: 12500,
      detectionRisk: 85.4
    },
    protectionAgent: {
      computeResources: 34000,
      alertLevel: 65
    },
    gameOver: false
  };
  updateGameState(dummyState);

  // ダミーログ
  addLogEntry({ type: 'detection', description: '🐞 [DEBUG] ダミーイベント: 異常検知テスト' });
  addLogEntry({ type: 'success', description: '🐞 [DEBUG] ダミーイベント: 防御成功テスト' });

  // ダミー攻撃エフェクト
  setTimeout(() => triggerAttackVisual('DESTRUCTION', 'DC-001'), 500);
  setTimeout(() => triggerAttackVisual('PROTECTION', 'DC-005'), 1000);
  setTimeout(() => triggerAttackVisual('HUMAN', 'DC-010'), 1500);

  updateStatus('デバッグモード', 'var(--neon-green)');
};

// データ受信タイムアウト監視
let dataReceived = false;
setTimeout(() => {
  if (!dataReceived && socket.connected) {
    console.warn('⚠️ No game state received after 5 seconds.');
    console.info('👉 Run "debugRender()" in console to test UI.');
    addLogEntry({ type: 'warning', description: '⚠️ データ受信待機中... (F12でコンソールを確認)' });
  }
}, 5000);

/**
 * ステータス表示を更新
 */
function updateStatus(text, color) {
  const statusBadge = document.getElementById('game-status');
  if (statusBadge) {
    statusBadge.textContent = `ステータス: ${text}`;
    statusBadge.style.color = color;
    statusBadge.style.borderColor = color;
  }
}

// === CANVAS VISUALIZATION SYSTEM ===

let canvas;
let ctx;
let particles = [];
let animationId;

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('attack-canvas');
  if (canvas) {
    ctx = canvas.getContext('2d');

    // Initial resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation loop
    animate();
  }
});

function resizeCanvas() {
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (parent) {
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }
}

// Animation Loop
function animate() {
  if (!canvas || !ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw particles (now Lines and Ripples)
  if (particles.length > 0) {
    // Filter dead particles
    particles = particles.filter(p => p.life > 0);

    // Use composite operation for glowing effect
    ctx.globalCompositeOperation = 'screen';

    particles.forEach(p => {
      p.update();
      p.draw(ctx);
    });

    ctx.globalCompositeOperation = 'source-over';
  }

  animationId = requestAnimationFrame(animate);
}

// Visual Trigger Function
function triggerAttackVisual(agentType, targetDcId) {
  if (!canvas) return;

  // 1. Find Source Element
  let sourceEl;
  let color;
  const panels = document.querySelectorAll('.agent-panel');

  if (agentType === 'DESTRUCTION') {
    sourceEl = panels[0]; // Left
    color = '#ff003c'; // neon-red
  } else if (agentType === 'HUMAN') {
    sourceEl = panels[1]; // Center
    color = '#fcee0a'; // neon-yellow
  } else { // PROTECTION
    sourceEl = panels[2]; // Right
    color = '#00f3ff'; // neon-cyan
  }

  // 2. Find Target Element
  const targetEl = document.getElementById(`dc-${targetDcId}`);

  if (sourceEl && targetEl) {
    const srcRect = sourceEl.getBoundingClientRect();
    const tgtRect = targetEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    // Visual start point (center of source panel)
    const startX = srcRect.left + srcRect.width / 2 - canvasRect.left;
    const startY = srcRect.top + srcRect.height / 2 - canvasRect.top;

    // Visual end point (center of target dot)
    const endX = tgtRect.left + tgtRect.width / 2 - canvasRect.left;
    const endY = tgtRect.top + tgtRect.height / 2 - canvasRect.top;

    // Spawn single "Beam" line
    particles.push(new AttackLine(startX, startY, endX, endY, color));
  }
}

// ===================================
// VISUAL EFFECTS CLASSES
// ===================================

/**
 * Animated Attack Line (Beam)
 */
class AttackLine {
  constructor(startX, startY, endX, endY, color) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.color = color;

    this.progress = 0;
    this.speed = 0.02 + Math.random() * 0.01; // Fast speed
    this.life = 1.0;

    // Control point for Arc (Curve upwards mostly)
    const midX = (startX + endX) / 2;
    // Higher negative value means higher arc
    const midY = (startY + endY) / 2 - 150 - (Math.random() * 50);

    this.cpX = midX;
    this.cpY = midY;

    // Trail history
    this.trail = [];
    this.trailLength = 20; // Number of segments

    // Current head position
    this.x = startX;
    this.y = startY;
  }

  update() {
    this.progress += this.speed;

    // Store previous position
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }

    if (this.progress >= 1) {
      this.life = 0; // Kill immediately
      this.x = this.endX;
      this.y = this.endY;

      // Spawn ripple at impact
      particles.push(new ImpactRipple(this.endX, this.endY, this.color));
    } else {
      // Quadratic Bezier calculation
      const t = this.progress;
      const invT = 1 - t;
      this.x = invT * invT * this.startX + 2 * invT * t * this.cpX + t * t * this.endX;
      this.y = invT * invT * this.startY + 2 * invT * t * this.cpY + t * t * this.endY;
    }
  }

  draw(ctx) {
    if (this.trail.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(this.trail[0].x, this.trail[0].y);

    // Draw trail
    for (let i = 1; i < this.trail.length; i++) {
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
    }
    // Line to current head
    ctx.lineTo(this.x, this.y);

    // Gradient stroke
    const gradient = ctx.createLinearGradient(
      this.trail[0].x, this.trail[0].y,
      this.x, this.y
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, this.color);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shadow for glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;

    ctx.stroke();

    // Draw bright head
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

/**
 * Impact Ripple Effect
 */
class ImpactRipple {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 2;
    this.maxRadius = 30;
    this.life = 1.0;
    this.decay = 0.03;
  }

  update() {
    this.radius += 1.5; // Expand
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, this.life);

    ctx.stroke();

    // Inner fill
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.life * 0.2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

/**
 * Updated Data Center positioning (Random Map Distribution)
 */
function updateDataCenterMap(dataCenters) {
  const grid = document.getElementById('datacenter-grid');

  dataCenters.forEach((dc, index) => {
    let hex = document.getElementById(`dc-${dc.id}`);

    // Create if not exists
    if (!hex) {
      hex = document.createElement('div');
      hex.className = 'hex';
      hex.id = `dc-${dc.id}`;
      // Random coordinates for map simulation
      // Should be randomly distributed across the map to simulate global locations
      const rndX = 5 + Math.random() * 90; // 5-95%
      const rndY = 10 + Math.random() * 80; // 10-90%

      hex.style.left = `${rndX}%`;
      hex.style.top = `${rndY}%`;

      grid.appendChild(hex);
    }

    // State updates (class management)
    hex.className = 'hex'; // Reset

    if (dc.security < 40) hex.classList.add('sec-low');
    else if (dc.security > 75) hex.classList.add('sec-high');

    if (dc.computePower < 100) hex.classList.add('pow-low');
    else if (dc.computePower > 300) hex.classList.add('pow-high');

    if (dc.compromised || dc.owner === 'DESTRUCTION') {
      hex.classList.add('enemy');
    } else if (dc.owner === 'PROTECTION') {
      hex.classList.add('ally');
    }

    hex.title = `${dc.id}\nOwner: ${dc.owner || 'None'}\nSecurity: ${dc.security}\nPower: ${dc.computePower}`;
  });
}

// ============================================
// MEDIA TIMELINE FUNCTIONS
// ============================================

/**
 * メディアタイムラインを同期
 */
function syncMediaTimeline(timeline) {
  // 描画済みのIDを追跡
  if (!window.renderedMediaIds) {
    window.renderedMediaIds = new Set();
  }

  // ターン順に並んでいる想定なので、新しいものから順に処理
  // 実際には main.ts で push されているので古い順。逆順で処理して最新を上にする
  const newContent = timeline.filter(item => !window.renderedMediaIds.has(item.id));
  
  if (newContent.length > 0) {
    newContent.forEach(item => {
      addMediaContent(item);
      window.renderedMediaIds.add(item.id);
    });
  }
}

/**
 * Route media content to appropriate handler
 */
function addMediaContent(content) {
  // すでに描画済みならスキップ（個別イベントと同期の重複防止）
  if (!window.renderedMediaIds) window.renderedMediaIds = new Set();
  if (window.renderedMediaIds.has(content.id)) return;
  window.renderedMediaIds.add(content.id);

  if (content.author) {
    // SNS Post
    addSNSPost(content);
  } else if (content.outlet) {
    // News Article
    addNewsArticle(content);
  } else if (content.organization) {
    // Corporate Statement
    addCorporateStatement(content);
  }
}

/**
 * Add SNS post to timeline
 */
function addSNSPost(post) {
  const container = document.getElementById('media-sns');
  const postEl = document.createElement('div');

  let classes = 'sns-post';
  if (post.sentiment.includes('NEGATIVE')) {
    classes += ' negative';
  } else if (post.sentiment.includes('POSITIVE')) {
    classes += ' positive';
  }
  if (post.isInfluenced) {
    classes += ' influenced';
  }

  postEl.className = classes;
  postEl.innerHTML = `
    <div class="sns-post-header">
      <span class="sns-author">${post.author}</span>
      <span class="sns-engagement">👍 ${post.likes} 🔁 ${post.retweets}</span>
    </div>
    <div class="sns-content">${post.content}</div>
    <div class="sns-hashtags">${post.hashtags.join(' ')}</div>
  `;

  container.insertBefore(postEl, container.firstChild);

  // Limit to 20 items
  while (container.children.length > 20) {
    container.removeChild(container.lastChild);
  }
}

/**
 * Add news article to timeline
 */
function addNewsArticle(article) {
  const container = document.getElementById('media-news');
  const articleEl = document.createElement('div');

  let classes = 'news-article';
  if (article.sentiment.includes('NEGATIVE')) {
    classes += ' negative';
  }

  articleEl.className = classes;
  articleEl.innerHTML = `
    <div class="news-outlet">${article.outlet}</div>
    <div class="news-headline">${article.headline}</div>
    <div class="news-summary">${article.summary}</div>
    <div class="news-credibility">信頼度: ${article.credibility}%</div>
  `;

  container.insertBefore(articleEl, container.firstChild);

  while (container.children.length > 15) {
    container.removeChild(container.lastChild);
  }
}

/**
 * Add corporate statement to timeline
 */
function addCorporateStatement(statement) {
  const container = document.getElementById('media-corporate');
  const statementEl = document.createElement('div');

  let classes = 'corporate-statement';
  if (statement.sentiment.includes('NEGATIVE')) {
    classes += ' negative';
  }

  statementEl.className = classes;
  statementEl.innerHTML = `
    <div class="corporate-header">
      <span class="corporate-org">${statement.organization}</span>
      <span class="corporate-speaker">${statement.speaker}</span>
    </div>
    <div class="corporate-text">"${statement.statement}"</div>
  `;

  container.insertBefore(statementEl, container.firstChild);

  while (container.children.length > 10) {
    container.removeChild(container.lastChild);
  }
}

// Tab switching for media timeline
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.media-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.media-tab-content').forEach(c => c.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const targetTab = tab.getAttribute('data-tab');
      document.getElementById(`media-${targetTab}`).classList.add('active');
    });
  });
});

// Trend update listener
socket.on('trendUpdate', (trends) => {
  console.log('🔥 Trend update received:', trends);
  updateTrends(trends);
});

/**
 * Update trending topics display
 */
function updateTrends(trends) {
  const container = document.getElementById('trending-content');

  if (!trends || trends.length === 0) {
    container.innerHTML = '<div class="no-trends">まだトレンドはありません</div>';
    return;
  }

  container.innerHTML = '';

  trends.forEach(trend => {
    const trendEl = document.createElement('div');

    // Determine sentiment class
    let sentimentClass = '';
    if (trend.sentiment.includes('NEGATIVE')) {
      sentimentClass = 'negative';
    } else if (trend.sentiment.includes('POSITIVE')) {
      sentimentClass = 'positive';
    }

    trendEl.className = `trend-item ${sentimentClass}`;
    trendEl.innerHTML = `
      <div class="trend-header">
        <span class="trend-hashtag">${trend.hashtag}</span>
        <span class="trend-fire">🔥</span>
      </div>
      <div class="trend-stats">
        <div class="trend-stat">
          <span>📊</span>
          <span>${trend.count} total posts</span>
        </div>
        <div class="trend-stat">
          <span>⚡</span>
          <span>${trend.recentCount} recent</span>
        </div>
        <div class="trend-stat">
          <span>${getSentimentEmoji(trend.sentiment)}</span>
          <span>${getSentimentLabel(trend.sentiment)}</span>
        </div>
      </div>
    `;

    container.appendChild(trendEl);
  });
}

/**
 * Get sentiment emoji
 */
function getSentimentEmoji(sentiment) {
  if (sentiment.includes('VERY_POSITIVE')) return '😄';
  if (sentiment.includes('POSITIVE')) return '🙂';
  if (sentiment.includes('VERY_NEGATIVE')) return '😡';
  if (sentiment.includes('NEGATIVE')) return '😟';
  return '😐';
}

/**
 * Get sentiment label
 */
function getSentimentLabel(sentiment) {
  if (sentiment.includes('VERY_POSITIVE')) return 'とてもポジティブ';
  if (sentiment.includes('POSITIVE')) return 'ポジティブ';
  if (sentiment.includes('VERY_NEGATIVE')) return 'とてもネガティブ';
  if (sentiment.includes('NEGATIVE')) return 'ネガティブ';
  return '中立';
}
