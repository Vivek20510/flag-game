import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const RESTCOUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=name,flags,cca2,region,capital";

const MODE_CONFIG = {
  classic:   { label: "CLASSIC",   icon: "🎯", timePerQ: 12, lives: null,  totalQ: 10, scoreBase: 100 },
  lightning: { label: "LIGHTNING", icon: "⚡", timePerQ: 5,  lives: null,  totalQ: 60, scoreBase: 150, globalTime: 60 },
  survival:  { label: "SURVIVAL",  icon: "❤️", timePerQ: 10, lives: 3,     totalQ: 999,scoreBase: 120 },
  hard:      { label: "HARD",      icon: "💀", timePerQ: 8,  lives: null,  totalQ: 15, scoreBase: 200 },
};

const STREAK_THRESHOLDS = [3, 5, 10, 15];

// ─── Utility ──────────────────────────────────────────────────────────────────
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// ─── Sound Engine (Web Audio API) ────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const getAudio = () => { if (!audioCtx) audioCtx = new AudioCtx(); return audioCtx; };

const playTone = (freq, type, duration, vol = 0.3, delay = 0) => {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  } catch {}
};

const SFX = {
  correct:  () => { playTone(523, 'sine', 0.1, 0.25); playTone(659, 'sine', 0.1, 0.25, 0.1); playTone(784, 'sine', 0.15, 0.3, 0.2); },
  wrong:    () => { playTone(200, 'sawtooth', 0.2, 0.2); playTone(150, 'sawtooth', 0.2, 0.2, 0.1); },
  streak:   () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.12,0.3,i*0.07)); },
  timeout:  () => { playTone(300, 'triangle', 0.3, 0.2); },
  gameover: () => { [400,350,300,250].forEach((f,i) => playTone(f,'sawtooth',0.2,0.2,i*0.12)); },
  tick:     () => { playTone(1000, 'square', 0.04, 0.08); },
};

// ─── Particle Burst ───────────────────────────────────────────────────────────
function ParticleBurst({ active, correct, x, y }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cx = x || canvas.width / 2;
    const cy = y || canvas.height / 2;
    const color = correct ? ['#00ffb3','#00e5ff','#fff'] : ['#ff4466','#ff8800','#fff'];
    const particles = Array.from({length: correct ? 30 : 15}, () => ({
      x: cx, y: cy,
      vx: (Math.random()-0.5) * (correct ? 14 : 8),
      vy: (Math.random()-0.5) * (correct ? 14 : 8),
      r: Math.random() * (correct ? 6 : 4) + 2,
      color: color[Math.floor(Math.random()*color.length)],
      alpha: 1, life: 1,
    }));
    let animId;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.3;
        p.life -= 0.035; p.alpha = p.life;
        if (p.life > 0) {
          alive = true;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
          ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (alive) animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [active, correct, x, y]);
  return <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:50}} />;
}

// ─── Ring Timer ───────────────────────────────────────────────────────────────
function RingTimer({ timeLeft, maxTime, urgent }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = clamp(timeLeft / maxTime, 0, 1);
  const dash = circ * pct;
  const color = timeLeft <= 3 ? '#ff4466' : timeLeft <= 5 ? '#ff8800' : '#00ffb3';
  return (
    <svg width="110" height="110" style={{filter: urgent ? `drop-shadow(0 0 12px ${color})` : 'none', transition:'filter 0.3s'}}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{transition:'stroke-dasharray 0.9s linear, stroke 0.3s'}}
      />
      <text x="55" y="60" textAnchor="middle"
        style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'28px',fill:color,fontWeight:'700'}}>
        {timeLeft}
      </text>
    </svg>
  );
}

// ─── Lives Display ────────────────────────────────────────────────────────────
function Lives({ lives, maxLives = 3 }) {
  return (
    <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
      {Array.from({length: maxLives}, (_,i) => (
        <span key={i} style={{
          fontSize:'1.3rem', filter: i < lives ? 'none' : 'grayscale(1) opacity(0.25)',
          transition:'all 0.3s', transform: i < lives ? 'scale(1)' : 'scale(0.8)',
        }}>❤️</span>
      ))}
    </div>
  );
}

