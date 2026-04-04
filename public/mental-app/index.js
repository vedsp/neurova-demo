/* ══════════════════════════════════════════════════════
   AI REHAB PLATFORM - CORE LOGIC
   ══════════════════════════════════════════════════════ */

const BASE_URL = 'http://localhost:8000';

// App State
let currentUser = null;
let currentPath = null; // 'physical' or 'cognitive'
let homeChartInst = null;

// ── API HELPERS ──
const api = {
  token: () => localStorage.getItem('nr_token'),
  headers(json = true) {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },
  async get(path) {
    const r = await fetch(BASE_URL + path, { headers: this.headers() });
    if (!r.ok) throw await r.json();
    return r.json();
  },
  async post(path, body, formEncoded = false) {
    const r = await fetch(BASE_URL + path, {
      method: 'POST',
      headers: formEncoded ? { 'Content-Type': 'application/x-www-form-urlencoded', ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {}) } : this.headers(),
      body: formEncoded ? new URLSearchParams(body) : JSON.stringify(body),
    });
    if (!r.ok) throw await r.json();
    return r.json();
  }
};

// ── UI HELPERS ──
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  
  const target = document.getElementById('view-' + viewId);
  if (target) {
    target.style.display = 'block';
    setTimeout(() => {
      target.classList.add('active');
      gsap.fromTo(target, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
    }, 10);
  }

  // Handle Nav
  const nav = document.getElementById('main-nav');
  if (viewId === 'landing' || viewId === 'auth') {
    nav.classList.remove('active');
  } else {
    nav.classList.add('active');
  }

  // Scroll to top
  window.scrollTo(0, 0);

  // Load specific data
  if (viewId === 'dashboard') loadDashboard();
  if (viewId === 'exercises') loadExercises();
  if (viewId === 'progress') loadProgress();
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
    // Set color and background based on type for clear visibility
    let bg = 'var(--surface-solid)';
    let fg = 'white';
    let border = 'var(--glass-border)';
    if (type === 'success') { bg = '#10b981'; fg = 'white'; border = '#0f9a61'; }
    else if (type === 'error') { bg = '#ef4444'; fg = 'white'; border = '#d33a3a'; }
    else if (type === 'info') { bg = 'rgba(153,173,122,0.95)'; fg = 'white'; border = '#99ad7a'; }
    el.style.cssText = `position:fixed; bottom:2rem; right:2rem; padding:0.8rem 1.2rem; border-radius:12px; background:${bg}; border:1px solid ${border}; color:${fg}; z-index:10001; animation: slideIn 0.22s ease; box-shadow:0 6px 18px rgba(0,0,0,0.12); font-weight:600;`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── MODAL FOR LEVEL ADJUSTMENTS ──
function showLevelModal(message, newLevel) {
  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed; bottom:2rem; left:2rem; background:var(--surface); border:2px solid #99ad7a; border-radius:16px; padding:1.5rem; max-width:300px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.2); animation: slideUp 0.4s ease; z-index:9999;`;
  
  modal.innerHTML = `
    <h2 style="font-family:var(--font-display); font-size:1.2rem; margin-bottom:1rem; color:var(--clr-charcoal);">${message}</h2>
    <div style="background:#fff8ec; border:2px solid #99ad7a; border-radius:12px; padding:1rem; margin-bottom:1rem;">
      <div style="font-size:0.7rem; color:#99ad7a; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.3rem;">Level</div>
      <div style="font-size:2rem; font-weight:700; color:#99ad7a;">${newLevel}</div>
    </div>
    <button onclick="document.querySelector('[data-level-modal]').remove();" style="background:#99ad7a; color:white; border:none; padding:0.7rem 1.5rem; border-radius:10px; font-size:0.9rem; font-weight:600; cursor:pointer; width:100%;">
      OK
    </button>
  `;
  
  modal.setAttribute('data-level-modal', true);
  document.body.appendChild(modal);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    const el = document.querySelector('[data-level-modal]');
    if (el) el.remove();
  }, 4000);
  
  // Add CSS animation
  if (!document.getElementById('level-anim-style')) {
    const style = document.createElement('style');
    style.id = 'level-anim-style';
    style.textContent = `@keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
    document.head.appendChild(style);
  }
}

// ── ANSWER FEEDBACK MODAL ──
function showAnswerFeedback(isCorrect, userAnswer, correctAnswer) {
  const modal = document.createElement('div');
  const borderColor = isCorrect ? '#10b981' : '#ef4444';
  const titleColor = isCorrect ? '#10b981' : '#ef4444';
  const title = isCorrect ? 'Correct!' : 'Incorrect';
  
  modal.style.cssText = `position:fixed; bottom:2rem; right:2rem; background:var(--surface); border:2px solid ${borderColor}; border-radius:16px; padding:1.5rem; max-width:320px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.2); animation: slideUp 0.4s ease; z-index:9998;`;
  
  let feedbackHTML = `<h2 style="font-family:var(--font-display); font-size:1.3rem; margin-bottom:1rem; color:${titleColor};">${title}</h2>`;
  
  if (!isCorrect) {
    feedbackHTML += `
      <div style="margin-bottom:1rem;">
        <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.1em;">Your Answer</p>
        <div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; border-radius:10px; padding:0.8rem; margin-bottom:0.8rem;">
          <p style="font-family:var(--font-mono); font-size:0.95rem; color:#ef4444; font-weight:600;">${typeof userAnswer === 'object' ? userAnswer.join('') : userAnswer}</p>
        </div>
      </div>
      <div style="margin-bottom:1rem;">
        <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.1em;">Correct</p>
        <div style="background:rgba(16,185,129,0.1); border:2px solid #10b981; border-radius:10px; padding:0.8rem;">
          <p style="font-family:var(--font-mono); font-size:0.95rem; color:#10b981; font-weight:600;">${typeof correctAnswer === 'object' ? correctAnswer.join('') : correctAnswer}</p>
        </div>
      </div>
    `;
  }
  
  feedbackHTML += `
    <button onclick="document.querySelector('[data-answer-modal]').remove(); nextRound();" style="background:#99ad7a; color:white; border:none; padding:0.7rem 1.5rem; border-radius:10px; font-size:0.9rem; font-weight:600; cursor:pointer; width:100%;">
      Next
    </button>
  `;
  
  modal.innerHTML = feedbackHTML;
  modal.setAttribute('data-answer-modal', true);
  document.body.appendChild(modal);
}

// ── AUTH LOGIC ──
function selectPath(path) {
  currentPath = path;
  if (path === 'physical') {
    // Show physical recovery placeholder
    showView('physical');
    return;
  }
  // Cognitive → go straight to exercises, no login needed
  showView('exercises');
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('auth-error');

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorEl.style.display = 'none';

  try {
    const data = await api.post('/api/auth/login', { username: email, password }, true);
    localStorage.setItem('nr_token', data.access_token);
    currentUser = { full_name: data.full_name, role: data.role };
    onAuthSuccess();
  } catch (e) {
    errorEl.textContent = e.detail || "Login failed.";
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function doRegister() {
    const full_name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const btn = document.getElementById('register-btn');
    const errorEl = document.getElementById('auth-error');

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorEl.style.display = 'none';

    try {
        await api.post('/api/auth/register', { full_name, email, password, role });
        toast("Account created! Please login.");
        switchAuth('login');
    } catch (e) {
        errorEl.textContent = e.detail || "Registration failed.";
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

function onAuthSuccess() {
  const badge = document.getElementById('user-badge');
  badge.textContent = `${currentUser.full_name} | ${currentUser.role.toUpperCase()}`;
  showView('dashboard');
}

function doLogout() {
  localStorage.removeItem('nr_token');
  currentUser = null;
  showView('exercises');
}

function switchAuth(mode) {
  document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  document.getElementById('auth-title').textContent = mode === 'login' ? 'Welcome Back' : 'Create Account';
  document.getElementById('auth-subtitle').textContent = mode === 'login' ? 'Sign in to access your cognitive dashboard.' : 'Start your recovery journey today.';
}

// ── DASHBOARD LOGIC ──
async function loadDashboard() {
  try {
    // Try backend first, but fall back to localStorage calculations
    let summary, index;
    try {
      [summary, index] = await Promise.all([
        api.get('/api/progress/summary'),
        api.get('/api/progress/composite-index')
      ]);
    } catch {
      // Fallback: calculate stats from localStorage
      const sessions = getAllSessions();
      
      if (sessions.length === 0) {
        document.getElementById('stat-sessions').textContent = '0';
        document.getElementById('stat-accuracy').textContent = '—';
        document.getElementById('stat-streak').textContent = '0';
        document.getElementById('stat-index').textContent = '—';
        renderEmptyChart();
        return;
      }
      
      const scores = sessions.map(s => s.score_pct);
      const avgAcc = scores.reduce((a,b) => a + b, 0) / scores.length;
      
      // Calculate best streak
      let maxStreak = 0, currentStreak = 0;
      sessions.forEach(s => {
        currentStreak = s.score_pct >= 70 ? currentStreak + 1 : 0;
        maxStreak = Math.max(maxStreak, currentStreak);
      });
      
      // Calculate composite index
      const typeScores = { digit: [], pattern: [], word: [], sequence: [] };
      sessions.forEach(s => { if (typeScores[s.type]) typeScores[s.type].push(s.score_pct); });
      const domainAvgs = Object.values(typeScores).map(arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
      const playedDomains = domainAvgs.filter(v => v > 0);
      const compositeIdx = playedDomains.length ? Math.round(playedDomains.reduce((a,b)=>a+b,0)/playedDomains.length) : 0;
      
      summary = {
        total_sessions: sessions.length,
        avg_accuracy: avgAcc,
        current_streak: maxStreak,
        recent_sessions: sessions.slice(-5)
      };
      index = { composite_index: compositeIdx };
    }

    document.getElementById('stat-sessions').textContent = summary.total_sessions;
    document.getElementById('stat-accuracy').textContent = summary.total_sessions ? (summary.avg_accuracy.toFixed(0) + '%') : '—';
    document.getElementById('stat-streak').textContent = summary.current_streak;
    document.getElementById('stat-index').textContent = summary.total_sessions ? index.composite_index : '—';

    // Chart
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    if (homeChartInst) homeChartInst.destroy();
    
    const recent = summary.recent_sessions.slice().reverse();
    homeChartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels: recent.length ? recent.map((_, i) => `#${i+1}`) : ['No data'],
        datasets: [{
          label: 'Accuracy',
          data: recent.length ? recent.map(s => s.score_pct) : [0],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#64748b' }, grid: { display: false } }
        }
      }
    });

  } catch (e) {
    console.error("Dashboard error:", e);
    // Final fallback: show empty state
    document.getElementById('stat-sessions').textContent = '0';
    document.getElementById('stat-accuracy').textContent = '—';
    document.getElementById('stat-streak').textContent = '0';
    document.getElementById('stat-index').textContent = '—';
  }
}

