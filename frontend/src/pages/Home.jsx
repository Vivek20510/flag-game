import React, { useEffect, useState, useRef, useCallback } from "react";
import { getLeaderboard } from "../firebase/leaderboardService";

// ─── Flag codes for background decoration ────────────────────────────────────
const FLAG_CODES = [
  "us","gb","jp","de","fr","br","in","cn","au","ca",
  "it","es","mx","kr","ng","za","ar","se","no","pk",
  "eg","th","vn","pl","ua","tr","sa","ae","gh","ke",
  "nz","sg","ch","pt","gr","ie","il","at","be","dk",
];

// ─── Real country count from RestCountries ────────────────────────────────────
const RESTCOUNTRIES_COUNT_URL =
  "https://restcountries.com/v3.1/all?fields=cca2,flags,name";

// ─── Curated 100 flags pool size (same set used in Game.jsx) ─────────────────
const CURATED_POOL_SIZE = 100;

// ─── Floating background flag ────────────────────────────────────────────────
function FloatingFlag({ code, style }) {
  return (
    <div className="ff-wrap" style={style}>
      <img
        src={`https://flagcdn.com/w80/${code}.png`}
        alt=""
        className="ff-img"
        loading="lazy"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Animated particle canvas ─────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let id, W, H;
    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.08,
    }));
    (function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,180,${p.a})`;
        ctx.fill();
      });
      id = requestAnimationFrame(draw);
    })();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ─── Smooth count-up animation ────────────────────────────────────────────────
function Counter({ end, suffix = "", duration = 1200 }) {
  const [val, setVal] = useState(0);
  const nodeRef = useRef(null);
  useEffect(() => {
    if (!end) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          // ease out cubic
          const eased = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(eased * end));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    if (nodeRef.current) obs.observe(nodeRef.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={nodeRef}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Game start modal ─────────────────────────────────────────────────────────
function GameStartModal({ onStart, onClose, defaultMode }) {
  const [username, setUsername] = useState(
    () => localStorage.getItem("fm_username") || ""
  );
  const [gameMode,  setGameMode]  = useState(defaultMode || "classic");
  const [flagCount, setFlagCount] = useState(10);
  const [error,     setError]     = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const MODES = [
    { value:"classic",   label:"Classic",   icon:"🎯", desc:"10–50 flags, your pace" },
    { value:"lightning", label:"Lightning", icon:"⚡", desc:"60s speed run" },
    { value:"survival",  label:"Survival",  icon:"❤️", desc:"3 lives, go infinite" },
    { value:"hard",      label:"Hard",      icon:"💀", desc:"Toughest flags only" },
  ];

  const handleSubmit = () => {
    const name = username.trim();
    if (!name) { setError("Enter your name to continue"); return; }
    localStorage.setItem("fm_username", name);
    onStart({ username: name, gameMode, flagCount });
  };

  // Update range track fill
  const pct = ((flagCount - 5) / (50 - 5)) * 100;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label="Game Setup">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-header">
          <span className="modal-globe">🌍</span>
          <h2 className="modal-title">MISSION BRIEFING</h2>
          <p className="modal-sub">Configure your game before entering the arena</p>
        </div>

        {/* Name */}
        <div className="mf">
          <label className="mf-label">Operative Name</label>
          <input
            ref={inputRef}
            className={`mf-input ${error ? "mf-input--err" : ""}`}
            placeholder="e.g. GeoMaster99"
            value={username}
            maxLength={24}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          {error
            ? <span className="mf-error">{error}</span>
            : <span className="mf-hint">{username.trim().length} / 24 characters</span>
          }
        </div>

        {/* Mode selector */}
        <div className="mf">
          <label className="mf-label">Game Mode</label>
          <div className="mode-grid">
            {MODES.map(m => (
              <button
                key={m.value}
                className={`mode-tile ${gameMode === m.value ? "mode-tile--on" : ""}`}
                onClick={() => setGameMode(m.value)}
              >
                <span className="mt-icon">{m.icon}</span>
                <span className="mt-name">{m.label}</span>
                <span className="mt-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Flag count (only classic/hard) */}
        {(gameMode === "classic" || gameMode === "hard") && (
          <div className="mf">
            <label className="mf-label">
              Flags to Answer — <strong style={{ color:"var(--accent)" }}>{flagCount}</strong>
            </label>
            <input
              type="range" min={5} max={50} step={5}
              value={flagCount}
              onChange={e => setFlagCount(Number(e.target.value))}
              className="mf-range"
              style={{ "--pct": `${pct}%` }}
            />
            <div className="mf-range-labels">
              {[5,10,20,30,40,50].map(v => (
                <span
                  key={v}
                  className={flagCount === v ? "rl-active" : ""}
                  onClick={() => setFlagCount(v)}
                  style={{ cursor:"pointer" }}
                >{v}</span>
              ))}
            </div>
          </div>
        )}

        {gameMode === "lightning" && (
          <div className="mf-info">
            ⚡ Race through as many flags as possible in <strong>60 seconds</strong>
          </div>
        )}
        {gameMode === "survival" && (
          <div className="mf-info">
            ❤️ You have <strong>3 lives</strong> — wrong answers cost a life
          </div>
        )}

        <button className="modal-launch" onClick={handleSubmit}>
          <span>ENTER THE ARENA</span>
          <span className="launch-shimmer" />
        </button>
      </div>
    </div>
  );
}

// ─── Leaderboard row skeleton ──────────────────────────────────────────────────
function Skeleton({ rows = 3 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="lb-row lb-skeleton">
          <div className="sk-rank" />
          <div className="sk-avatar" />
          <div className="sk-info">
            <div className="sk-name" />
            <div className="sk-meta" />
          </div>
          <div className="sk-score" />
        </div>
      ))}
    </>
  );
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ score }) {
  const r = score >= 5000 ? { l:"LEGEND",  c:"#ffd700" }
          : score >= 3000 ? { l:"MASTER",  c:"#00ffb3" }
          : score >= 1500 ? { l:"EXPERT",  c:"#00b8ff" }
          : score >= 600  ? { l:"SKILLED", c:"#ff8800" }
          :                 { l:"ROOKIE",  c:"#6a7f96" };
  return (
    <span className="rank-badge" style={{ color: r.c, borderColor: `${r.c}30`, background: `${r.c}0f` }}>
      {r.l}
    </span>
  );
}

// ─── Main Home component ──────────────────────────────────────────────────────
export default function Home({ onStart, onNavigate }) {
  const [mounted,      setMounted]      = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [defaultMode,  setDefaultMode]  = useState("classic");

  // Real data
  const [lbData,       setLbData]       = useState([]);
  const [lbLoading,    setLbLoading]    = useState(true);
  const [lbError,      setLbError]      = useState(false);
  const [countryCount, setCountryCount] = useState(0);
  const [activeTab,    setActiveTab]    = useState("top5");

  // Mount animation
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  // ── Fetch real leaderboard from Firebase ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getLeaderboard();
        if (!cancelled) {
          setLbData(Array.isArray(data) ? data : []);
          setLbLoading(false);
        }
      } catch {
        if (!cancelled) { setLbError(true); setLbLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch real country count from RestCountries ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch(RESTCOUNTRIES_COUNT_URL);
        const data = await res.json();
        if (!cancelled) {
          // Count only those with an SVG flag (same filter as Game.jsx)
          const valid = data.filter(c => c.flags?.svg && c.name?.common);
          setCountryCount(valid.length);
        }
      } catch {
        if (!cancelled) setCountryCount(195); // reasonable fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openMode = useCallback((mode) => {
    setDefaultMode(mode);
    setShowModal(true);
  }, []);

  const handleStartGame = useCallback((config) => {
    setShowModal(false);
    onStart?.(config);
  }, [onStart]);

  // Leaderboard view based on tab
  const lbView = activeTab === "top5"  ? lbData.slice(0, 5)
               : activeTab === "top10" ? lbData.slice(0, 10)
               : lbData; // all

  // Floating flags layout
  const floatingFlags = FLAG_CODES.map((code, i) => ({
    code,
    style: {
      left:              `${(i * 41 + 3) % 94}%`,
      top:               `${(i * 27 + 6) % 88}%`,
      animationDuration: `${9 + (i % 6) * 1.5}s`,
      animationDelay:    `${(i * 0.35) % 4}s`,
      opacity:           0.1 + (i % 5) * 0.04,
    },
  }));

  return (
    <>
      <style>{CSS}</style>

      {/* Fixed backgrounds */}
      <div className="bg-grid" />
      <div className="bg-glow" />
      <ParticleCanvas />
      <div className="flags-bg" aria-hidden="true">
        {floatingFlags.map((f, i) => <FloatingFlag key={i} code={f.code} style={f.style} />)}
      </div>

      <div className="page">
        <div className="content">

          {/* ── NAV ── */}
          <nav className="nav">
            <span className="nav-logo">
              <span className="logo-globe">🌍</span>
              <span className="logo-text">FLAGMASTER</span>
            </span>
            <div className="nav-links">
              <button className="nav-link" onClick={() => onNavigate?.("leaderboard")}>
                🏆 Leaderboard
              </button>
              <button className="nav-link nav-link--cta" onClick={() => setShowModal(true)}>
                ▶ Play Now
              </button>
            </div>
            {/* Mobile hamburger CTA */}
            <button className="nav-mobile-cta" onClick={() => setShowModal(true)}>▶ Play</button>
          </nav>

          {/* ── HERO ── */}
          <section className={`hero ${mounted ? "hero--in" : ""}`}>
            <div className="hero-pill">
              <span className="hero-pill-dot" />
              {countryCount > 0 ? `${countryCount} Countries` : "250+ Countries"} · 100 Curated Flags · Free
            </div>

            <h1 className="hero-title">
              <span className="ht-line1">KNOW YOUR</span>
              <span className="ht-flags">FLAGS</span>
            </h1>

            <p className="hero-sub">
              Test your geography knowledge, race the clock, and climb the global leaderboard.
              Four game modes. Real flags. Zero excuses.
            </p>

            <div className="cta-row">
              <button className="cta-primary" onClick={() => setShowModal(true)}>
                ▶ PLAY NOW
                <span className="cta-shimmer" />
              </button>
              <button className="cta-ghost" onClick={() => openMode("survival")}>
                ❤️ SURVIVAL
              </button>
              <button className="cta-ghost" onClick={() => openMode("hard")}>
                💀 HARD MODE
              </button>
            </div>
          </section>

          {/* ── LIVE STATS (real data) ── */}
          <div className={`stats-bar ${mounted ? "stats-bar--in" : ""}`}>
            <div className="stat-cell">
              <div className="stat-n">
                {countryCount > 0 ? <Counter end={countryCount} /> : "—"}
              </div>
              <div className="stat-l">Total Countries</div>
            </div>
            <div className="stat-div" />
            <div className="stat-cell">
              <div className="stat-n">
                <Counter end={CURATED_POOL_SIZE} />
              </div>
              <div className="stat-l">Curated Flags</div>
            </div>
            <div className="stat-div" />
            <div className="stat-cell">
              <div className="stat-n">4</div>
              <div className="stat-l">Game Modes</div>
            </div>
            <div className="stat-div" />
            <div className="stat-cell">
              <div className="stat-n">
                {lbLoading
                  ? <span className="stat-loading" />
                  : <Counter end={lbData.length} />
                }
              </div>
              <div className="stat-l">Players on Board</div>
            </div>
          </div>

          {/* ── GAME MODES ── */}
          <section className="section modes-section">
            <div className="section-head">
              <span className="section-eyebrow">Choose Your Battle</span>
              <h2 className="section-title">GAME MODES</h2>
            </div>
            <div className="modes-grid">
              {[
                { icon:"🎯", mode:"classic",   title:"Classic",   tag:null,      desc:"Pick the right flag. 10–50 rounds. Race for perfect accuracy.", accent:"#00b8ff" },
                { icon:"⚡", mode:"lightning", title:"Lightning", tag:"POPULAR",  desc:"60 seconds. As many flags as you can. Pure adrenaline.",       accent:"#ffcc00" },
                { icon:"❤️", mode:"survival",  title:"Survival",  tag:null,       desc:"3 lives. Infinite flags. One wrong answer brings you closer to the end.", accent:"#ff4466" },
                { icon:"💀", mode:"hard",      title:"Hard Mode", tag:"BRUTAL",   desc:"Confusable flags only — Chad vs Romania. Only the elite survive.", accent:"#ff8800" },
              ].map((m, i) => (
                <button
                  key={m.mode}
                  className="mode-card"
                  style={{ animationDelay:`${i * 70}ms`, "--mc": m.accent }}
                  onClick={() => openMode(m.mode)}
                >
                  {m.tag && <span className="mc-tag">{m.tag}</span>}
                  <div className="mc-icon">{m.icon}</div>
                  <h3 className="mc-title">{m.title}</h3>
                  <p className="mc-desc">{m.desc}</p>
                  <div className="mc-footer">
                    <span className="mc-play">Play →</span>
                  </div>
                  <div className="mc-glow" />
                </button>
              ))}
            </div>
          </section>

          {/* ── REAL LEADERBOARD ── */}
          <section className="section lb-section">
            <div className="section-head">
              <span className="section-eyebrow">Hall of Fame</span>
              <h2 className="section-title">LEADERBOARD</h2>
              <p className="section-sub">Live data from Firebase — updated after every game</p>
            </div>

            <div className="lb-card">
              {/* Tabs */}
              <div className="lb-tabs">
                {[
                  { key:"top5",  label:"🏅 Top 5"  },
                  { key:"top10", label:"🔟 Top 10" },
                  { key:"all",   label:"🌍 All"    },
                ].map(t => (
                  <button
                    key={t.key}
                    className={`lb-tab ${activeTab === t.key ? "lb-tab--on" : ""}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
                {/* Live badge */}
                <span className="lb-live-badge">
                  <span className="lb-live-dot" />LIVE
                </span>
              </div>

              {/* Rows */}
              <div className="lb-rows">
                {lbLoading ? (
                  <Skeleton rows={5} />
                ) : lbError ? (
                  <div className="lb-empty">
                    <div className="lb-empty-icon">⚠️</div>
                    <div>Failed to load leaderboard</div>
                    <button
                      className="lb-retry"
                      onClick={() => { setLbLoading(true); setLbError(false);
                        getLeaderboard().then(d => { setLbData(d||[]); setLbLoading(false); }).catch(() => { setLbError(true); setLbLoading(false); });
                      }}
                    >Retry</button>
                  </div>
                ) : lbView.length === 0 ? (
                  <div className="lb-empty">
                    <div className="lb-empty-icon">🏁</div>
                    <div>No scores yet — be the first!</div>
                    <button className="lb-retry" onClick={() => setShowModal(true)}>Play Now</button>
                  </div>
                ) : (
                  lbView.map((player, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                    const isCurrentUser = player.username === localStorage.getItem("fm_username");
                    return (
                      <div
                        key={i}
                        className={`lb-row ${i < 3 ? "lb-row--top" : ""} ${isCurrentUser ? "lb-row--you" : ""}`}
                        style={{ animationDelay:`${i * 45}ms` }}
                      >
                        <div className="lb-pos">
                          {medal
                            ? <span className="lb-medal">{medal}</span>
                            : <span className="lb-num">#{i + 1}</span>
                          }
                        </div>
                        <div className="lb-avatar">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.username)}`}
                            alt={player.username}
                            loading="lazy"
                          />
                        </div>
                        <div className="lb-info">
                          <div className="lb-name">
                            {player.username}
                            {isCurrentUser && <span className="lb-you-tag">YOU</span>}
                          </div>
                          <div className="lb-meta">
                            <RankBadge score={player.score || 0} />
                          </div>
                        </div>
                        <div className="lb-score">{(player.score || 0).toLocaleString()}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="lb-footer">
                <button className="lb-full-btn" onClick={() => onNavigate?.("leaderboard")}>
                  VIEW FULL LEADERBOARD →
                </button>
                <span className="lb-total">
                  {!lbLoading && !lbError && `${lbData.length} players`}
                </span>
              </div>
            </div>
          </section>

          {/* ── HOW TO PLAY ── */}
          <section className="section howto-section">
            <div className="section-head">
              <span className="section-eyebrow">Get Started</span>
              <h2 className="section-title">HOW TO PLAY</h2>
            </div>
            <div className="howto-grid">
              {[
                { n:"01", icon:"🎮", title:"Pick a Mode",    desc:"Choose your difficulty — Classic for beginners, Hard for flag experts." },
                { n:"02", icon:"🔍", title:"Study the Flag", desc:"A flag appears, blurring into focus. Memorise colours, symbols, layout." },
                { n:"03", icon:"⚡", title:"Answer Fast",    desc:"Choose from 4 options. Speed bonuses stack — quicker answers = bigger scores." },
                { n:"04", icon:"🏆", title:"Climb the Ranks",desc:"Build streaks for score multipliers. Reach Legend status on the global board." },
              ].map(s => (
                <div className="howto-card" key={s.n}>
                  <div className="hc-num">{s.n}</div>
                  <div className="hc-icon">{s.icon}</div>
                  <h4 className="hc-title">{s.title}</h4>
                  <p className="hc-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── KEYBOARD SHORTCUT CALLOUT ── */}
          <div className="kb-callout">
            <span className="kb-label">⌨️ Pro tip — use keys</span>
            {["A","B","C","D"].map(k => <span key={k} className="kb-key">{k}</span>)}
            <span className="kb-label">or</span>
            {["1","2","3","4"].map(k => <span key={k} className="kb-key">{k}</span>)}
            <span className="kb-label">to answer faster</span>
          </div>

        </div>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="footer-inner">
            <span className="footer-logo">🌍 FLAGMASTER</span>
            <span className="footer-credits">
              Flags · <a href="https://flagcdn.com" target="_blank" rel="noopener noreferrer">FlagCDN</a>
              {" "}· Country data · <a href="https://restcountries.com" target="_blank" rel="noopener noreferrer">RestCountries</a>
              {" "}· Avatars · <a href="https://dicebear.com" target="_blank" rel="noopener noreferrer">DiceBear</a>
            </span>
          </div>
        </footer>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <GameStartModal
          onStart={handleStartGame}
          onClose={() => setShowModal(false)}
          defaultMode={defaultMode}
        />
      )}
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

:root {
  --bg:#050c14; --s:rgba(255,255,255,.04); --s2:rgba(255,255,255,.07);
  --border:rgba(255,255,255,.08); --border2:rgba(255,255,255,.13);
  --accent:#00ffb3; --accent2:#00b8ff; --accent3:#ff6b35;
  --danger:#ff4466; --warn:#ff8800; --gold:#ffd700; --silver:#c0c0c0; --bronze:#cd7f32;
  --text:#f0f4f8; --muted:#7a8fa6; --dim:#3a4f62;
  --fd:'Bebas Neue',sans-serif; --fb:'Outfit',sans-serif;
  --glow-g:0 0 30px rgba(0,255,179,.22); --glow-b:0 0 30px rgba(0,184,255,.18);
  --radius:12px;
}

body { background:var(--bg); color:var(--text); font-family:var(--fb); overflow-x:hidden; }

/* ── Fixed BG ── */
.bg-grid { position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image:linear-gradient(rgba(0,255,179,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,179,.028) 1px,transparent 1px);
  background-size:48px 48px; }
.bg-glow { position:fixed; inset:0; z-index:0; pointer-events:none;
  background:radial-gradient(ellipse 80% 50% at 50% -8%,rgba(0,184,255,.11) 0%,transparent 55%),
             radial-gradient(ellipse 55% 35% at 85% 85%,rgba(0,255,179,.07) 0%,transparent 50%); }
.flags-bg { position:fixed; inset:0; z-index:1; pointer-events:none; overflow:hidden; }
.ff-wrap { position:absolute; border-radius:4px; overflow:hidden; animation:ffDrift linear infinite; }
.ff-img { width:54px; height:36px; object-fit:cover; border-radius:4px; display:block; }
@keyframes ffDrift {
  0%   { transform:translateY(0) translateX(0) rotate(-1deg); }
  33%  { transform:translateY(-16px) translateX(7px) rotate(.8deg); }
  66%  { transform:translateY(-6px) translateX(-5px) rotate(-0.4deg); }
  100% { transform:translateY(0) translateX(0) rotate(-1deg); }
}

/* ── Layout ── */
.page { position:relative; z-index:10; min-height:100vh; display:flex; flex-direction:column; }
.content { flex:1; display:flex; flex-direction:column; align-items:center; padding:0 20px; }

/* ── Nav ── */
.nav { width:100%; max-width:1100px; display:flex; align-items:center; justify-content:space-between; padding:22px 0 18px; }
.nav-logo { display:flex; align-items:center; gap:8px; text-decoration:none; }
.logo-globe { font-size:1.4rem; }
.logo-text { font-family:var(--fd); font-size:1.3rem; letter-spacing:3px; color:var(--accent); }
.nav-links { display:flex; align-items:center; gap:8px; }
.nav-link { padding:8px 16px; border-radius:20px; border:1px solid var(--border); background:var(--s);
  color:var(--muted); font-family:var(--fb); font-size:.8rem; font-weight:500; cursor:pointer;
  transition:all .2s; letter-spacing:.4px; }
.nav-link:hover { border-color:var(--accent2); color:var(--accent2); background:rgba(0,184,255,.06); }
.nav-link--cta { border-color:rgba(0,255,179,.35); color:var(--accent); background:rgba(0,255,179,.06); }
.nav-link--cta:hover { background:rgba(0,255,179,.12); box-shadow:var(--glow-g); }
.nav-mobile-cta { display:none; padding:9px 20px; border-radius:20px; border:none;
  background:var(--accent); color:var(--bg); font-family:var(--fd); font-size:.95rem;
  letter-spacing:2px; cursor:pointer; }

/* ── Hero ── */
.hero { width:100%; max-width:900px; text-align:center; padding:44px 0 24px;
  opacity:0; transform:translateY(28px); transition:opacity .75s ease,transform .75s ease; }
.hero--in { opacity:1; transform:translateY(0); }
.hero-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 16px; border-radius:20px;
  border:1px solid rgba(0,255,179,.28); background:rgba(0,255,179,.06);
  font-size:.7rem; font-weight:600; letter-spacing:2px; text-transform:uppercase;
  color:var(--accent); margin-bottom:22px; }
.hero-pill-dot { width:5px; height:5px; border-radius:50%; background:var(--accent);
  animation:dotPulse 2.2s ease infinite; flex-shrink:0; }
@keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }

.hero-title { font-family:var(--fd); line-height:.88; letter-spacing:4px; margin-bottom:18px; }
.ht-line1 { display:block; font-size:clamp(3.5rem,10vw,7rem);
  background:linear-gradient(135deg,#fff 40%,rgba(240,244,248,.7) 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.ht-flags { display:block; font-size:clamp(5.5rem,18vw,13rem);
  background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 60%,#fff 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  filter:drop-shadow(0 0 40px rgba(0,255,179,.25)); }

.hero-sub { font-size:clamp(.9rem,1.8vw,1.1rem); color:var(--muted); max-width:500px;
  margin:0 auto 36px; line-height:1.75; font-weight:300; }

.cta-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.cta-primary { position:relative; padding:16px 48px; font-family:var(--fd); font-size:1.35rem;
  letter-spacing:3px; color:var(--bg); background:var(--accent); border:none; border-radius:4px;
  cursor:pointer; overflow:hidden; transition:transform .2s,box-shadow .2s;
  box-shadow:0 0 30px rgba(0,255,179,.4),0 4px 20px rgba(0,0,0,.4); }
.cta-primary:hover { transform:translateY(-2px); box-shadow:0 0 55px rgba(0,255,179,.6),0 8px 30px rgba(0,0,0,.5); }
.cta-primary:active { transform:translateY(0); }
.cta-shimmer { position:absolute; inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);
  transform:translateX(-100%); transition:transform .5s; }
.cta-primary:hover .cta-shimmer { transform:translateX(100%); }
.cta-ghost { padding:15px 28px; font-family:var(--fd); font-size:1.1rem; letter-spacing:2px;
  background:var(--s); border:1px solid var(--border2); color:var(--muted); border-radius:4px;
  cursor:pointer; transition:all .2s; }
.cta-ghost:hover { border-color:var(--accent); color:var(--accent); background:rgba(0,255,179,.05); }

/* ── Stats bar (REAL data) ── */
.stats-bar { display:flex; align-items:center; width:100%; max-width:680px;
  background:var(--s); border:1px solid var(--border); border-radius:var(--radius);
  overflow:hidden; margin:32px 0 64px; backdrop-filter:blur(8px);
  opacity:0; transform:translateY(16px); transition:opacity .65s .25s,transform .65s .25s; }
.stats-bar--in { opacity:1; transform:translateY(0); }
.stat-cell { flex:1; padding:18px 12px; text-align:center; }
.stat-div { width:1px; height:40px; background:var(--border); flex-shrink:0; }
.stat-n { font-family:var(--fd); font-size:1.9rem; letter-spacing:2px; color:var(--accent); line-height:1; }
.stat-l { font-size:.64rem; color:var(--muted); text-transform:uppercase; letter-spacing:1.5px; margin-top:4px; }
.stat-loading { display:inline-block; width:20px; height:20px; border-radius:50%;
  border:2px solid rgba(0,255,179,.15); border-top-color:var(--accent);
  animation:spin .8s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }

/* ── Section headers ── */
.section { width:100%; max-width:1000px; margin-bottom:80px; }
.section-head { text-align:center; margin-bottom:36px; }
.section-eyebrow { font-size:.67rem; text-transform:uppercase; letter-spacing:3px; color:var(--accent);
  font-weight:600; display:block; margin-bottom:8px; }
.section-title { font-family:var(--fd); font-size:clamp(2rem,5vw,3rem); letter-spacing:3px; }
.section-sub { font-size:.78rem; color:var(--muted); margin-top:8px; letter-spacing:.5px; }

/* ── Mode cards ── */
.modes-section { max-width:920px; }
.modes-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; }
.mode-card { position:relative; padding:28px 22px 22px; background:var(--s); border:1px solid var(--border);
  border-radius:var(--radius); cursor:pointer; text-align:left; transition:all .28s; overflow:hidden;
  font-family:inherit; animation:fadeUp .5s both; }
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.mode-card:hover { border-color:var(--mc,var(--accent)); transform:translateY(-4px);
  box-shadow:0 0 30px color-mix(in srgb,var(--mc,var(--accent)) 30%,transparent),0 16px 40px rgba(0,0,0,.4); }
.mc-glow { position:absolute; inset:0; opacity:0; transition:opacity .3s;
  background:radial-gradient(ellipse 80% 60% at 50% 0%,color-mix(in srgb,var(--mc,var(--accent)) 12%,transparent),transparent 70%); }
.mode-card:hover .mc-glow { opacity:1; }
.mc-tag { position:absolute; top:12px; right:12px; font-size:.58rem; text-transform:uppercase;
  letter-spacing:1.5px; padding:3px 8px; border-radius:20px; font-weight:700;
  background:rgba(255,107,53,.18); color:var(--accent3); border:1px solid rgba(255,107,53,.3); }
.mc-icon { font-size:2.2rem; margin-bottom:12px; display:block; }
.mc-title { font-family:var(--fd); font-size:1.4rem; letter-spacing:2px; margin-bottom:8px; }
.mc-desc { font-size:.8rem; color:var(--muted); line-height:1.55; }
.mc-footer { margin-top:18px; }
.mc-play { font-size:.78rem; color:var(--mc,var(--accent)); font-weight:600; letter-spacing:1px;
  opacity:.6; transition:opacity .2s; }
.mode-card:hover .mc-play { opacity:1; }

/* ── Leaderboard section ── */
.lb-section { max-width:680px; }
.lb-card { background:var(--s); border:1px solid var(--border); border-radius:16px;
  overflow:hidden; backdrop-filter:blur(10px); }
.lb-tabs { display:flex; align-items:center; border-bottom:1px solid var(--border); background:rgba(0,0,0,.15); }
.lb-tab { flex:1; padding:13px; font-family:var(--fb); font-size:.75rem; font-weight:600;
  letter-spacing:1px; text-transform:uppercase; color:var(--muted); background:transparent;
  border:none; cursor:pointer; transition:all .2s; border-bottom:2px solid transparent; }
.lb-tab--on { color:var(--accent); border-bottom-color:var(--accent); background:rgba(0,255,179,.04); }
.lb-live-badge { margin-left:auto; margin-right:14px; display:flex; align-items:center; gap:5px;
  font-size:.58rem; font-weight:700; letter-spacing:2px; color:var(--accent);
  text-transform:uppercase; flex-shrink:0; }
.lb-live-dot { width:5px; height:5px; border-radius:50%; background:var(--accent);
  animation:dotPulse 1.8s ease infinite; }

/* Rows */
.lb-rows { padding:6px 0; min-height:80px; }
.lb-row { display:flex; align-items:center; gap:12px; padding:13px 20px;
  transition:background .15s; animation:rowSlide .4s both; border-bottom:1px solid rgba(255,255,255,.025); }
.lb-row:last-child { border-bottom:none; }
@keyframes rowSlide { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }
.lb-row:hover { background:var(--s2); }
.lb-row--top .lb-name { color:var(--text); }
.lb-row--you { background:rgba(0,255,179,.04); border-left:3px solid var(--accent) !important; }
.lb-pos { width:38px; text-align:center; flex-shrink:0; }
.lb-medal { font-size:1.3rem; line-height:1; }
.lb-num { font-family:var(--fd); font-size:1.1rem; color:var(--muted); }
.lb-avatar { width:36px; height:36px; border-radius:50%; overflow:hidden;
  border:2px solid var(--border); flex-shrink:0; background:var(--s2); }
.lb-avatar img { width:100%; height:100%; }
.lb-info { flex:1; min-width:0; }
.lb-name { font-size:.88rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:6px; }
.lb-meta { margin-top:3px; }
.lb-you-tag { font-size:.58rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
  background:rgba(0,255,179,.15); color:var(--accent); border:1px solid rgba(0,255,179,.3);
  padding:1px 6px; border-radius:4px; }
.lb-score { font-family:var(--fd); font-size:1.3rem; letter-spacing:1px; color:var(--accent); flex-shrink:0; }
.rank-badge { font-size:.58rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
  padding:2px 7px; border-radius:8px; border:1px solid; }

/* Empty / error states */
.lb-empty { display:flex; flex-direction:column; align-items:center; gap:10px;
  padding:40px 20px; text-align:center; color:var(--muted); font-size:.85rem; }
.lb-empty-icon { font-size:2.5rem; }
.lb-retry { padding:8px 20px; border-radius:6px; border:1px solid var(--border);
  background:var(--s); color:var(--accent2); font-family:var(--fb); font-size:.8rem;
  cursor:pointer; transition:all .2s; }
.lb-retry:hover { border-color:var(--accent2); }

/* Skeleton */
.lb-skeleton { pointer-events:none; }
.sk-rank { width:28px; height:24px; border-radius:4px; background:var(--s2); animation:shimmer 1.4s ease infinite; }
.sk-avatar { width:36px; height:36px; border-radius:50%; background:var(--s2); animation:shimmer 1.4s ease .1s infinite; }
.sk-info { flex:1; display:flex; flex-direction:column; gap:6px; }
.sk-name { height:13px; width:55%; border-radius:4px; background:var(--s2); animation:shimmer 1.4s ease .2s infinite; }
.sk-meta { height:10px; width:30%; border-radius:4px; background:var(--s2); animation:shimmer 1.4s ease .3s infinite; }
.sk-score { width:50px; height:20px; border-radius:4px; background:var(--s2); animation:shimmer 1.4s ease .4s infinite; }
@keyframes shimmer {
  0%,100% { opacity:.4; } 50% { opacity:.9; }
}

/* Footer row */
.lb-footer { padding:14px 20px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
.lb-full-btn { font-family:var(--fb); font-size:.75rem; font-weight:700; letter-spacing:1px;
  text-transform:uppercase; color:var(--accent2); background:none; border:none; cursor:pointer; transition:color .2s; }
.lb-full-btn:hover { color:var(--text); }
.lb-total { font-size:.68rem; color:var(--dim); letter-spacing:1px; }

/* ── How to Play ── */
.howto-section { max-width:840px; }
.howto-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; }
.howto-card { padding:26px 20px; background:var(--s); border:1px solid var(--border);
  border-radius:var(--radius); text-align:center; transition:border-color .25s; }
.howto-card:hover { border-color:rgba(0,184,255,.4); }
.hc-num { font-family:var(--fd); font-size:2.8rem; color:rgba(0,255,179,.1); line-height:1; margin-bottom:8px; }
.hc-icon { font-size:1.6rem; margin-bottom:10px; }
.hc-title { font-size:.92rem; font-weight:700; margin-bottom:8px; }
.hc-desc { font-size:.78rem; color:var(--muted); line-height:1.6; }

/* ── Keyboard callout ── */
.kb-callout { display:flex; align-items:center; flex-wrap:wrap; gap:6px; justify-content:center;
  margin-bottom:60px; padding:12px 20px; border-radius:20px;
  background:var(--s); border:1px solid var(--border);
  font-size:.72rem; color:var(--muted); letter-spacing:.5px; }
.kb-key { padding:3px 8px; border-radius:5px; background:var(--s2); border:1px solid var(--border2);
  color:var(--text); font-family:var(--fd); font-size:.85rem; letter-spacing:1px;
  box-shadow:0 2px 0 rgba(0,0,0,.4); }

/* ── Footer ── */
.footer { border-top:1px solid var(--border); padding:20px; }
.footer-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center;
  justify-content:space-between; flex-wrap:wrap; gap:12px; }
.footer-logo { font-family:var(--fd); font-size:1.1rem; letter-spacing:2px; color:var(--accent); }
.footer-credits { font-size:.7rem; color:var(--muted); letter-spacing:.5px; }
.footer-credits a { color:var(--accent2); text-decoration:none; }
.footer-credits a:hover { text-decoration:underline; }

/* ── Modal ── */
.modal-backdrop { position:fixed; inset:0; z-index:200; background:rgba(5,12,20,.88);
  backdrop-filter:blur(14px); display:flex; align-items:center; justify-content:center;
  padding:20px; animation:fadeIn .18s ease; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.modal-box { position:relative; width:100%; max-width:468px; background:#07121e;
  border:1px solid rgba(0,255,179,.2); border-radius:20px; padding:40px 32px;
  box-shadow:0 0 70px rgba(0,255,179,.08),0 30px 60px rgba(0,0,0,.7);
  animation:modalIn .3s cubic-bezier(.34,1.56,.64,1); }
@keyframes modalIn { from{opacity:0;transform:translateY(28px) scale(.96)} to{opacity:1;transform:none} }
.modal-close { position:absolute; top:16px; right:16px; width:30px; height:30px;
  border-radius:50%; background:var(--s2); border:1px solid var(--border);
  color:var(--muted); font-size:.78rem; cursor:pointer; transition:all .2s;
  display:flex; align-items:center; justify-content:center; }
.modal-close:hover { color:var(--text); border-color:var(--accent); }
.modal-header { text-align:center; margin-bottom:28px; }
.modal-globe { font-size:2.4rem; display:block; margin-bottom:10px; }
.modal-title { font-family:var(--fd); font-size:2rem; letter-spacing:4px; margin-bottom:6px; }
.modal-sub { font-size:.82rem; color:var(--muted); }
.mf { margin-bottom:22px; }
.mf-label { display:block; font-size:.68rem; font-weight:700; letter-spacing:1.5px;
  text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
.mf-input { width:100%; padding:12px 16px; background:var(--s); border:1px solid var(--border);
  border-radius:8px; color:var(--text); font-family:var(--fb); font-size:.95rem;
  outline:none; transition:border-color .2s,box-shadow .2s; }
.mf-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(0,255,179,.1); }
.mf-input--err { border-color:var(--danger) !important; }
.mf-error { font-size:.73rem; color:var(--danger); margin-top:5px; display:block; }
.mf-hint  { font-size:.68rem; color:var(--dim); margin-top:5px; display:block; }

/* Mode grid inside modal */
.mode-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.mode-tile { padding:12px 10px; background:var(--s); border:1px solid var(--border);
  border-radius:10px; cursor:pointer; text-align:center; transition:all .2s; font-family:inherit; }
.mode-tile:hover { border-color:var(--border2); }
.mode-tile--on { border-color:var(--accent) !important; background:rgba(0,255,179,.07); }
.mt-icon { display:block; font-size:1.5rem; margin-bottom:4px; }
.mt-name { display:block; font-family:var(--fd); font-size:1rem; letter-spacing:1.5px; color:var(--text); }
.mt-desc { display:block; font-size:.67rem; color:var(--muted); margin-top:2px; }

/* Range in modal */
.mf-range { width:100%; margin-top:8px; cursor:pointer; -webkit-appearance:none;
  height:4px; border-radius:2px; outline:none;
  background:linear-gradient(to right,var(--accent) 0%,var(--accent) var(--pct,20%),rgba(255,255,255,.08) var(--pct,20%),rgba(255,255,255,.08) 100%); }
.mf-range::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px;
  border-radius:50%; background:var(--accent); border:2px solid var(--bg);
  cursor:pointer; box-shadow:0 0 10px rgba(0,255,179,.5); }
.mf-range-labels { display:flex; justify-content:space-between; font-size:.65rem; color:var(--muted); margin-top:6px; }
.rl-active { color:var(--accent); font-weight:700; }
.mf-info { margin-bottom:18px; padding:10px 14px; border-radius:8px;
  background:rgba(0,184,255,.06); border:1px solid rgba(0,184,255,.15);
  font-size:.8rem; color:var(--muted); }
.mf-info strong { color:var(--accent2); }

.modal-launch { position:relative; width:100%; padding:15px;
  font-family:var(--fd); font-size:1.3rem; letter-spacing:3px;
  color:var(--bg); background:var(--accent); border:none; border-radius:8px;
  cursor:pointer; overflow:hidden; transition:all .2s; box-shadow:0 0 28px rgba(0,255,179,.3); }
.modal-launch:hover { box-shadow:0 0 50px rgba(0,255,179,.5); transform:translateY(-1px); }
.launch-shimmer { position:absolute; inset:0; border-radius:8px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
  transform:translateX(-100%); transition:transform .4s; }
.modal-launch:hover .launch-shimmer { transform:translateX(100%); }

/* ── Responsive ── */
@media(max-width:640px) {
  .nav-links { display:none; }
  .nav-mobile-cta { display:block; }
  .cta-row { flex-direction:column; align-items:center; }
  .cta-primary,.cta-ghost { width:100%; max-width:300px; text-align:center; }
  .stats-bar { flex-wrap:wrap; }
  .stat-div { display:none; }
  .stat-cell { min-width:50%; border-bottom:1px solid var(--border); }
  .stat-cell:nth-child(n+5) { border-bottom:none; }
  .modes-grid { grid-template-columns:1fr 1fr; }
  .howto-grid { grid-template-columns:1fr 1fr; }
  .modal-box { padding:28px 18px; }
  .mode-grid { grid-template-columns:1fr 1fr; }
  .footer-inner { flex-direction:column; text-align:center; }
  .kb-callout { display:none; }
}
@media(max-width:380px) {
  .modes-grid,.howto-grid,.mode-grid { grid-template-columns:1fr; }
  .ht-flags { font-size:clamp(4rem,22vw,9rem); }
}
`;