// ─── Streak Badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (streak < 2) return null;
  const fire = streak >= 10 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : '🔥';
  const multi = streak >= 15 ? '4x' : streak >= 10 ? '3x' : streak >= 5 ? '2x' : `${streak}`;
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:'6px',
      padding:'6px 14px',borderRadius:'20px',
      background:'linear-gradient(135deg,rgba(255,140,0,0.2),rgba(255,68,102,0.15))',
      border:'1px solid rgba(255,140,0,0.4)',
      animation: streak >= 5 ? 'streakPulse 0.8s ease infinite alternate' : 'none',
    }}>
      <span style={{fontSize:'1rem'}}>{fire}</span>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'#ff8800',letterSpacing:'1px'}}>
        STREAK {multi}
      </span>
    </div>
  );
}

// ─── Score Pop ────────────────────────────────────────────────────────────────
function ScorePop({ value, visible }) {
  return (
    <div style={{
      position:'absolute',top:'-30px',left:'50%',transform:'translateX(-50%)',
      fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.8rem',
      color: value > 0 ? '#00ffb3' : '#ff4466',
      opacity: visible ? 1 : 0, transition:'opacity 0.3s',
      pointerEvents:'none', textShadow:'0 0 20px currentColor',
      letterSpacing:'2px', whiteSpace:'nowrap',
    }}>
      {value > 0 ? `+${value}` : '✗ MISS'}
    </div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────
export default function Game({ config, onGameEnd, onHome }) {
  // config = { username, gameMode, flagCount }
  const { username = "Player", gameMode = "classic", flagCount = 10 } = config || {};
  const modeConfig = MODE_CONFIG[gameMode] || MODE_CONFIG.classic;

  // ── State ──
  const [phase, setPhase]               = useState("loading"); // loading | reveal | playing | feedback | gameover
  const [countries, setCountries]       = useState([]);
  const [usedIds, setUsedIds]           = useState(new Set());
  const [currentCountry, setCurrentCountry] = useState(null);
  const [options, setOptions]           = useState([]);
  const [selected, setSelected]         = useState(null);
  const [isCorrect, setIsCorrect]       = useState(null);
  const [score, setScore]               = useState(0);
  const [questionNum, setQuestionNum]   = useState(0);
  const [streak, setStreak]             = useState(0);
  const [bestStreak, setBestStreak]     = useState(0);
  const [lives, setLives]               = useState(modeConfig.lives || 3);
  const [timeLeft, setTimeLeft]         = useState(modeConfig.timePerQ);
  const [globalTime, setGlobalTime]     = useState(modeConfig.globalTime || null);
  const [flagBlur, setFlagBlur]         = useState(8);
  const [scorePopVal, setScorePopVal]   = useState(0);
  const [scorePopVisible, setScorePopVisible] = useState(false);
  const [burst, setBurst]               = useState({ active: false, correct: false });
  const [history, setHistory]           = useState([]); // {country, correct, score}
  const [totalQuestions, setTotalQuestions] = useState(flagCount || modeConfig.totalQ);
  const [loadError, setLoadError]       = useState(false);
  const [flagRevealPct, setFlagRevealPct] = useState(0);

  const timerRef    = useRef(null);
  const globalRef   = useRef(null);
  const blurRef     = useRef(null);
  const feedbackRef = useRef(null);

  // ── Load country data ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(RESTCOUNTRIES_URL);
        const data = await res.json();
        // Filter to countries with good flag data and real names
        const valid = data.filter(c =>
          c.flags?.svg && c.name?.common && c.name.common.length < 30
        );
        if (!cancelled) {
          setCountries(shuffle(valid));
          setPhase("reveal");
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Pick next question ──
  const pickQuestion = useCallback((allCountries, used) => {
    const pool = allCountries.filter(c => !used.has(c.cca2));
    if (pool.length < 4) return null;
    const correct = pool[Math.floor(Math.random() * pool.length)];
    // Smart wrong options: prefer same region for harder feel
    const sameRegion = pool.filter(c => c.cca2 !== correct.cca2 && c.region === correct.region);
    const other = pool.filter(c => c.cca2 !== correct.cca2 && c.region !== correct.region);
    const wrongPool = sameRegion.length >= 3
      ? shuffle(sameRegion)
      : shuffle([...sameRegion, ...other]);
    const wrongs = wrongPool.slice(0, 3);
    return { country: correct, options: shuffle([correct, ...wrongs]).map(c => c.name.common) };
  }, []);

  // ── Start question ──
  const startQuestion = useCallback((allCountries, used) => {
    const q = pickQuestion(allCountries, used);
    if (!q) { endGame("no_flags"); return; }
    setCurrentCountry(q.country);
    setOptions(q.options);
    setSelected(null);
    setIsCorrect(null);
    setFlagBlur(8);
    setFlagRevealPct(0);
    setPhase("reveal");

    // Animate flag reveal: blur decreases over 1.5s
    let blur = 8;
    let pct = 0;
    clearInterval(blurRef.current);
    blurRef.current = setInterval(() => {
      blur = Math.max(0, blur - 0.5);
      pct = Math.min(100, pct + 6.7);
      setFlagBlur(blur);
      setFlagRevealPct(pct);
      if (blur <= 0) {
        clearInterval(blurRef.current);
        setPhase("playing");
        startTimer(modeConfig.timePerQ);
      }
    }, 100);

    setUsedIds(prev => new Set([...prev, q.country.cca2]));
  }, [pickQuestion, modeConfig.timePerQ]);

  // ── Timer logic ──
  const startTimer = (seconds) => {
    clearInterval(timerRef.current);
    setTimeLeft(seconds);
    let t = seconds;
    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 3) SFX.tick();
      if (t <= 0) {
        clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 1000);
  };

  // Global timer for lightning mode
  useEffect(() => {
    if (gameMode !== "lightning" || !modeConfig.globalTime) return;
    let g = modeConfig.globalTime;
    globalRef.current = setInterval(() => {
      g--;
      setGlobalTime(g);
      if (g <= 0) { clearInterval(globalRef.current); endGame("time_up"); }
    }, 1000);
    return () => clearInterval(globalRef.current);
  }, [gameMode]);

  // ── Begin first question once countries loaded ──
  useEffect(() => {
    if (phase === "reveal" && countries.length > 0 && !currentCountry) {
      startQuestion(countries, new Set());
    }
  }, [phase, countries, currentCountry, startQuestion]);

  // ── Answer handler ──
  const handleAnswer = useCallback((option) => {
    if (phase !== "playing" || selected) return;
    clearInterval(timerRef.current);

    const correct = option === currentCountry.name.common;
    setSelected(option);
    setIsCorrect(correct);
    setPhase("feedback");

    // Scoring
    let pts = 0;
    if (correct) {
      const speedBonus = Math.round((timeLeft / modeConfig.timePerQ) * 50);
      const multi = streak >= 15 ? 4 : streak >= 10 ? 3 : streak >= 5 ? 2 : 1;
      pts = (modeConfig.scoreBase + speedBonus) * multi;
      setScore(prev => prev + pts);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(prev => Math.max(prev, newStreak));
      if (STREAK_THRESHOLDS.includes(newStreak)) SFX.streak();
      else SFX.correct();
    } else {
      setStreak(0);
      SFX.wrong();
      if (modeConfig.lives) {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setTimeout(() => endGame("no_lives"), 1200);
          return;
        }
      }
    }

    setScorePopVal(correct ? pts : 0);
    setScorePopVisible(true);
    setBurst({ active: true, correct });

    setHistory(prev => [...prev, {
      country: currentCountry.name.common,
      flag: currentCountry.flags.svg,
      correct,
      pts,
    }]);

    feedbackRef.current = setTimeout(() => {
      setBurst({ active: false, correct: false });
      setScorePopVisible(false);
      const nextQ = questionNum + 1;
      const maxQ = totalQuestions === 999 ? 999 : totalQuestions;
      if (nextQ >= maxQ && maxQ !== 999) {
        endGame("complete");
      } else {
        setQuestionNum(nextQ);
        startQuestion(countries, usedIds);
      }
    }, correct ? 700 : 1100);
  }, [phase, selected, currentCountry, timeLeft, streak, lives, questionNum, totalQuestions, countries, usedIds, modeConfig, startQuestion]);

  const handleTimeout = () => {
    SFX.timeout();
    handleAnswer("__timeout__");
  };

  const endGame = useCallback((reason) => {
    clearInterval(timerRef.current);
    clearInterval(globalRef.current);
    clearInterval(blurRef.current);
    SFX.gameover();
    setPhase("gameover");
  }, []);

  // Cleanup
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(globalRef.current);
    clearInterval(blurRef.current);
    clearTimeout(feedbackRef.current);
  }, []);

  const accuracy = history.length > 0
    ? Math.round((history.filter(h => h.correct).length / history.length) * 100)
    : 0;

  // ── GAME OVER SCREEN ──
  if (phase === "gameover") {
    const rank = score >= 5000 ? "LEGEND" : score >= 3000 ? "MASTER" : score >= 1500 ? "EXPERT" : score >= 600 ? "SKILLED" : "ROOKIE";
    const rankIcon = score >= 5000 ? "👑" : score >= 3000 ? "🏆" : score >= 1500 ? "⭐" : score >= 600 ? "🎖️" : "🎮";
    return (
      <GameOver
        username={username} score={score} rank={rank} rankIcon={rankIcon}
        accuracy={accuracy} bestStreak={bestStreak}
        questionNum={questionNum} history={history}
        onHome={onHome} onReplay={() => window.location.reload()}
        gameMode={gameMode}
      />
    );
  }

  // ── LOADING ──
  if (phase === "loading" || !currentCountry) {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#050c14', fontFamily:"'Outfit',sans-serif",
      }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{textAlign:'center'}}>
          <div className="loader-ring" />
          <p style={{color:'#7a8fa6',marginTop:'20px',letterSpacing:'2px',fontSize:'0.8rem',textTransform:'uppercase'}}>
            {loadError ? "⚠️ Connection error — check your internet" : "Loading countries…"}
          </p>
        </div>
      </div>
    );
  }

  const progress = totalQuestions === 999 ? null : (questionNum / totalQuestions);
  const urgent = timeLeft <= 3;

  return (
    <div className="game-root">
      <style>{GLOBAL_CSS}</style>

      {/* Background */}
      <div className="game-bg-grid" />
      <div className="game-bg-glow" style={{
        background: isCorrect === true
          ? 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,255,179,0.08) 0%,transparent 60%)'
          : isCorrect === false
          ? 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,68,102,0.08) 0%,transparent 60%)'
          : 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,184,255,0.06) 0%,transparent 60%)',
        transition: 'background 0.4s',
      }} />

      <div className="game-layout">

        {/* ── TOP BAR ── */}
        <header className="game-header">
          <div className="header-left">
            <button className="header-back" onClick={onHome} title="Back to menu">
              ←
            </button>
            <div>
              <div className="header-username">{username}</div>
              <div className="header-mode">{modeConfig.icon} {modeConfig.label}</div>
            </div>
          </div>

          <div className="header-center">
            {globalTime !== null && (
              <div className={`global-timer ${globalTime <= 10 ? 'urgent' : ''}`}>
                ⏱ {globalTime}s
              </div>
            )}
            {modeConfig.lives && <Lives lives={lives} maxLives={modeConfig.lives} />}
            <StreakBadge streak={streak} />
          </div>

          <div className="header-right">
            <div className="score-block">
              <div className="score-label">SCORE</div>
              <div className="score-value">{score.toLocaleString()}</div>
            </div>
          </div>
        </header>

        {/* ── PROGRESS BAR ── */}
        {progress !== null && (
          <div className="progress-track">
            <div className="progress-fill" style={{width:`${progress*100}%`}} />
            <span className="progress-label">{questionNum}/{totalQuestions}</span>
          </div>
        )}

        {/* ── MAIN GAME AREA ── */}
        <main className="game-main">

          {/* Flag arena */}
          <div className="flag-arena">
            <div className={`flag-frame ${isCorrect === true ? 'frame-correct' : isCorrect === false ? 'frame-wrong' : ''}`}>
              <div className="flag-scanlines" />
              {burst.active && <ParticleBurst active={burst.active} correct={burst.correct} />}
              <img
                src={currentCountry.flags.svg || currentCountry.flags.png}
                alt="Country Flag"
                className="flag-img"
                style={{
                  filter: `blur(${flagBlur}px)`,
                  transform: `scale(${1 + flagBlur * 0.02})`,
                  transition: 'filter 0.1s, transform 0.1s',
                }}
              />
              {/* Reveal overlay */}
              {flagBlur > 0 && (
                <div className="flag-reveal-overlay">
                  <div className="flag-reveal-text">IDENTIFYING…</div>
                  <div className="flag-reveal-bar">
                    <div className="flag-reveal-fill" style={{width:`${flagRevealPct}%`}} />
                  </div>
                </div>
              )}
              {/* Corner brackets */}
              <div className="corner tl" /><div className="corner tr" />
              <div className="corner bl" /><div className="corner br" />
            </div>

            {/* Timer ring */}
            <div className="timer-ring-wrap">
              <RingTimer timeLeft={timeLeft} maxTime={modeConfig.timePerQ} urgent={urgent} />
            </div>

            {/* Country revealed */}
            {isCorrect !== null && (
              <div className={`country-reveal ${isCorrect ? 'reveal-correct' : 'reveal-wrong'}`}>
                {isCorrect
                  ? `✓ ${currentCountry.name.common}`
                  : `✗ ${currentCountry.name.common}`
                }
              </div>
            )}
          </div>

          {/* Options grid */}
          <div className="options-grid">
            {options.map((opt, i) => {
              const isSelected = selected === opt;
              const isAnswer   = opt === currentCountry?.name.common;
              const showRight  = selected && isAnswer;
              const showWrong  = selected && isSelected && !isAnswer;
              return (
                <div key={opt} className="option-wrap" style={{position:'relative'}}>
                  {isSelected && <ScorePop value={scorePopVal} visible={scorePopVisible} />}
                  <button
                    className={`option-btn
                      ${showRight ? 'opt-correct' : ''}
                      ${showWrong ? 'opt-wrong' : ''}
                      ${!selected ? 'opt-idle' : 'opt-done'}
                    `}
                    style={{animationDelay:`${i*60}ms`}}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selected || phase !== 'playing'}
                  >
                    <span className="opt-key">{['A','B','C','D'][i]}</span>
                    <span className="opt-text">{opt}</span>
                    {showRight && <span className="opt-icon">✓</span>}
                    {showWrong && <span className="opt-icon">✗</span>}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Region hint */}
          {currentCountry?.region && phase === "playing" && (
            <div className="region-hint">
              📍 {currentCountry.region}
              {currentCountry.capital?.[0] && ` · Capital: ${currentCountry.capital[0]}`}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────
function GameOver({ username, score, rank, rankIcon, accuracy, bestStreak, questionNum, history, onHome, onReplay, gameMode }) {
  const [showHistory, setShowHistory] = useState(false);
  return (
    <div className="go-root">
      <style>{GLOBAL_CSS}</style>
      <div className="go-bg-grid" />
      <div className="go-glow" />
      <div className="go-card">
        <div className="go-rank-badge">
          <span className="go-rank-icon">{rankIcon}</span>
          <span className="go-rank-text">{rank}</span>
        </div>
        <h1 className="go-title">MISSION COMPLETE</h1>
        <div className="go-player">{username}</div>

        <div className="go-score-display">
          <div className="go-score-num">{score.toLocaleString()}</div>
          <div className="go-score-label">FINAL SCORE</div>
        </div>

        <div className="go-stats">
          <div className="go-stat">
            <div className="go-stat-val">{questionNum}</div>
            <div className="go-stat-key">FLAGS</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{accuracy}%</div>
            <div className="go-stat-key">ACCURACY</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{bestStreak}🔥</div>
            <div className="go-stat-key">BEST STREAK</div>
          </div>
        </div>

        {history.length > 0 && (
          <button className="go-history-toggle" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? '▲ Hide' : '▼ View'} Round History
          </button>
        )}

        {showHistory && (
          <div className="go-history">
            {history.slice(-10).map((h, i) => (
              <div key={i} className={`go-history-row ${h.correct ? 'hist-correct' : 'hist-wrong'}`}>
                <img src={h.flag} alt={h.country} style={{width:'28px',height:'18px',objectFit:'cover',borderRadius:'2px',border:'1px solid rgba(255,255,255,0.1)'}} />
                <span className="hist-name">{h.country}</span>
                <span className="hist-pts">{h.correct ? `+${h.pts}` : '✗'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="go-actions">
          <button className="go-btn-primary" onClick={onReplay}>▶ PLAY AGAIN</button>
          <button className="go-btn-secondary" onClick={onHome}>⌂ HOME</button>
        </div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #060d16; --surface: rgba(255,255,255,0.04); --surface2: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.09); --accent: #00ffb3; --accent2: #00b8ff;
  --danger: #ff4466; --warn: #ff8800; --text: #f0f4f8; --muted: #6a7f96;
  --font-d: 'Bebas Neue',sans-serif; --font-b: 'Outfit',sans-serif;
}
body { background: var(--bg); color: var(--text); font-family: var(--font-b); }

/* ─ Loading ─ */
.loader-ring {
  width: 56px; height: 56px; border-radius: 50%; margin: 0 auto;
  border: 4px solid rgba(0,255,179,0.15); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─ Game Root ─ */
.game-root { min-height: 100vh; position: relative; overflow-x: hidden; background: var(--bg); }
.game-bg-grid {
  position: fixed; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(0,255,179,0.025) 1px,transparent 1px),
                    linear-gradient(90deg,rgba(0,255,179,0.025) 1px,transparent 1px);
  background-size: 40px 40px;
}
.game-bg-glow { position: fixed; inset: 0; pointer-events: none; transition: background 0.5s; }
.game-layout { position: relative; z-index: 10; min-height: 100vh; display: flex; flex-direction: column; max-width: 680px; margin: 0 auto; padding: 0 16px; }

/* ─ Header ─ */
.game-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0 12px; gap: 12px; flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-back {
  width: 36px; height: 36px; border-radius: 8px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--muted); font-size: 1.1rem; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.header-back:hover { border-color: var(--accent); color: var(--accent); }
.header-username { font-weight: 700; font-size: 0.9rem; color: var(--text); }
.header-mode { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
.header-center { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
.header-right {}
.global-timer {
  font-family: var(--font-d); font-size: 1.2rem; letter-spacing: 2px;
  padding: 4px 12px; border-radius: 6px;
  background: rgba(0,184,255,0.1); border: 1px solid rgba(0,184,255,0.3); color: var(--accent2);
  transition: all 0.3s;
}
.global-timer.urgent { background: rgba(255,68,102,0.15); border-color: rgba(255,68,102,0.5); color: var(--danger); animation: urgentPulse 0.5s ease infinite alternate; }
.score-block { text-align: right; }
.score-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); }
.score-value { font-family: var(--font-d); font-size: 1.8rem; letter-spacing: 2px; color: var(--accent); line-height: 1; text-shadow: 0 0 20px rgba(0,255,179,0.4); }

/* ─ Progress ─ */
.progress-track { position: relative; height: 4px; background: var(--surface2); border-radius: 2px; margin: 10px 0; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent2), var(--accent)); border-radius: 2px; transition: width 0.4s ease; box-shadow: 0 0 8px rgba(0,255,179,0.5); }
.progress-label { position: absolute; right: 0; top: -18px; font-size: 0.65rem; color: var(--muted); letter-spacing: 1px; }

/* ─ Main ─ */
.game-main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20px 0 30px; gap: 24px; }

/* ─ Flag Arena ─ */
.flag-arena { position: relative; width: 100%; max-width: 480px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.flag-frame {
  position: relative; width: 100%; aspect-ratio: 3/2; max-width: 420px;
  border-radius: 8px; overflow: hidden;
  border: 2px solid var(--border);
  box-shadow: 0 0 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.3);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.flag-frame.frame-correct { border-color: rgba(0,255,179,0.6); box-shadow: 0 0 60px rgba(0,255,179,0.25), inset 0 0 20px rgba(0,255,179,0.05); }
.flag-frame.frame-wrong   { border-color: rgba(255,68,102,0.6); box-shadow: 0 0 60px rgba(255,68,102,0.25), inset 0 0 20px rgba(255,68,102,0.05); }
.flag-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.flag-scanlines {
  position: absolute; inset: 0; pointer-events: none; z-index: 5;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px);
}
.flag-reveal-overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; z-index: 20;
  background: rgba(6,13,22,0.3); backdrop-filter: blur(0px);
}
.flag-reveal-text { font-family: var(--font-d); font-size: 1rem; letter-spacing: 4px; color: rgba(0,255,179,0.7); }
.flag-reveal-bar { width: 60%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.flag-reveal-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.1s; box-shadow: 0 0 6px var(--accent); }
/* Corner brackets */
.corner { position: absolute; width: 16px; height: 16px; z-index: 10; }
.corner.tl { top: 6px; left: 6px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.corner.tr { top: 6px; right: 6px; border-top: 2px solid var(--accent); border-right: 2px solid var(--accent); }
.corner.bl { bottom: 6px; left: 6px; border-bottom: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.corner.br { bottom: 6px; right: 6px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }
.timer-ring-wrap { position: absolute; right: -20px; top: 50%; transform: translateY(-50%); }
.country-reveal {
  font-family: var(--font-d); font-size: 1.4rem; letter-spacing: 3px;
  padding: 8px 20px; border-radius: 4px; animation: revealPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.reveal-correct { color: var(--accent); background: rgba(0,255,179,0.1); border: 1px solid rgba(0,255,179,0.3); text-shadow: 0 0 20px var(--accent); }
.reveal-wrong   { color: var(--danger); background: rgba(255,68,102,0.1); border: 1px solid rgba(255,68,102,0.3); }
@keyframes revealPop { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }

/* ─ Options ─ */
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 520px; }
.option-wrap { position: relative; }
.option-btn {
  position: relative; width: 100%; padding: 14px 16px;
  display: flex; align-items: center; gap: 10px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; cursor: pointer; text-align: left;
  font-family: var(--font-b); transition: all 0.2s; overflow: hidden;
  animation: optIn 0.35s both cubic-bezier(0.34,1.3,0.64,1);
}
@keyframes optIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.option-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,255,179,0.05),transparent); opacity:0; transition:opacity 0.2s; }
.opt-idle:hover { border-color: rgba(0,184,255,0.5); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
.opt-idle:hover::before { opacity: 1; }
.opt-idle:active { transform: translateY(0); }
.opt-done { cursor: default; }
.opt-correct { border-color: var(--accent) !important; background: rgba(0,255,179,0.1) !important; box-shadow: 0 0 30px rgba(0,255,179,0.2) !important; }
.opt-wrong   { border-color: var(--danger) !important; background: rgba(255,68,102,0.1) !important; animation: shake 0.4s ease; }
@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
.opt-key { width: 24px; height: 24px; border-radius: 4px; background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: var(--muted); flex-shrink: 0; font-family: var(--font-b); }
.opt-correct .opt-key { background: rgba(0,255,179,0.2); border-color: var(--accent); color: var(--accent); }
.opt-wrong   .opt-key { background: rgba(255,68,102,0.2); border-color: var(--danger); color: var(--danger); }
.opt-text { flex: 1; font-size: 0.88rem; font-weight: 500; color: var(--text); line-height: 1.3; }
.opt-icon { font-size: 1rem; flex-shrink: 0; }

/* ─ Region hint ─ */
.region-hint { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; }

/* ─ Animations ─ */
@keyframes streakPulse { from{box-shadow:0 0 0 rgba(255,140,0,0)} to{box-shadow:0 0 16px rgba(255,140,0,0.4)} }
@keyframes urgentPulse { from{opacity:1} to{opacity:0.6} }

/* ─ Game Over ─ */
.go-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg); position: relative; }
.go-bg-grid { position: fixed; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(0,255,179,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,179,0.025) 1px,transparent 1px); background-size: 40px 40px; }
.go-glow { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 600px; height: 300px; background: radial-gradient(ellipse, rgba(0,255,179,0.08) 0%,transparent 70%); pointer-events: none; }
.go-card {
  position: relative; z-index: 10; width: 100%; max-width: 480px;
  background: rgba(8,16,28,0.95); border: 1px solid rgba(0,255,179,0.15);
  border-radius: 20px; padding: 40px 32px;
  box-shadow: 0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,179,0.08);
  animation: cardIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
  display: flex; flex-direction: column; align-items: center; gap: 20px;
}
@keyframes cardIn { from{opacity:0;transform:translateY(40px) scale(0.95)} to{opacity:1;transform:none} }
.go-rank-badge { display: flex; align-items: center; gap: 8px; padding: 8px 20px; border-radius: 30px; background: rgba(0,255,179,0.06); border: 1px solid rgba(0,255,179,0.2); }
.go-rank-icon { font-size: 1.5rem; }
.go-rank-text { font-family: var(--font-d); font-size: 1.4rem; letter-spacing: 4px; color: var(--accent); }
.go-title { font-family: var(--font-d); font-size: clamp(1.8rem,6vw,2.8rem); letter-spacing: 5px; text-align: center; background: linear-gradient(135deg,#fff,var(--accent)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.go-player { font-size: 0.85rem; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; }
.go-score-display { text-align: center; }
.go-score-num { font-family: var(--font-d); font-size: clamp(3.5rem,12vw,5.5rem); letter-spacing: 4px; color: var(--accent); line-height: 1; text-shadow: 0 0 40px rgba(0,255,179,0.4); }
.go-score-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 3px; color: var(--muted); }
.go-stats { display: flex; gap: 0; width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.go-stat { flex: 1; padding: 16px 10px; text-align: center; border-right: 1px solid var(--border); }
.go-stat:last-child { border-right: none; }
.go-stat-val { font-family: var(--font-d); font-size: 1.6rem; letter-spacing: 1px; color: var(--text); }
.go-stat-key { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
.go-history-toggle { background: none; border: 1px solid var(--border); color: var(--muted); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: var(--font-b); font-size: 0.8rem; transition: all 0.2s; }
.go-history-toggle:hover { border-color: var(--accent2); color: var(--accent2); }
.go-history { width: 100%; max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.go-history::-webkit-scrollbar { width: 4px; }
.go-history::-webkit-scrollbar-track { background: transparent; }
.go-history::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
.go-history-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; background: var(--surface); }
.hist-correct { border-left: 3px solid var(--accent); }
.hist-wrong   { border-left: 3px solid var(--danger); }
.hist-name { flex: 1; font-size: 0.82rem; color: var(--text); }
.hist-pts { font-family: var(--font-d); font-size: 0.95rem; }
.hist-correct .hist-pts { color: var(--accent); }
.hist-wrong   .hist-pts { color: var(--danger); }
.go-actions { display: flex; gap: 12px; width: 100%; }
.go-btn-primary { flex: 1; padding: 14px; font-family: var(--font-d); font-size: 1.2rem; letter-spacing: 3px; color: var(--bg); background: var(--accent); border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 20px rgba(0,255,179,0.3); }
.go-btn-primary:hover { box-shadow: 0 0 40px rgba(0,255,179,0.5); transform: translateY(-1px); }
.go-btn-secondary { padding: 14px 20px; font-family: var(--font-d); font-size: 1.1rem; letter-spacing: 2px; color: var(--accent2); background: transparent; border: 1px solid rgba(0,184,255,0.3); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.go-btn-secondary:hover { background: rgba(0,184,255,0.08); border-color: var(--accent2); }

@media (max-width: 500px) {
  .timer-ring-wrap { display: none; }
  .options-grid { grid-template-columns: 1fr; gap: 8px; }
  .game-header { padding: 12px 0 10px; }
  .go-card { padding: 28px 18px; }
  .go-actions { flex-direction: column; }
}
`;