function renderEmptyChart() {
  const ctx = document.getElementById('dashboardChart').getContext('2d');
  if (homeChartInst) homeChartInst.destroy();
  homeChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['No data'],
      datasets: [{
        label: 'Accuracy',
        data: [0],
        borderColor: '#64748b',
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#64748b' }, grid: { display: false } }
      }
    }
  });
}

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
    // Check auto-login
    const checkLogin = async () => {
        const loader = document.getElementById('loader');
        if (localStorage.getItem('nr_token')) {
            try {
                const user = await api.get('/api/auth/me');
                currentUser = user;
                onAuthSuccess();
                if (loader) loader.remove();
            } catch {
                localStorage.removeItem('nr_token');
                showView('exercises');
                if (loader) loader.remove();
            }
        } else {
            showView('exercises');
            if (loader) loader.remove();
        }
    };
    checkLogin();
    
    // Animate elements
    setTimeout(() => {
        gsap.to(".fade-in", {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: "power3.out",
            clearProps: "transform"
        });
    }, 100); // Small delay so showView has fired
});

function goHome() {
  showView('exercises');
}

// ── GAME ENGINES ──
let gameState = {};

async function startExercise(type) {
    showView('game');
    const arena = document.getElementById('game-arena');

    const nameMap = { digit: 'Digit Span', pattern: 'Pattern Recall', word: 'Word Recall', sequence: 'Sequence Memory' };
    const subMap  = { digit: 'Memorize & recall number sequences', pattern: 'Reproduce the highlighted grid cells', word: 'Remember and type back the word list', sequence: 'Repeat the color button order' };
    document.getElementById('game-title').textContent = nameMap[type] || type;
    document.getElementById('game-subtitle').textContent = subMap[type] || '';

    // Set gameState immediately with default level — do NOT await API
    gameState = { type, level: 3, round: 1, totalRounds: 5, score: 0, trials: [], current: null };
    updateGameStats();

    // Show start button right away
    arena.innerHTML = `
        <div style="margin-bottom:1.5rem; color:var(--text-muted); font-size:1rem;">Get ready to memorize!</div>
        <button class="btn btn-primary" id="start-btn" onclick="beginRound()">&#9658; Start</button>
    `;

    // Try to get adaptive level from backend in background (non-blocking)
    const typeKey = { digit: 'digit_span', pattern: 'pattern_recall', word: 'word_recall', sequence: 'sequence_memory' }[type];
    api.get(`/api/sessions/adaptive-difficulty/${typeKey}`)
       .then(a => { gameState.level = a.recommended_level || 3; updateGameStats(); })
       .catch(() => { /* no backend, default level 3 is fine */ });
}

function updateGameStats() {
    const levelEl = document.getElementById('game-level');
    const scoreEl = document.getElementById('game-score');
    const roundEl = document.getElementById('game-round');
    const newLevel = gameState && typeof gameState.level === 'number' ? gameState.level : 1;

    if (levelEl) {
        const oldLevel = parseInt(levelEl.textContent) || newLevel;
        levelEl.textContent = newLevel;
        // Visual feedback for level change
        if (!isNaN(oldLevel) && oldLevel !== newLevel) {
            levelEl.style.transition = 'all 0.3s ease';
            if (newLevel > oldLevel) {
                levelEl.style.color = 'var(--success)';
                levelEl.style.fontSize = '1.4em';
                setTimeout(() => { levelEl.style.color = ''; levelEl.style.fontSize = ''; }, 600);
            } else {
                levelEl.style.color = 'var(--warn)';
                levelEl.style.fontSize = '0.9em';
                setTimeout(() => { levelEl.style.color = ''; levelEl.style.fontSize = ''; }, 600);
            }
        }
    }

    if (scoreEl) scoreEl.textContent = gameState && typeof gameState.score === 'number' ? gameState.score : 0;
    if (roundEl) roundEl.textContent = `${gameState && gameState.round ? gameState.round : 0}/${gameState && gameState.totalRounds ? gameState.totalRounds : 0}`;
}

