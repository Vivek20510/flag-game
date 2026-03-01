import React, { useEffect, useState, useRef, useCallback } from "react";

// ─── Floating Flag Orb ───────────────────────────────────────────────────────
const FLAG_CODES = [
  "us","gb","jp","de","fr","br","in","cn","au","ca",
  "it","es","mx","kr","ng","za","ar","se","no","pk",
  "eg","th","vn","pl","ua","tr","sa","ae","gh","ke",
];

function FloatingFlag({ code, style }) {
  return (
    <div className="float-flag" style={style}>
      <div className="flag-orb-glow" />
      <img
        src={`https://flagcdn.com/w80/${code}.png`}
        alt={code}
        className="flag-orb-img"
        loading="lazy"
      />
    </div>
  );
}

// ─── Particle Canvas ─────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let W, H;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.7 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 180, ${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ end, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        let start = 0;
        const step = Math.ceil(end / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setVal(end); clearInterval(timer); }
          else setVal(start);
        }, 16);
        obs.disconnect();
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Mode Card ────────────────────────────────────────────────────────────────
function ModeCard({ icon, title, desc, tag, delay, onClick }) {
  return (
    <button
      className="mode-card"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      {tag && <span className="mode-tag">{tag}</span>}
      <div className="mode-icon">{icon}</div>
      <h3 className="mode-title">{title}</h3>
      <p className="mode-desc">{desc}</p>
      <div className="mode-arrow">→</div>
    </button>
  );
}

