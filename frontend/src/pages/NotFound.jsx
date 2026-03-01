import React, { useEffect, useRef } from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #060d16; --s: rgba(255,255,255,0.04); --s2: rgba(255,255,255,0.08);
  --border: rgba(255,255,255,0.09); --accent: #00ffb3; --accent2: #00b8ff;
  --danger: #ff4466; --text: #f0f4f8; --muted: #6a7f96;
  --fd: 'Bebas Neue', sans-serif; --fb: 'Outfit', sans-serif;
}
body { background: var(--bg); color: var(--text); font-family: var(--fb); }

.nf-root {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg); position: relative; overflow: hidden; padding: 20px;
}
.nf-bg-grid {
  position: fixed; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(255,68,102,0.03) 1px,transparent 1px),
                    linear-gradient(90deg,rgba(255,68,102,0.03) 1px,transparent 1px);
  background-size: 40px 40px;
}
.nf-bg-glow {
  position: fixed; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,68,102,0.06) 0%, transparent 70%);
}
canvas.nf-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 0; }

.nf-card {
  position: relative; z-index: 10; text-align: center;
  max-width: 520px; width: 100%;
  animation: cardIn 0.6s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes cardIn { from{opacity:0;transform:translateY(30px) scale(0.95)} to{opacity:1;transform:none} }

.nf-404-wrap { position: relative; margin-bottom: 8px; }
.nf-404 {
  font-family: var(--fd); font-size: clamp(7rem, 25vw, 14rem);
  letter-spacing: 8px; line-height: 1;
  background: linear-gradient(135deg, rgba(255,68,102,0.8) 0%, rgba(255,68,102,0.2) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  position: relative;
  text-shadow: none;
  filter: drop-shadow(0 0 40px rgba(255,68,102,0.3));
}
.nf-glitch {
  position: absolute; inset: 0;
  font-family: var(--fd); font-size: clamp(7rem, 25vw, 14rem);
  letter-spacing: 8px; line-height: 1;
  color: rgba(0,255,179,0.15);
  animation: glitch1 3s infinite;
  clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
}
.nf-glitch2 {
  position: absolute; inset: 0;
  font-family: var(--fd); font-size: clamp(7rem, 25vw, 14rem);
  letter-spacing: 8px; line-height: 1;
  color: rgba(0,184,255,0.1);
  animation: glitch2 3s infinite 0.5s;
  clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
}
@keyframes glitch1 {
  0%,90%,100% { transform: translateX(0); opacity: 0; }
  91% { transform: translateX(-4px); opacity: 1; }
  93% { transform: translateX(4px); opacity: 1; }
  95% { transform: translateX(0); opacity: 0; }
}
@keyframes glitch2 {
  0%,88%,100% { transform: translateX(0); opacity: 0; }
  89% { transform: translateX(3px); opacity: 1; }
  91% { transform: translateX(-3px); opacity: 1; }
  93% { transform: translateX(0); opacity: 0; }
}

.nf-icon { font-size: 2.5rem; margin-bottom: 8px; display: block; animation: float 3s ease infinite; }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

.nf-title {
  font-family: var(--fd); font-size: clamp(1.4rem, 5vw, 2.2rem);
  letter-spacing: 4px; color: var(--text); margin-bottom: 12px;
}
.nf-sub { font-size: 0.88rem; color: var(--muted); line-height: 1.6; margin-bottom: 36px; max-width: 360px; margin-left: auto; margin-right: auto; }

.nf-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.nf-btn-primary {
  padding: 14px 36px; font-family: var(--fd); font-size: 1.15rem; letter-spacing: 3px;
  color: var(--bg); background: var(--accent); border: none; border-radius: 6px;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 0 24px rgba(0,255,179,0.35);
  position: relative; overflow: hidden;
}
.nf-btn-primary::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);
  transform: translateX(-100%); transition: transform 0.4s;
}
.nf-btn-primary:hover { box-shadow: 0 0 40px rgba(0,255,179,0.5); transform: translateY(-1px); }
.nf-btn-primary:hover::before { transform: translateX(100%); }

.nf-btn-secondary {
  padding: 14px 24px; font-family: var(--fd); font-size: 1rem; letter-spacing: 2px;
  color: var(--muted); background: var(--s); border: 1px solid var(--border);
  border-radius: 6px; cursor: pointer; transition: all 0.2s;
}
.nf-btn-secondary:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }

.nf-divider { width: 60px; height: 2px; background: linear-gradient(90deg, transparent, var(--danger), transparent); margin: 24px auto; }

/* Scan line */
.nf-scanbar {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,255,179,0.4), transparent);
  animation: scanMove 3s ease infinite;
  pointer-events: none;
}
@keyframes scanMove {
  0% { top: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
`;

const NotFound = ({ onHome }) => {
  const canvasRef = useRef(null);

  // Falling particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, animId;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.4 + 0.1,
      a: Math.random() * 0.4 + 0.05, color: Math.random() > 0.5 ? "#ff4466" : "#00ffb3",
    }));
    (function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.a; ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    })();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  const handleHome = () => {
    if (onHome) onHome();
  };

  return (
    <div className="nf-root">
      <style>{CSS}</style>
      <div className="nf-bg-grid" />
      <div className="nf-bg-glow" />
      <canvas className="nf-canvas" ref={canvasRef} />

      <div className="nf-card">
        <div className="nf-404-wrap">
          <div className="nf-glitch">404</div>
          <div className="nf-glitch2">404</div>
          <div className="nf-404">404</div>
          <div className="nf-scanbar" />
        </div>

        <span className="nf-icon">🏳️</span>
        <h1 className="nf-title">FLAG NOT FOUND</h1>
        <div className="nf-divider" />
        <p className="nf-sub">
          Looks like this page went off the map. The coordinates you're looking for don't exist in our atlas.
        </p>

        <div className="nf-actions">
          <button className="nf-btn-primary" onClick={handleHome}>
            ⌂ BACK TO HOME
          </button>
          <button className="nf-btn-secondary" onClick={() => window.history.back()}>
            ← GO BACK
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