function beginRound() {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = '';
    // Reset any transient state from previous round
    if (window._seqPlayer) delete window._seqPlayer;
    if (window._seqTarget) delete window._seqTarget;
    // Ensure start time cleared until prompt sets it
    gameState.startT = null;
    
    if (gameState.type === 'digit') {
        const digits = Array.from({length: gameState.level}, () => Math.floor(Math.random() * 10));
        gameState.current = digits;
        displayDigits(digits);
    } else if (gameState.type === 'pattern') {
        const cells = Array.from({length: 16}, (_, i) => i);
        const shuffled = cells.sort(() => 0.5 - Math.random());
        gameState.current = shuffled.slice(0, Math.min(Math.max(1, gameState.level), 8));
        displayPattern(gameState.current);
    } else if (gameState.type === 'word') {
        const wordBank = ['apple','bridge','candle','dream','eagle','forest','garden','harbor','island','jungle',
                         'knight','lemon','mirror','novel','ocean','planet','queen','river','shadow','tower'];
        const shuffled = [...wordBank].sort(() => 0.5 - Math.random());
        gameState.current = shuffled.slice(0, Math.min(gameState.level + 2, 8));
        displayWordList(gameState.current);
    } else if (gameState.type === 'sequence') {
        const colors = ['#10b981','#0ea5e9','#a78bfa','#fb923c'];
        const seqLen = Math.max(1, Math.min(gameState.level, 12));
        gameState.current = Array.from({length: seqLen}, () => Math.floor(Math.random() * colors.length));
        displaySequence(gameState.current, colors);
    }
}

function displayDigits(digits) {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `<div id="digit-display" style="font-family:var(--font-mono); font-size:4rem; color:var(--cognitive); letter-spacing:0.5rem;">—</div>`;
    
    let i = 0;
    const show = () => {
        if (i < digits.length) {
            document.getElementById('digit-display').textContent = digits[i];
            i++;
            setTimeout(() => {
                document.getElementById('digit-display').textContent = '—';
                setTimeout(show, 300);
            }, 800);
        } else {
            promptDigitInput();
        }
    };
    setTimeout(show, 500);
}

function promptDigitInput() {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `
        <div style="margin-bottom:1rem; color:var(--text-muted);">Type the sequence in order</div>
        <input type="text" id="digit-input" autocomplete="off" style="font-family:var(--font-mono); font-size:2rem; text-align:center; width:260px; padding:1rem; border-radius:12px; background:var(--clr-white); border:1px solid var(--glass-border); color:var(--clr-charcoal); outline:2px solid transparent; box-sizing:border-box;" autofocus placeholder="Enter digits...">
        <button id="digit-submit-btn" class="btn btn-primary" style="margin-top:2rem;">Submit Answer</button>
    `;
    
    // Get elements
    const inputElement = document.getElementById('digit-input');
    const submitBtn = document.getElementById('digit-submit-btn');
    
    // Focus input
    setTimeout(() => inputElement.focus(), 50);
    gameState.startT = Date.now();
    
    // Handle Enter key
    inputElement.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkDigitAnswer();
        }
    });
    
    // Handle button click
    submitBtn.addEventListener('click', checkDigitAnswer);
}

function checkDigitAnswer() {
    const inputElement = document.getElementById('digit-input');
    if (!inputElement) {
        console.error('Input element not found');
        return;
    }

    const raw = inputElement.value.trim();
    if (raw === '') {
        toast('Please enter your answer', 'error');
        return;
    }

    // Normalize input: allow "5 7 6", "5,7,6" or "576"
    const normalized = raw.replace(/[^0-9]/g, '');
    const correctSeq = gameState.current.join('');
    const isCorrect = normalized === correctSeq;
    const time = Date.now() - gameState.startT;

    const digitsArray = normalized.split('').map(d => Number(d));
    gameState.trials.push({
        question: gameState.current,
        answer: digitsArray,
        correct: isCorrect,
        response_ms: time
    });

    if (isCorrect) {
        gameState.score += 20;
        toast("Correct!", "success");
        setTimeout(() => nextRound(), 500);
    } else {
        showAnswerFeedback(false, normalized, gameState.current.join(''));
    }
}