// ─── GameStartModal ───────────────────────────────────────────────────────────
function GameStartModal({ onStart, onClose, defaultMode }) {
  const [username, setUsername] = useState("");
  const [gameMode, setGameMode] = useState(defaultMode || "classic");
  const [flagCount, setFlagCount] = useState(10);
  const [error, setError] = useState("");

  const modes = [
    { value: "classic", label: "Classic", icon: "🎯" },
    { value: "lightning", label: "Lightning", icon: "⚡" },
    { value: "survival", label: "Survival", icon: "❤️" },
    { value: "hard", label: "Hard", icon: "💀" },
  ];

  const handleSubmit = () => {
    if (!username.trim()) { setError("Enter your name to continue"); return; }
    onStart({ username: username.trim(), gameMode, flagCount });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <span className="modal-emoji">🌍</span>
          <h2>Ready to Play?</h2>
          <p>Set your preferences and enter the arena</p>
        </div>

        <div className="modal-field">
          <label>Your Name</label>
          <input
            className={`modal-input ${error ? "modal-input--error" : ""}`}
            placeholder="e.g. GeoMaster99"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          {error && <span className="modal-error">{error}</span>}
        </div>

        <div className="modal-field">
          <label>Game Mode</label>
          <div className="mode-pills">
            {modes.map((m) => (
              <button
                key={m.value}
                className={`mode-pill ${gameMode === m.value ? "mode-pill--active" : ""}`}
                onClick={() => setGameMode(m.value)}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-field">
          <label>Number of Flags — <b>{flagCount}</b></label>
          <input
            type="range"
            min={5} max={50} step={5}
            value={flagCount}
            onChange={(e) => setFlagCount(Number(e.target.value))}
            className="modal-range"
          />
          <div className="range-labels"><span>5</span><span>50</span></div>
        </div>

        <button className="modal-start-btn" onClick={handleSubmit}>
          <span>Launch Game</span>
          <span className="btn-glow-ring" />
        </button>
      </div>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
const MOCK_LEADERBOARD = [
  { username: "FlagLegend", score: 9840, country: "🇯🇵" },
  { username: "GeoWizard", score: 8200, country: "🇧🇷" },
  { username: "MapMaster", score: 7650, country: "🇩🇪" },
  { username: "WorldPro", score: 6900, country: "🇺🇸" },
  { username: "AtlasKing", score: 5300, country: "🇿🇦" },
];

export default function Home({ onStart, onNavigate }) {
  const [topPlayers, setTopPlayers] = useState(MOCK_LEADERBOARD.slice(0, 3));
  const [showModal, setShowModal] = useState(false);
  const [defaultMode, setDefaultMode] = useState("classic");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("top3");

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const floatingFlags = FLAG_CODES.map((code, i) => ({
    code,
    style: {
      left: `${(i * 37 + 5) % 95}%`,
      top: `${(i * 23 + 8) % 90}%`,
      animationDuration: `${8 + (i % 5) * 2}s`,
      animationDelay: `${(i * 0.4) % 4}s`,
      opacity: 0.15 + (i % 4) * 0.07,
    },
  }));

  const handleStartGame = (config) => {
    setShowModal(false);
    if (onStart) onStart(config);
  };

  const openMode = (mode) => {
    setDefaultMode(mode);
    setShowModal(true);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #050c14;
          --surface: rgba(255,255,255,0.04);
          --surface2: rgba(255,255,255,0.07);
          --border: rgba(255,255,255,0.08);
          --accent: #00ffb3;
          --accent2: #00b8ff;
          --accent3: #ff6b35;
          --text: #f0f4f8;
          --muted: #7a8fa6;
          --danger: #ff4466;
          --gold: #ffd700;
          --silver: #c0c0c0;
          --bronze: #cd7f32;
          --font-display: 'Bebas Neue', sans-serif;
          --font-body: 'Outfit', sans-serif;
          --glow: 0 0 30px rgba(0,255,179,0.25);
          --glow2: 0 0 40px rgba(0,184,255,0.2);
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-body); overflow-x: hidden; }

        /* ── Layout ── */
        .home { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

        /* ── Background grid ── */
        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(0,255,179,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,179,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .bg-gradient {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,184,255,0.12) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0,255,179,0.07) 0%, transparent 50%);
        }

        /* ── Floating flags ── */
        .flags-bg { position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
        .float-flag {
          position: absolute; width: 54px; height: 36px;
          border-radius: 4px; overflow: hidden;
          animation: floatDrift linear infinite;
          filter: blur(0.5px);
        }
        .float-flag:hover { opacity: 1 !important; filter: none; }
        .flag-orb-glow {
          position: absolute; inset: -6px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,255,179,0.3), transparent 70%);
          z-index: -1;
        }
        .flag-orb-img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
        @keyframes floatDrift {
          0%   { transform: translateY(0px) translateX(0px) rotate(-1deg); }
          25%  { transform: translateY(-18px) translateX(8px) rotate(1deg); }
          50%  { transform: translateY(-8px) translateX(-6px) rotate(-0.5deg); }
          75%  { transform: translateY(-22px) translateX(4px) rotate(1.5deg); }
          100% { transform: translateY(0px) translateX(0px) rotate(-1deg); }
        }

        /* ── Content ── */
        .content { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; padding: 0 20px; }

        /* ── Nav ── */
        .nav {
          width: 100%; max-width: 1100px; display: flex; align-items: center; justify-content: space-between;
          padding: 24px 0; margin-bottom: 20px;
        }
        .nav-logo { font-family: var(--font-display); font-size: 1.4rem; letter-spacing: 3px; color: var(--accent); }
        .nav-links { display: flex; gap: 8px; }
        .nav-link {
          padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border);
          background: var(--surface); color: var(--muted); font-family: var(--font-body);
          font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
          letter-spacing: 0.5px;
        }
        .nav-link:hover { border-color: var(--accent); color: var(--accent); background: rgba(0,255,179,0.06); }

        /* ── Hero ── */
        .hero {
          width: 100%; max-width: 900px; text-align: center;
          padding: 40px 0 20px;
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .hero.visible { opacity: 1; transform: translateY(0); }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 20px;
          border: 1px solid rgba(0,255,179,0.3);
          background: rgba(0,255,179,0.06);
          font-size: 0.72rem; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
          color: var(--accent); margin-bottom: 24px;
        }
        .hero-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }

        .hero-title {
          font-family: var(--font-display); font-size: clamp(4.5rem, 12vw, 9rem);
          line-height: 0.9; letter-spacing: 4px; margin-bottom: 16px;
          background: linear-gradient(135deg, #ffffff 30%, var(--accent) 70%, var(--accent2) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          text-shadow: none;
        }
        .hero-title span { display: block; }
        .hero-title .accent-word {
          font-size: clamp(3rem, 8vw, 6rem);
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .hero-sub {
          font-size: clamp(0.95rem, 2vw, 1.15rem); color: var(--muted);
          max-width: 520px; margin: 0 auto 40px; line-height: 1.7; font-weight: 300;
        }

        /* ── CTA Buttons ── */
        .cta-group { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 60px; }
        .btn-primary {
          position: relative; padding: 16px 44px;
          font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 3px;
          color: var(--bg); background: var(--accent);
          border: none; border-radius: 4px; cursor: pointer;
          overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 30px rgba(0,255,179,0.4), 0 4px 20px rgba(0,0,0,0.4);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 50px rgba(0,255,179,0.6), 0 8px 30px rgba(0,0,0,0.5); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: translateX(-100%); transition: transform 0.5s;
        }
        .btn-primary:hover::before { transform: translateX(100%); }

        .btn-secondary {
          padding: 16px 32px;
          font-family: var(--font-display); font-size: 1.1rem; letter-spacing: 2px;
          color: var(--accent2); background: transparent;
          border: 1px solid rgba(0,184,255,0.4); border-radius: 4px; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover { background: rgba(0,184,255,0.1); border-color: var(--accent2); box-shadow: 0 0 20px rgba(0,184,255,0.2); }

        /* ── Stats strip ── */
        .stats-strip {
          display: flex; gap: 0; width: 100%; max-width: 700px;
          border: 1px solid var(--border); border-radius: 12px;
          overflow: hidden; margin-bottom: 80px; backdrop-filter: blur(10px);
          background: var(--surface);
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.7s 0.3s ease, transform 0.7s 0.3s ease;
        }
        .stats-strip.visible { opacity: 1; transform: translateY(0); }
        .stat-item {
          flex: 1; padding: 20px 16px; text-align: center;
          border-right: 1px solid var(--border);
        }
        .stat-item:last-child { border-right: none; }
        .stat-num { font-family: var(--font-display); font-size: 2rem; letter-spacing: 2px; color: var(--accent); line-height: 1; }
        .stat-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }

        /* ── Section header ── */
        .section-header { text-align: center; margin-bottom: 36px; }
        .section-label {
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 3px; color: var(--accent);
          font-weight: 600; margin-bottom: 10px; display: block;
        }
        .section-title { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); letter-spacing: 3px; color: var(--text); }

        /* ── Game Modes ── */
        .modes-section { width: 100%; max-width: 1000px; margin-bottom: 80px; }
        .modes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .mode-card {
          position: relative; padding: 28px 22px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; cursor: pointer; text-align: left;
          transition: all 0.3s; overflow: hidden;
          animation: fadeSlideUp 0.5s both;
          font-family: inherit;
        }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .mode-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,255,179,0.06), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .mode-card:hover { border-color: rgba(0,255,179,0.4); transform: translateY(-4px); box-shadow: var(--glow), 0 16px 40px rgba(0,0,0,0.4); }
        .mode-card:hover::before { opacity: 1; }
        .mode-tag {
          position: absolute; top: 12px; right: 12px;
          font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1.5px;
          padding: 3px 8px; border-radius: 20px; font-weight: 700;
          background: rgba(255,107,53,0.2); color: var(--accent3); border: 1px solid rgba(255,107,53,0.3);
        }
        .mode-icon { font-size: 2rem; margin-bottom: 12px; display: block; }
        .mode-title { font-family: var(--font-display); font-size: 1.4rem; letter-spacing: 2px; color: var(--text); margin-bottom: 8px; }
        .mode-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.5; }
        .mode-arrow { margin-top: 16px; color: var(--accent); font-size: 1.2rem; transition: transform 0.2s; }
        .mode-card:hover .mode-arrow { transform: translateX(6px); }

        /* ── Leaderboard ── */
        .leaderboard-section { width: 100%; max-width: 640px; margin-bottom: 80px; }
        .lb-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; overflow: hidden; backdrop-filter: blur(10px);
        }
        .lb-tabs { display: flex; border-bottom: 1px solid var(--border); }
        .lb-tab {
          flex: 1; padding: 14px; font-family: var(--font-body);
          font-size: 0.8rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
          color: var(--muted); background: transparent; border: none; cursor: pointer; transition: all 0.2s;
        }
        .lb-tab--active { color: var(--accent); border-bottom: 2px solid var(--accent); background: rgba(0,255,179,0.04); }
        .lb-rows { padding: 8px 0; }
        .lb-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 20px; transition: background 0.2s; cursor: default;
        }
        .lb-row:hover { background: var(--surface2); }
        .lb-rank { font-family: var(--font-display); font-size: 1.4rem; width: 32px; text-align: center; }
        .lb-rank--1 { color: var(--gold); }
        .lb-rank--2 { color: var(--silver); }
        .lb-rank--3 { color: var(--bronze); }
        .lb-rank--other { color: var(--muted); font-size: 1rem; }
        .lb-avatar {
          width: 38px; height: 38px; border-radius: 50%; overflow: hidden;
          border: 2px solid var(--border); flex-shrink: 0;
        }
        .lb-avatar img { width: 100%; height: 100%; }
        .lb-info { flex: 1; }
        .lb-name { font-weight: 600; font-size: 0.9rem; color: var(--text); }
        .lb-meta { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
        .lb-score { font-family: var(--font-display); font-size: 1.5rem; letter-spacing: 1px; color: var(--accent); }
        .lb-footer { padding: 14px 20px; border-top: 1px solid var(--border); text-align: center; }
        .lb-btn {
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase; color: var(--accent2);
          background: transparent; border: none; cursor: pointer; transition: color 0.2s;
        }
        .lb-btn:hover { color: var(--text); }

        /* ── How to Play ── */
        .howto-section { width: 100%; max-width: 800px; margin-bottom: 100px; }
        .howto-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; }
        .howto-step {
          padding: 24px 20px; background: var(--surface);
          border: 1px solid var(--border); border-radius: 12px; text-align: center;
          transition: border-color 0.3s;
        }
        .howto-step:hover { border-color: rgba(0,184,255,0.4); }
        .howto-step-num {
          font-family: var(--font-display); font-size: 3rem; color: rgba(0,255,179,0.15);
          line-height: 1; margin-bottom: 12px;
        }
        .howto-step h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; }
        .howto-step p { font-size: 0.8rem; color: var(--muted); line-height: 1.6; }

        /* ── Footer ── */
        .footer {
          width: 100%; border-top: 1px solid var(--border);
          padding: 24px 20px; text-align: center; font-size: 0.75rem;
          color: var(--muted); letter-spacing: 1px; position: relative; z-index: 10;
        }
        .footer span { color: var(--accent); }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(5,12,20,0.85); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-box {
          position: relative; width: 100%; max-width: 460px;
          background: #0a1520; border: 1px solid rgba(0,255,179,0.2);
          border-radius: 20px; padding: 40px 32px;
          box-shadow: 0 0 60px rgba(0,255,179,0.1), 0 30px 60px rgba(0,0,0,0.6);
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(30px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        .modal-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--surface2); border: 1px solid var(--border);
          color: var(--muted); font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
        }
        .modal-close:hover { color: var(--text); border-color: var(--accent); }
        .modal-header { text-align: center; margin-bottom: 28px; }
        .modal-emoji { font-size: 2.5rem; display: block; margin-bottom: 12px; }
        .modal-header h2 { font-family: var(--font-display); font-size: 2rem; letter-spacing: 3px; margin-bottom: 6px; }
        .modal-header p { font-size: 0.85rem; color: var(--muted); }
        .modal-field { margin-bottom: 22px; }
        .modal-field label { display: block; font-size: 0.72rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
        .modal-input {
          width: 100%; padding: 12px 16px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text); font-family: var(--font-body); font-size: 0.95rem;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .modal-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,255,179,0.1); }
        .modal-input--error { border-color: var(--danger) !important; }
        .modal-error { font-size: 0.75rem; color: var(--danger); margin-top: 6px; display: block; }
        .mode-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .mode-pill {
          padding: 8px 14px; border-radius: 20px;
          border: 1px solid var(--border); background: var(--surface);
          color: var(--muted); font-family: var(--font-body); font-size: 0.8rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .mode-pill--active { border-color: var(--accent); color: var(--accent); background: rgba(0,255,179,0.08); }
        .modal-range {
          width: 100%; margin-top: 6px; cursor: pointer;
          -webkit-appearance: none; height: 4px; border-radius: 2px;
          background: linear-gradient(to right, var(--accent) 0%, var(--surface2) 0%);
          outline: none;
        }
        .modal-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: var(--accent); border: 2px solid var(--bg); cursor: pointer;
          box-shadow: 0 0 10px rgba(0,255,179,0.5);
        }
        .range-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--muted); margin-top: 4px; }
        .modal-start-btn {
          position: relative; width: 100%; padding: 16px;
          font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 3px;
          color: var(--bg); background: var(--accent); border: none; border-radius: 8px;
          cursor: pointer; overflow: hidden; transition: all 0.2s;
          box-shadow: 0 0 30px rgba(0,255,179,0.3);
        }
        .modal-start-btn:hover { box-shadow: 0 0 50px rgba(0,255,179,0.5); transform: translateY(-1px); }
        .btn-glow-ring {
          position: absolute; inset: 0; border-radius: 8px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: translateX(-100%); transition: transform 0.4s;
        }
        .modal-start-btn:hover .btn-glow-ring { transform: translateX(100%); }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .nav-links { display: none; }
          .hero { padding: 20px 0 10px; }
          .cta-group { flex-direction: column; align-items: center; }
          .btn-primary, .btn-secondary { width: 100%; max-width: 300px; text-align: center; }
          .stats-strip { flex-direction: column; }
          .stat-item { border-right: none; border-bottom: 1px solid var(--border); }
          .stat-item:last-child { border-bottom: none; }
          .modes-grid { grid-template-columns: 1fr 1fr; }
          .modal-box { padding: 28px 20px; }
        }
        @media (max-width: 360px) {
          .modes-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Backgrounds */}
      <div className="bg-grid" />
      <div className="bg-gradient" />
      <ParticleCanvas />

      {/* Floating flags */}
      <div className="flags-bg">
        {floatingFlags.map((f, i) => (
          <FloatingFlag key={i} code={f.code} style={f.style} />
        ))}
      </div>

      {/* Main content */}
      <div className="home">
        <div className="content">

          {/* Nav */}
          <nav className="nav">
            <span className="nav-logo">🌍 FLAGMASTER</span>
            <div className="nav-links">
              <button className="nav-link" onClick={() => onNavigate?.("leaderboard")}>Leaderboard</button>
              <button className="nav-link" onClick={() => onNavigate?.("daily")}>Daily Challenge</button>
              <button className="nav-link" onClick={() => onNavigate?.("multiplayer")}>Multiplayer</button>
            </div>
          </nav>

          {/* Hero */}
          <section className={`hero ${mounted ? "visible" : ""}`}>
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              250+ Countries · Real-time · Free to Play
            </div>
            <h1 className="hero-title">
              <span>KNOW YOUR</span>
              <span className="accent-word">FLAGS</span>
            </h1>
            <p className="hero-sub">
              Test your geography knowledge against the world. Guess flags, climb the leaderboard, and challenge friends in real-time duels.
            </p>
            <div className="cta-group">
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                ▶ PLAY NOW
              </button>
              <button className="btn-secondary" onClick={() => openMode("survival")}>
                💀 SURVIVAL MODE
              </button>
            </div>
          </section>

          {/* Stats */}
          <div className={`stats-strip ${mounted ? "visible" : ""}`}>
            <div className="stat-item">
              <div className="stat-num"><Counter end={250} suffix="+" /></div>
              <div className="stat-label">Countries</div>
            </div>
            <div className="stat-item">
              <div className="stat-num"><Counter end={6} /></div>
              <div className="stat-label">Game Modes</div>
            </div>
            <div className="stat-item">
              <div className="stat-num"><Counter end={12400} suffix="+" /></div>
              <div className="stat-label">Players</div>
            </div>
            <div className="stat-item">
              <div className="stat-num"><Counter end={99} suffix="%" /></div>
              <div className="stat-label">Free Forever</div>
            </div>
          </div>

          {/* Game Modes */}
          <section className="modes-section">
            <div className="section-header">
              <span className="section-label">Choose Your Battle</span>
              <h2 className="section-title">GAME MODES</h2>
            </div>
            <div className="modes-grid">
              <ModeCard
                icon="🎯" title="Classic" delay={0}
                desc="Pick the correct country for each flag. 10–50 flags, your pace."
                onClick={() => openMode("classic")}
              />
              <ModeCard
                icon="⚡" title="Lightning" tag="HOT" delay={80}
                desc="60 flags. 60 seconds. Maximum adrenaline."
                onClick={() => openMode("lightning")}
              />
              <ModeCard
                icon="❤️" title="Survival" delay={160}
                desc="3 lives. Lose them all and it's over. How far can you go?"
                onClick={() => openMode("survival")}
              />
              <ModeCard
                icon="💀" title="Hard Mode" tag="BRUTAL" delay={240}
                desc="Confusable flags only. Chad vs Romania. Think you know?"
                onClick={() => openMode("hard")}
              />
              <ModeCard
                icon="🌙" title="Daily" delay={320}
                desc="Same seed for all players today. Compete globally. One shot."
                onClick={() => openMode("daily")}
              />
              <ModeCard
                icon="⚔️" title="1v1 Duel" tag="LIVE" delay={400}
                desc="Real-time multiplayer. Same flag. First correct wins the round."
                onClick={() => openMode("multiplayer")}
              />
            </div>
          </section>

          {/* Leaderboard */}
          <section className="leaderboard-section">
            <div className="section-header">
              <span className="section-label">Hall of Fame</span>
              <h2 className="section-title">LEADERBOARD</h2>
            </div>
            <div className="lb-card">
              <div className="lb-tabs">
                {["top3", "weekly", "alltime"].map((tab) => (
                  <button
                    key={tab}
                    className={`lb-tab ${activeTab === tab ? "lb-tab--active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "top3" ? "🏆 Top 3" : tab === "weekly" ? "📅 Weekly" : "⭐ All Time"}
                  </button>
                ))}
              </div>
              <div className="lb-rows">
                {(activeTab === "top3" ? topPlayers : MOCK_LEADERBOARD).map((player, i) => (
                  <div className="lb-row" key={i}>
                    <div className={`lb-rank lb-rank--${i < 3 ? i + 1 : "other"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </div>
                    <div className="lb-avatar">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                        alt={player.username}
                      />
                    </div>
                    <div className="lb-info">
                      <div className="lb-name">{player.username} {player.country}</div>
                      <div className="lb-meta">Classic · {Math.floor(Math.random() * 50 + 20)} flags</div>
                    </div>
                    <div className="lb-score">{player.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="lb-footer">
                <button className="lb-btn" onClick={() => onNavigate?.("leaderboard")}>
                  VIEW FULL LEADERBOARD →
                </button>
              </div>
            </div>
          </section>

          {/* How to Play */}
          <section className="howto-section">
            <div className="section-header">
              <span className="section-label">Get Started</span>
              <h2 className="section-title">HOW TO PLAY</h2>
            </div>
            <div className="howto-steps">
              {[
                { n: "01", title: "Pick a Mode", desc: "Choose Classic, Lightning, Survival or Hard mode based on your skill level." },
                { n: "02", title: "Spot the Flag", desc: "A country flag appears on screen. Study the colors, symbols, and design." },
                { n: "03", title: "Choose Fast", desc: "Pick the correct country from 4 options. Speed bonuses reward quick thinkers." },
                { n: "04", title: "Climb the Ranks", desc: "Score points, build streaks, and rise to the top of the global leaderboard." },
              ].map((step) => (
                <div className="howto-step" key={step.n}>
                  <div className="howto-step-num">{step.n}</div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="footer">
          Built with <span>♥</span> · Flags from <span>flagcdn.com</span> · Data from <span>restcountries.com</span>
        </footer>
      </div>

      {/* Modal */}
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