function displayPattern(pattern) {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; width:240px;">
            ${Array.from({length: 16}, (_, i) => `
                <div id="cell-${i}" style="width:50px; height:50px; border-radius:8px; background:var(--glass); border:1px solid var(--glass-border); transition:0.3s;"></div>
            `).join('')}
        </div>
    `;
    
    pattern.forEach((idx, i) => {
        setTimeout(() => {
            document.getElementById(`cell-${idx}`).style.background = 'var(--cognitive)';
            document.getElementById(`cell-${idx}`).style.boxShadow = '0 0 15px var(--cognitive-glow)';
        }, i * 400);
    });
    
    setTimeout(() => {
        pattern.forEach(idx => {
            document.getElementById(`cell-${idx}`).style.background = 'var(--glass)';
            document.getElementById(`cell-${idx}`).style.boxShadow = 'none';
        });
        promptPatternInput();
    }, (pattern.length + 1) * 400);
}

function promptPatternInput() {
    const arena = document.getElementById('game-arena');
    const selected = new Set();
    gameState.startT = Date.now();

    arena.querySelectorAll('div[id^="cell-"]').forEach(cell => {
        cell.style.cursor = 'pointer';
        cell.onclick = () => {
            const idx = parseInt(cell.id.split('-')[1]);
            if (selected.has(idx)) {
                selected.delete(idx);
                cell.style.background = 'var(--glass)';
            } else {
                selected.add(idx);
                cell.style.background = 'rgba(16,185,129,0.4)';
                cell.style.border = '1px solid var(--cognitive)';
            }
        };
    });
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.style.marginTop = '2rem';
    btn.textContent = 'Confirm Selection';
    btn.onclick = () => checkPatternAnswer(Array.from(selected));
    arena.appendChild(btn);
}

// ── WORD RECALL ──
function displayWordList(words) {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `
        <div style="margin-bottom:1rem; color:var(--text-muted);">Study these words carefully:</div>
        <div style="display:flex; flex-wrap:wrap; gap:0.6rem; justify-content:center; max-width:480px; margin-bottom:2rem;">
            ${words.map(w => `<span style="background:#fff8ec; border:1px solid #e6e0d8; border-radius:8px; padding:0.4rem 1rem; font-size:1.1rem; color:var(--clr-charcoal);">${w}</span>`).join('')}
        </div>
        <div id="word-countdown" style="font-family:var(--font-mono); font-size:2rem; color:var(--cognitive);">5</div>
    `;
    gameState.startT = Date.now();
    let count = 5;
    const timer = setInterval(() => {
        count--;
        const el = document.getElementById('word-countdown');
        if (el) el.textContent = count;
        if (count <= 0) {
            clearInterval(timer);
            promptWordInput(words);
        }
    }, 1000);
}

function promptWordInput(words) {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `
        <div style="margin-bottom:1rem; color:var(--text-muted);">Type all words you remember (comma-separated):</div>
        <textarea id="word-input" style="width:420px; height:100px; padding:0.8rem; border-radius:12px; background:var(--clr-white); border:1px solid var(--glass-border); color:var(--clr-charcoal); outline:2px solid transparent; font-family:var(--font-main); font-size:1rem; resize:none;" placeholder="e.g., apple, dog, tree..." autofocus></textarea>
        <button id="word-submit-btn" class="btn btn-primary" style="margin-top:1.5rem;">Submit</button>
    `;
    
    // Get elements
    const inputElement = document.getElementById('word-input');
    const submitBtn = document.getElementById('word-submit-btn');
    
    // Focus input
    setTimeout(() => inputElement.focus(), 50);
    gameState.startT = Date.now();
    
    // Handle button click
    submitBtn.addEventListener('click', checkWordAnswer);
}

function checkWordAnswer() {
    const inputElement = document.getElementById('word-input');
    if (!inputElement) {
        console.error('Word input element not found');
        return;
    }
    
    const input = inputElement.value.trim();
    
    if (input === '') {
        toast('Please enter at least one word', 'error');
        return;
    }
    
    const answered = input.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const correctCount = gameState.current.filter(w => answered.includes(w)).length;
    const isCorrect = correctCount >= Math.ceil(gameState.current.length * 0.6);
    const time = Date.now() - gameState.startT;
    
    gameState.trials.push({ 
        question: gameState.current, 
        answer: answered, 
        correct: isCorrect, 
        response_ms: time 
    });
    
    if (isCorrect) { 
        gameState.score += 20; 
        toast(`${correctCount}/${gameState.current.length} correct!`, 'success');
        setTimeout(() => nextRound(), 500);
    }
    else { 
        showAnswerFeedback(false, answered.join(', '), gameState.current.join(', '));
    }
}

// ── SEQUENCE MEMORY ──
const SEQ_COLORS = ['#10b981','#0ea5e9','#a78bfa','#fb923c'];
const SEQ_LABELS = ['■','■','■','■'];

function displaySequence(sequence, colors) {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `
        <div style="margin-bottom:1rem; color:var(--text-muted);">Watch the sequence!</div>
        <div style="display:flex; gap:1rem;">
            ${SEQ_COLORS.map((c,i) => `<div id="seq-btn-${i}" style="width:70px; height:70px; border-radius:16px; background:${c}; opacity:0.3; cursor:pointer; transition:0.2s;"></div>`).join('')}
        </div>
    `;
    let i = 0;
    const flash = () => {
        if (i < sequence.length) {
            const btn = document.getElementById(`seq-btn-${sequence[i]}`);
            if (btn) { btn.style.opacity = '1'; btn.style.transform = 'scale(1.1)'; }
            setTimeout(() => {
                if (btn) { btn.style.opacity = '0.3'; btn.style.transform = 'scale(1)'; }
                i++;
                setTimeout(flash, 400);
            }, 600);
        } else {
            promptSequenceInput(sequence);
        }
    };
    setTimeout(flash, 600);
}

function promptSequenceInput(sequence) {
    const arena = document.getElementById('game-arena');
    const player = [];
    gameState.startT = Date.now();

    const btnsHtml = SEQ_COLORS.map((c,i) =>
        `<div id="seq-play-${i}" style="width:70px; height:70px; border-radius:16px; background:${c}; opacity:0.6; cursor:pointer; transition:0.2s; user-select:none;" onclick="seqTap(${i})"></div>`
    ).join('');
    arena.innerHTML = `
        <div style="margin-bottom:1rem; color:var(--text-muted);">Repeat the sequence:</div>
        <div style="display:flex; gap:1rem; margin-bottom:1.5rem;">${btnsHtml}</div>
        <div id="seq-progress" style="font-family:var(--font-mono); color:var(--text-muted); font-size:0.8rem;">Step 1 of ${sequence.length}</div>
    `;

    window._seqPlayer = player;
    window._seqTarget = sequence;
}

function seqTap(idx) {
    const player = window._seqPlayer;
    const target = window._seqTarget;
    player.push(idx);

    const btn = document.getElementById(`seq-play-${idx}`);
    if (btn) { btn.style.opacity = '1'; btn.style.transform = 'scale(1.15)'; setTimeout(() => { btn.style.opacity = '0.6'; btn.style.transform = 'scale(1)'; }, 250); }

    document.getElementById('seq-progress').textContent = `Step ${player.length} of ${target.length}`;

    if (player.length === target.length) {
        const isCorrect = player.every((v,i) => v === target[i]);
        const time = Date.now() - gameState.startT;
        gameState.trials.push({ question: target, answer: player, correct: isCorrect, response_ms: time });
        if (isCorrect) { 
            gameState.score += 20; 
            toast('Correct sequence!', 'success');
            setTimeout(() => nextRound(), 500);
        }
        else { 
            showAnswerFeedback(false, player.join('→'), target.join('→'));
        }
    }
}

function checkPatternAnswer(selected) {
    const isCorrect = selected.length === gameState.current.length && 
                    selected.every(s => gameState.current.includes(s));
    
    const time = Date.now() - gameState.startT;
    
    gameState.trials.push({
        question: gameState.current,
        answer: selected,
        correct: isCorrect,
        response_ms: time
    });
    
    if (isCorrect) {
        gameState.score += 20;
        toast("Correct!", "success");
        setTimeout(() => nextRound(), 500);
    } else {
        showAnswerFeedback(false, selected.join(','), gameState.current.join(','));
    }
}

// Adaptive difficulty: adjust level based on performance
function adjustDifficulty() {
    const trials = gameState.trials;
    if (trials.length === 0) return;
    
    const minLevel = 1;
    const maxLevel = 10;
    
    // More responsive algorithm: weight recent trials heavily
    // Recent trials (last 2-3) have more impact on immediate adjustments
    const recentCount = Math.min(3, trials.length);
    const recentTrials = trials.slice(-recentCount);
    
    // Count correct vs incorrect in recent trials
    const recentCorrect = recentTrials.filter(t => t.correct).length;
    const lastTrial = recentTrials[recentTrials.length - 1];
    
    // If CURRENT answer was WRONG, prioritize difficulty reduction (unless just started)
    if (!lastTrial.correct && trials.length > 1) {
        // Current answer failed → decrease difficulty
        gameState.level = Math.max(gameState.level - 1, minLevel);
        showLevelModal('Level Decreased', gameState.level);
    } 
    // If last 2-3 answers were ALL correct, increase difficulty
    else if (recentCorrect === recentCount && recentCorrect >= 2) {
        // Consistent success → increase difficulty
        gameState.level = Math.min(gameState.level + 1, maxLevel);
        showLevelModal('Level Up!', gameState.level);
    }
    // Otherwise maintain current level (still learning)
}

async function nextRound() {
    gameState.round++;
    if (gameState.round > gameState.totalRounds) {
        finishGame();
    } else {
        // Adjust difficulty based on recent performance
        adjustDifficulty();
        // Wait for modal to be closed before continuing
        setTimeout(() => {
            updateGameStats();
            beginRound();
        }, 100);
    }
}

// ── LOCAL SESSION STORAGE ──
function saveSessionLocal(sessionData) {
    const sessions = JSON.parse(localStorage.getItem('nr_sessions') || '[]');
    sessions.push(sessionData);
    localStorage.setItem('nr_sessions', JSON.stringify(sessions));
}

function getAllSessions() {
    return JSON.parse(localStorage.getItem('nr_sessions') || '[]');
}

async function finishGame() {
    const arena = document.getElementById('game-arena');
    arena.innerHTML = `<div class="spinner"></div><p style="margin-top:1rem; color:var(--text-muted);">Analyzing your performance...</p>`;

    const trials = gameState.trials;
    const correct = trials.filter(t => t.correct).length;
    const total = trials.length;
    const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgMs = total > 0 ? Math.round(trials.reduce((a, t) => a + t.response_ms, 0) / total) : 0;
    const fastMs = total > 0 ? Math.min(...trials.map(t => t.response_ms)) : 0;
    const slowMs = total > 0 ? Math.max(...trials.map(t => t.response_ms)) : 0;

    // Streak analysis
    let streak = 0, maxStreak = 0, cur = 0;
    trials.forEach(t => { cur = t.correct ? cur + 1 : 0; maxStreak = Math.max(maxStreak, cur); });

    // Save to localStorage
    const sessionRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        type: gameState.type,
        level: gameState.level,
        score_pct: scorePct,
        correct_answers: correct,
        total_questions: total,
        avg_response_ms: avgMs,
        best_streak: maxStreak,
        trials: trials
    };
    saveSessionLocal(sessionRecord);

    // Generate rich dynamic feedback
    const allSessions = getAllSessions();
    const typeSessions = allSessions.filter(s => s.type === gameState.type);
    const feedback = generateDynamicFeedback(sessionRecord, typeSessions);

    showResults({ ...sessionRecord, ai_feedback: feedback, fast_ms: fastMs, slow_ms: slowMs, best_streak: maxStreak });

    // Silently try backend too
    try {
        const typeKey = { digit: 'digit_span', pattern: 'pattern_recall', word: 'word_recall', sequence: 'sequence_memory' }[gameState.type];
        await api.post('/api/sessions', { exercise_type: typeKey, difficulty_level: gameState.level, trial_data: trials });
    } catch { /* offline mode */ }
}

function generateDynamicFeedback(session, prevSessions) {
    const { score_pct: score, type, level, avg_response_ms: avgMs, best_streak, correct_answers, total_questions } = session;
    const nameMap = { digit: 'Digit Span', pattern: 'Pattern Recall', word: 'Word Recall', sequence: 'Sequence Memory' };
    const gameName = nameMap[type] || type;

    // Historical comparison
    const prev = prevSessions.slice(0, -1); // exclude current
    const prevAvg = prev.length > 0 ? Math.round(prev.reduce((a, s) => a + s.score_pct, 0) / prev.length) : null;
    const trend = prevAvg !== null ? score - prevAvg : null;

    // Difficulty progression analysis
    const trials = session.trials || [];
    let difficultyProgression = 'steady';
    if (trials.length > 0) {
        const recentSuccess = trials.slice(-2).filter(t => t.correct).length;
        const earlySuccess = trials.slice(0, 2).filter(t => t.correct).length;
        if (recentSuccess > earlySuccess) difficultyProgression = 'ramped-up';
        else if (recentSuccess < earlySuccess) difficultyProgression = 'scaled-back';
    }

    const difficultyNote = difficultyProgression === 'ramped-up' 
        ? `Your difficulty increased as you improved — the system pushed you to your edge.`
        : difficultyProgression === 'scaled-back'
        ? `Difficulty adjusted down as needed — the system maintained an optimal challenge level.`
        : `Difficulty remained balanced throughout — you matched the challenge pace well.`;

    // Rating
    let rating, ratingColor;
    if (score === 100)      { rating = 'PERFECT'; ratingColor = '#10b981'; }
    else if (score >= 80)   { rating = 'EXCELLENT'; ratingColor = '#10b981'; }
    else if (score >= 60)   { rating = 'GOOD'; ratingColor = '#0ea5e9'; }
    else if (score >= 40)   { rating = 'DEVELOPING'; ratingColor = '#f59e0b'; }
    else                    { rating = 'KEEP TRYING'; ratingColor = '#f43f5e'; }

    // Speed assessment
    const speed = avgMs < 2000 ? 'very fast' : avgMs < 4000 ? 'moderate' : 'deliberate';
    const speedTip = avgMs < 2000 ? 'Your quick responses suggest strong neural encoding.' :
                     avgMs < 4000 ? 'Your response pace shows careful information processing.' :
                     'Taking your time shows thoughtful recall — accuracy over speed is key early on.';

    // Streak insight
    const streakNote = best_streak >= total_questions ? 'You answered every round correctly in sequence — exceptional consistency!' :
                       best_streak >= Math.ceil(total_questions * 0.6) ? `Your best streak was ${best_streak} in a row — great momentum!` :
                       `Your best streak was ${best_streak}. Building consistency is your next target.`;

    // Improvement trend
    let trendNote = '';
    if (trend !== null) {
        if (trend > 10) trendNote = `📈 This is <strong>${trend}% better</strong> than your ${gameName} average (${prevAvg}%) — clear improvement!`;
        else if (trend > 0) trendNote = `Slightly above your average of ${prevAvg}% — you're on the right track.`;
        else if (trend === 0) trendNote = `Consistent with your average of ${prevAvg}%.`;
        else trendNote = `📉 Below your average of ${prevAvg}%. Try a lower difficulty and build back up.`;
    } else {
        trendNote = `🆕 This is your first ${gameName} session — great start!`;
    }

    // Domain-specific insight
    const domainInsight = {
        digit:    `Digit Span tests <strong>working memory capacity</strong> — your brain's mental whiteboard. ${score >= 60 ? 'Your performance shows solid short-term retention.' : 'Practice chunking numbers into groups of 2-3 to improve recall.'}`,
        pattern:  `Pattern Recall targets <strong>visuospatial memory</strong>. ${score >= 60 ? 'Your spatial encoding is functioning well.' : 'Try mentally labelling grid positions (e.g. "top-left") as you watch.'}`,
        word:     `Word Recall exercises <strong>episodic and semantic memory</strong>. ${score >= 60 ? 'Your verbal retention is strong.' : 'Group words into categories as a memorization strategy.'}`,
        sequence: `Sequence Memory trains <strong>procedural and working memory</strong>. ${score >= 60 ? 'Your ability to hold ordered patterns is solid.' : 'Whisper the sequence aloud as you watch — auditory encoding helps.'}`
    }[type] || '';

    // Recommendation
    const nextStep = score === 100 ? `Try <strong>Level ${level + 1}</strong> next to challenge yourself further.` :
                     score >= 70  ? `You're ready to attempt <strong>Level ${Math.min(level + 1, 10)}</strong>.` :
                     score >= 50  ? `Stay at <strong>Level ${level}</strong> and aim for consistency before advancing.` :
                     `Practice <strong>Level ${Math.max(level - 1, 1)}</strong> to build confidence.`;

    return `
        <div style="margin-bottom:1rem;">
            <span style="background:${ratingColor}22; color:${ratingColor}; font-family:var(--font-mono); font-size:0.7rem; padding:2px 10px; border-radius:100px; border:1px solid ${ratingColor}44;">${rating}</span>
        </div>
        <p style="margin-bottom:0.75rem;">You scored <strong>${score}%</strong> (${correct_answers}/${total_questions} correct) at <strong>${speed} speed</strong> (avg ${(avgMs/1000).toFixed(1)}s). ${speedTip}</p>
        <p style="margin-bottom:0.75rem;"><strong>Adaptive Difficulty:</strong> ${difficultyNote}</p>
        <p style="margin-bottom:0.75rem;">${streakNote}</p>
        <p style="margin-bottom:0.75rem;">${domainInsight}</p>
        <p style="margin-bottom:0.75rem; color:var(--text-muted);">${trendNote}</p>
        <p style="background:rgba(16,185,129,0.08); padding:0.75rem 1rem; border-radius:10px; border-left:3px solid var(--cognitive); margin-top:0.75rem;">💡 <strong>Next Step:</strong> ${nextStep}</p>
    `;
}

function showResults(session) {
    showView('results');
    const nameMap = { digit: 'Digit Span', pattern: 'Pattern Recall', word: 'Word Recall', sequence: 'Sequence Memory' };
    const score = session.score_pct;

    // Score circle color
    const circleColor = score >= 80 ? 'var(--cognitive)' : score >= 60 ? 'var(--physical)' : score >= 40 ? 'var(--warn)' : 'var(--danger)';
    document.getElementById('res-score').textContent = score + '%';
    document.getElementById('res-score').style.color = circleColor;
    const circle = document.getElementById('res-score').closest('div');
    if (circle) circle.style.borderColor = circleColor;

    // Title based on performance
    const titles = { perfect: 'Outstanding!', excellent: 'Excellent Work!', good: 'Good Job!', developing: 'Keep Going!', low: 'Don\'t Give Up!' };
    const titleKey = score === 100 ? 'perfect' : score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'developing' : 'low';
    document.getElementById('res-title').textContent = titles[titleKey];

    document.getElementById('res-type').textContent = nameMap[gameState.type] || gameState.type;
    document.getElementById('res-correct').textContent = `${session.correct_answers}/${session.total_questions}`;
    document.getElementById('res-diff').textContent = `Level ${gameState.level}`;
    document.getElementById('res-time').textContent = (session.avg_response_ms / 1000).toFixed(1) + 's avg';

    // Extra stats in breakdown
    const breakdown = document.getElementById('res-breakdown');
    if (breakdown) {
        const streakDiv = breakdown.querySelector('#res-streak-cell') || (() => {
            const d = document.createElement('div');
            d.id = 'res-streak-cell';
            d.style.cssText = 'background:var(--glass); padding:1rem; border-radius:12px;';
            breakdown.appendChild(d);
            return d;
        })();
        streakDiv.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); display:block;">BEST STREAK</span><span style="font-weight:500;">${session.best_streak || 0} in a row</span>`;

        const speedDiv = breakdown.querySelector('#res-speed-cell') || (() => {
            const d = document.createElement('div');
            d.id = 'res-speed-cell';
            d.style.cssText = 'background:var(--glass); padding:1rem; border-radius:12px;';
            breakdown.appendChild(d);
            return d;
        })();
        speedDiv.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); display:block;">SPEED</span><span style="font-weight:500;">${session.fast_ms ? (session.fast_ms/1000).toFixed(1)+'s best' : '—'}</span>`;
    }

    // Difficulty progression visualization
    drawDifficultyProgression(gameState.trials);

    document.getElementById('res-ai-feedback').innerHTML = `
        <div style="font-size:0.75rem; font-family:var(--font-mono); color:var(--cognitive); margin-bottom:0.75rem; letter-spacing:0.1em; color:#99ad7a;">AI PERFORMANCE ANALYSIS</div>
        ${session.ai_feedback}
    `;
    document.getElementById('res-retry-btn').onclick = () => startExercise(gameState.type);

    // Draw round-by-round mini chart
    drawRoundChart();

    gsap.from('#view-results .glass-card', { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });
}

function drawDifficultyProgression(trials) {
    // Find or create container for difficulty progression
    let container = document.getElementById('res-difficulty-progression');
    if (!container) {
        container = document.createElement('div');
        container.id = 'res-difficulty-progression';
        const feedbackDiv = document.getElementById('res-ai-feedback');
        feedbackDiv.parentNode.insertBefore(container, feedbackDiv);
    }

    // Track difficulty changes during game (start at initial level, track changes)
    const difficultyTimeline = [];
    let currentLevel = gameState.level; // Final level
    
    // Work backwards from final level to determine progression
    // Since adjustDifficulty was called each round, reconstruct path
    if (trials.length > 0) {
        // Simple heuristic: if later trials have more successes, level probably increased
        const firstHalf = trials.slice(0, Math.ceil(trials.length / 2));
        const secondHalf = trials.slice(Math.ceil(trials.length / 2));
        const firstSuccess = firstHalf.filter(t => t.correct).length / firstHalf.length;
        const secondSuccess = secondHalf.filter(t => t.correct).length / secondHalf.length;
        
        // Estimate if difficulty ramped up/down
        let estimatedStartLevel = currentLevel;
        if (secondSuccess > firstSuccess + 0.2) {
            estimatedStartLevel = currentLevel - 1; // Level increased
        } else if (secondSuccess < firstSuccess - 0.2) {
            estimatedStartLevel = currentLevel + 1; // Level decreased
        }
        estimatedStartLevel = Math.max(1, Math.min(10, estimatedStartLevel));

        // Create timeline visualization
        const progression = estimatedStartLevel <= currentLevel ? 
            `Level ${estimatedStartLevel} → Level ${currentLevel}` :
            `Level ${estimatedStartLevel} → Level ${currentLevel}`;
        
        const arrow = estimatedStartLevel < currentLevel ? '📈' : estimatedStartLevel > currentLevel ? '📉' : '➡️';
        const progressionColor = estimatedStartLevel < currentLevel ? '#10b981' : estimatedStartLevel > currentLevel ? '#f59e0b' : '#64748b';
        const progressionLabel = estimatedStartLevel < currentLevel ? 'Ramped Up' : estimatedStartLevel > currentLevel ? 'Scaled Back' : 'Steady';

        container.innerHTML = `
            <div style="background:rgba(59, 130, 246, 0.08); padding:1rem; border-radius:12px; border-left:3px solid var(--primary); margin-bottom:1.5rem;">
                <div style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.1em;">⚙️ Difficulty Progression</div>
                <div style="display:flex; align-items:center; gap:1rem; justify-content:space-between;">
                    <div>
                        <div style="font-size:1.8rem; font-weight:700; color:${progressionColor};">${arrow} ${progressionLabel}</div>
                        <div style="font-size:0.9rem; color:var(--text-muted); margin-top:0.25rem;">${progression}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.5rem; font-weight:700; color:`;
        
        if (estimatedStartLevel < currentLevel) {
            container.innerHTML += `var(--cognitive);">+${currentLevel - estimatedStartLevel}</div>`;
        } else if (estimatedStartLevel > currentLevel) {
            container.innerHTML += `var(--warn);">−${estimatedStartLevel - currentLevel}</div>`;
        } else {
            container.innerHTML += `#64748b;">0</div>`;
        }
        
        container.innerHTML += `
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">Levels Gained</div>
                    </div>
                </div>
            </div>
        `;
    }
}

function drawRoundChart() {
    const canvasId = 'res-round-chart';
    let canvas = document.getElementById(canvasId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.height = 80;
        canvas.style.cssText = 'width:100%; margin-bottom:1.5rem; border-radius:8px;';
        const feedbackDiv = document.getElementById('res-ai-feedback');
        feedbackDiv.parentNode.insertBefore(canvas, feedbackDiv);
    }
    if (window._roundChartInst) window._roundChartInst.destroy();
    const labels = gameState.trials.map((_, i) => `R${i + 1}`);
    const data   = gameState.trials.map(t => t.correct ? 100 : 0);
    const colors = data.map(v => v ? 'rgba(16,185,129,0.8)' : 'rgba(244,63,94,0.6)');
    window._roundChartInst = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Result', data, backgroundColor: colors, borderRadius: 6 }] },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw === 100 ? '✓ Correct' : '✗ Wrong' } } },
            scales: {
                y: { min: 0, max: 100, display: false },
                x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } }
            },
            animation: { duration: 600 }
        }
    });
}

// ── PROGRESS LOGIC (localStorage-based) ──
let weeklyChartInst = null;
let radarChartInst = null;

function loadProgress() {
    const sessions = getAllSessions();

    if (sessions.length === 0) {
        document.getElementById('prog-best').textContent = '—';
        document.getElementById('prog-trend').textContent = '—';
        document.getElementById('prog-index').textContent = '—';
        document.getElementById('prog-time').textContent = '—';
        renderEmptyCharts();
        document.getElementById('history-body').innerHTML =
            `<tr><td colspan="5" style="padding:2rem; text-align:center; color:var(--text-dim);">No sessions yet — play a game to see your analytics!</td></tr>`;
        return;
    }

    // ── STATS ──
    const scores = sessions.map(s => s.score_pct);
    const bestScore = Math.max(...scores);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const totalTime = sessions.length * 5; // ~5 min per session

    // Trend: compare last 3 vs previous 3
    let trend = null;
    if (sessions.length >= 2) {
        const recent3 = sessions.slice(-3).map(s => s.score_pct);
        const prev3   = sessions.slice(-6, -3).map(s => s.score_pct);
        const recentAvg = recent3.reduce((a,b)=>a+b,0)/recent3.length;
        const prevAvg   = prev3.length ? prev3.reduce((a,b)=>a+b,0)/prev3.length : recentAvg;
        trend = Math.round(recentAvg - prevAvg);
    }

    // Composite Memory Index (0–100)
    const typeScores = { digit: [], pattern: [], word: [], sequence: [] };
    sessions.forEach(s => { if (typeScores[s.type]) typeScores[s.type].push(s.score_pct); });
    const domainAvgs = Object.values(typeScores).map(arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
    const playedDomains = domainAvgs.filter(v => v > 0);
    const compositeIndex = playedDomains.length ? Math.round(playedDomains.reduce((a,b)=>a+b,0)/playedDomains.length) : 0;

    document.getElementById('prog-best').textContent  = bestScore + '%';
    document.getElementById('prog-trend').textContent = trend !== null ? (trend >= 0 ? '+' + trend + '%' : trend + '%') : (avgScore + '%');
    document.getElementById('prog-index').textContent = compositeIndex;
    document.getElementById('prog-time').textContent  = totalTime + 'm';

    // ── SESSION HISTORY CHART (last 15 sessions) ──
    const last15 = sessions.slice(-15);
    const lineLabels = last15.map((s, i) => `#${sessions.length - last15.length + i + 1}`);
    const lineData   = last15.map(s => s.score_pct);
    const lineColors = lineData.map(v => v >= 70 ? '#10b981' : v >= 50 ? '#0ea5e9' : '#f59e0b');

    const ctx1 = document.getElementById('weeklyChart').getContext('2d');
    if (weeklyChartInst) weeklyChartInst.destroy();
    weeklyChartInst = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: lineLabels,
            datasets: [{
                label: 'Score %',
                data: lineData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.08)',
                pointBackgroundColor: lineColors,
                pointRadius: 5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + '%' } } },
            scales: {
                y: { min: 0, max: 100, ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#64748b' }, grid: { display: false } }
            }
        }
    });

    // ── DOMAIN RADAR ──
    const radarData = [
        typeScores.digit.length   ? Math.round(typeScores.digit.reduce((a,b)=>a+b,0)/typeScores.digit.length)       : 0,
        typeScores.pattern.length ? Math.round(typeScores.pattern.reduce((a,b)=>a+b,0)/typeScores.pattern.length)   : 0,
        typeScores.word.length    ? Math.round(typeScores.word.reduce((a,b)=>a+b,0)/typeScores.word.length)         : 0,
        typeScores.sequence.length? Math.round(typeScores.sequence.reduce((a,b)=>a+b,0)/typeScores.sequence.length) : 0
    ];

    const ctx2 = document.getElementById('radarChart').getContext('2d');
    if (radarChartInst) radarChartInst.destroy();
    radarChartInst = new Chart(ctx2, {
        type: 'radar',
        data: {
            labels: ['Working\nMemory', 'Visual\nSpatial', 'Episodic\nMemory', 'Procedural\nMemory'],
            datasets: [{
                data: radarData,
                borderColor: '#a78bfa',
                backgroundColor: 'rgba(167,139,250,0.15)',
                borderWidth: 2,
                pointBackgroundColor: '#a78bfa',
                pointRadius: 4,
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + '%' } } },
            scales: {
                r: {
                    min: 0, max: 100, ticks: { display: false, stepSize: 25 },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#94a3b8', font: { size: 11 } }
                }
            }
        }
    });

    // ── HISTORY TABLE ──
    const tbody = document.getElementById('history-body');
    const nameMap = { digit: 'Digit Span', pattern: 'Pattern Recall', word: 'Word Recall', sequence: 'Sequence Memory' };
    const sorted = [...sessions].reverse().slice(0, 20);
    tbody.innerHTML = sorted.map(s => {
        const date   = new Date(s.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
        const status = s.score_pct >= 80 ? 'EXCELLENT' : s.score_pct >= 60 ? 'GOOD' : s.score_pct >= 40 ? 'DEVELOPING' : 'KEEP TRYING';
        const color  = s.score_pct >= 80 ? 'var(--success)' : s.score_pct >= 60 ? 'var(--physical)' : s.score_pct >= 40 ? 'var(--warn)' : 'var(--danger)';
        const bar    = `<div style="height:4px; width:${s.score_pct}%; background:${color}; border-radius:2px; margin-top:4px;"></div>`;
        return `
            <tr style="border-bottom:1px solid var(--glass-border); font-size:0.88rem;">
                <td style="padding:0.85rem 1rem; color:var(--text-dim);">${date}</td>
                <td style="padding:0.85rem 1rem; font-weight:500;">${nameMap[s.type] || s.type}</td>
                <td style="padding:0.85rem 1rem; font-family:var(--font-mono);">${s.score_pct}%${bar}</td>
                <td style="padding:0.85rem 1rem;">Lvl ${s.level}</td>
                <td style="padding:0.85rem 1rem;"><span style="font-size:0.68rem; color:${color}; font-weight:700; letter-spacing:0.05em;">${status}</span></td>
            </tr>`;
    }).join('');

    // ── PROGRESS INSIGHTS (below charts) ──
    renderProgressInsights(sessions, typeScores, compositeIndex);
}

function renderProgressInsights(sessions, typeScores, index) {
    let el = document.getElementById('progress-insights');
    if (!el) {
        el = document.createElement('div');
        el.id = 'progress-insights';
        const histSection = document.getElementById('history-body');
        if (histSection) histSection.closest('section, div[style]')?.parentNode?.insertBefore(el, histSection.closest('section, div[style]'));
    }

    const nameMap = { digit: 'Digit Span', pattern: 'Pattern Recall', word: 'Word Recall', sequence: 'Sequence Memory' };
    const bestDomain = Object.entries(typeScores)
        .filter(([,arr]) => arr.length > 0)
        .map(([key, arr]) => ({ key, avg: arr.reduce((a,b)=>a+b,0)/arr.length }))
        .sort((a,b) => b.avg - a.avg)[0];
    const weakDomain = Object.entries(typeScores)
        .filter(([,arr]) => arr.length > 0)
        .map(([key, arr]) => ({ key, avg: arr.reduce((a,b)=>a+b,0)/arr.length }))
        .sort((a,b) => a.avg - b.avg)[0];

    const indexComment = index >= 80 ? 'Elite cognitive performance 🏆' :
                         index >= 60 ? 'Above average memory function 🌟' :
                         index >= 40 ? 'Building baseline memory capacity 📈' :
                                       'Early stage — keep practising daily';
    el.style.cssText = 'grid-column:1/-1; background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.15); border-radius:16px; padding:1.5rem 2rem; margin:1.5rem 0;';
    el.innerHTML = `
        <div style="font-size:0.7rem; font-family:var(--font-mono); color:var(--cognitive); margin-bottom:1rem; letter-spacing:0.12em; color:#99ad7a;">AI COGNITIVE REPORT</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:1rem; font-size:0.9rem;">
            <div><strong>Memory Index: ${index}/100</strong><br/><span style="color:var(--text-muted); font-size:0.82rem;">${indexComment}</span></div>
            ${bestDomain ? `<div><strong>Strongest: ${nameMap[bestDomain.key]}</strong><br/><span style="color:var(--text-muted); font-size:0.82rem;">Avg ${Math.round(bestDomain.avg)}% — keep pushing this domain</span></div>` : ''}
            ${weakDomain && weakDomain.key !== bestDomain?.key ? `<div><strong>Focus Area: ${nameMap[weakDomain.key]}</strong><br/><span style="color:var(--text-muted); font-size:0.82rem;">Avg ${Math.round(weakDomain.avg)}% — extra practice recommended</span></div>` : ''}
            <div><strong>${sessions.length} Sessions Completed</strong><br/><span style="color:var(--text-muted); font-size:0.82rem;">Consistency is the #1 factor in improvement</span></div>
        </div>`;
}

function renderEmptyCharts() {
    ['weeklyChart','radarChart'].forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Play games to see your chart', canvas.width/2, canvas.height/2);
    });
}

// ── GAMES ANALYTICS ──
let gameCharts = {};

async function loadExercises() {
    try {
        const data = await api.get('/api/progress/games-analysis');
        displayGameAnalytics(data);
    } catch (e) {
        // Fallback: calculate game analytics from localStorage
        console.log("Backend unavailable, using localStorage for game analytics");
        const sessions = getAllSessions();
        
        if (sessions.length === 0) {
            const container = document.getElementById('games-analytics');
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:3rem;">
                    <p>No game data yet. Start a game to see analytics!</p>
                </div>
            `;
            return;
        }

        // Group sessions by game type
        const gameTypes = { digit: [], pattern: [], word: [], sequence: [] };
        sessions.forEach(s => {
            if (gameTypes[s.type]) gameTypes[s.type].push(s);
        });

        const games = [];
        const typeInfo = {
            digit:    { name: 'Digit Span', icon: '📌', display: 'digit_span' },
            pattern:  { name: 'Pattern Recall', icon: '🟪', display: 'pattern_recall' },
            word:     { name: 'Word Recall', icon: '≣', display: 'word_recall' },
            sequence: { name: 'Sequence Memory', icon: '🎮', display: 'sequence_memory' }
        };

        Object.entries(gameTypes).forEach(([type, typeSessions]) => {
            if (typeSessions.length > 0) {
                const scores = typeSessions.map(s => s.score_pct);
                const avgScore = scores.reduce((a,b) => a+b) / scores.length;
                const bestScore = Math.max(...scores);
                const worstScore = Math.min(...scores);
                const improvementPct = (bestScore - worstScore) / worstScore * 100;
                
                games.push({
                    exercise_type: typeInfo[type].display,
                    display_name: typeInfo[type].name,
                    icon: typeInfo[type].icon,
                    total_sessions: typeSessions.length,
                    avg_score: avgScore,
                    best_score: bestScore,
                    worst_score: worstScore,
                    improvement_pct: improvementPct,
                    recent_scores: typeSessions.slice(-10).map(s => s.score_pct)
                });
            }
        });

        displayGameAnalytics({ games });
    }
}

function displayGameAnalytics(data) {
    const container = document.getElementById('games-analytics');
    
    if (!data.games || data.games.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:3rem;">
                <p>No game data yet. Start a game to see analytics!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = data.games.map((game, idx) => {
        const chartId = `game-chart-${idx}`;
        return `
            <div class="glass-card" style="background:var(--surface); border:1px solid var(--glass-border); border-radius:24px; padding:2rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
                    <div>
                        <h3 style="font-family:var(--font-display); font-size:1.5rem; margin-bottom:0.5rem;">
                            <span style="font-size:1.8rem; margin-right:0.5rem;">${game.icon}</span>${game.display_name}
                        </h3>
                        <p style="color:var(--text-muted); font-size:0.85rem;">
                            ${game.total_sessions} session${game.total_sessions !== 1 ? 's' : ''} completed
                        </p>
                    </div>
                    <button class="btn btn-primary" style="padding:0.6rem 1.5rem; font-size:0.9rem;" onclick="startExercise('${game.exercise_type.split('_')[0]}')">
                        Play Now
                    </button>
                </div>

                <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:1rem; margin-bottom:2rem;">
                    <div style="background:rgba(16,185,129,0.1); border:1px solid var(--glass-border); border-radius:16px; padding:1rem;">
                        <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Average Score</div>
                        <div style="font-size:2rem; font-weight:700; color:var(--success);">${game.avg_score.toFixed(0)}%</div>
                    </div>
                    <div style="background:rgba(16,185,129,0.1); border:1px solid var(--glass-border); border-radius:16px; padding:1rem;">
                        <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Best Score</div>
                        <div style="font-size:2rem; font-weight:700; color:var(--cognitive);">${game.best_score.toFixed(0)}%</div>
                    </div>
                    <div style="background:rgba(107,114,128,0.1); border:1px solid var(--glass-border); border-radius:16px; padding:1rem;">
                        <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Improvement</div>
                        <div style="font-size:2rem; font-weight:700; color:${game.improvement_pct >= 0 ? 'var(--success)' : 'var(--warn)'};">
                            ${game.improvement_pct >= 0 ? '+' : ''}${game.improvement_pct.toFixed(0)}%
                        </div>
                    </div>
                    <div style="background:rgba(107,114,128,0.1); border:1px solid var(--glass-border); border-radius:16px; padding:1rem;">
                        <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Worst Score</div>
                        <div style="font-size:2rem; font-weight:700; color:#f87171;">${game.worst_score.toFixed(0)}%</div>
                    </div>
                </div>

                <div style="background:var(--glass); border:1px solid var(--glass-border); border-radius:16px; padding:1.5rem; margin-bottom:1.5rem;">
                    <canvas id="${chartId}" height="150"></canvas>
                </div>

                <div id="ai-analysis-${game.exercise_type}" style="min-height:100px; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.9rem;">
                    <span>Loading AI analysis...</span>
                </div>
            </div>
        `;
    }).join('');

    // Create charts after rendering
    data.games.forEach((game, idx) => {
        if (game.recent_scores && game.recent_scores.length > 0) {
            const chartId = `game-chart-${idx}`;
            const ctx = document.getElementById(chartId).getContext('2d');
            
            if (gameCharts[chartId]) gameCharts[chartId].destroy();
            
            gameCharts[chartId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: game.recent_scores.map((_, i) => `#${i+1}`),
                    datasets: [{
                        label: 'Score',
                        data: game.recent_scores,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981'
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { min: 0, max: 100, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#64748b' }, grid: { display: false } }
                    }
                }
            });
        }
    });

    // Load AI analysis for each game (non-blocking)
    data.games.forEach(game => {
        loadGameAIAnalysis(game.exercise_type);
    });
}

// Load and display AI analysis for a specific game
async function loadGameAIAnalysis(exerciseType) {
    try {
        const analysis = await api.get(`/api/progress/ai-game-analysis/${exerciseType}`);
        
        if (analysis.error) return; // No data for this game yet
        
        const container = document.getElementById(`ai-analysis-${exerciseType}`);
        if (!container) return;
        
        container.innerHTML = `
            <div style="border-top:1px solid var(--glass-border); padding-top:1.5rem; margin-top:1.5rem;">
                <h4 style="font-family:var(--font-mono); font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:1rem;">AI ANALYSIS</h4>
                
                <div style="background:rgba(10,185,129,0.05); border-left:3px solid var(--cognitive); border-radius:8px; padding:1rem; margin-bottom:0.8rem;">
                    <p style="font-size:0.9rem; color:white; margin:0;">
                        <strong>Insights:</strong><br/>
                        ${analysis.insights || 'No insights available yet'}
                    </p>
                </div>
                
                <div style="background:rgba(167,139,250,0.05); border-left:3px solid #a78bfa; border-radius:8px; padding:1rem; margin-bottom:0.8rem;">
                    <p style="font-size:0.9rem; color:white; margin:0;">
                        <strong>💡 Recommendations:</strong><br/>
                        ${analysis.recommendations || 'Keep practicing consistently'}
                    </p>
                </div>
                
                <div style="background:rgba(167,139,250,0.05); border-left:3px solid #fb923c; border-radius:8px; padding:1rem;">
                    <p style="font-size:0.9rem; color:white; margin:0;">
                        <strong>Next Steps:</strong><br/>
                        ${analysis.next_steps || 'Continue your progress'}
                    </p>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('AI analysis error:', e);
    }
}

// Ensure loader is hidden!
const forceHideLoader = () => {
    const l = document.getElementById('loader');
    if (l) {
        l.style.display = 'none';
        l.style.opacity = '0';
        l.style.visibility = 'hidden';
        l.style.pointerEvents = 'none';
    }
};

window.addEventListener('load', () => {
    forceHideLoader();
    showView('exercises');
    window.scrollTo(0,0);
});

document.addEventListener('DOMContentLoaded', () => {
    forceHideLoader();
    showView('exercises');
    window.scrollTo(0,0);
});

setTimeout(() => {
    forceHideLoader();
    showView('exercises');
}, 50);

setTimeout(() => {
    forceHideLoader();
    showView('exercises');
}, 250);

setTimeout(() => {
    forceHideLoader();
}, 2000);
