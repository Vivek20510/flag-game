import React, { useEffect, useState, useRef } from "react";
import { getLeaderboard } from "../firebase/leaderboardService";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #060d16; --s: rgba(255,255,255,0.04); --s2: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.09); --accent: #00ffb3; --accent2: #00b8ff;
  --danger: #ff4466; --warn: #ff8800; --text: #f0f4f8; --muted: #6a7f96;
  --gold: #ffd700; --silver: #c0c0c0; --bronze: #cd7f32;
  --fd: 'Bebas Neue', sans-serif; --fb: 'Outfit', sans-serif;
}
body { background: var(--bg); color: var(--text); font-family: var(--fb); }

.lb-root { min-height: 100vh; position: relative; background: var(--bg); overflow-x: hidden; }
.lb-bg-grid {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: linear-gradient(rgba(0,255,179,0.025) 1px,transparent 1px),
                    linear-gradient(90deg,rgba(0,255,179,0.025) 1px,transparent 1px);
  background-size: 40px 40px;
}
.lb-bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 70% 40% at 50% -5%, rgba(0,255,179,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 50% 30% at 80% 90%, rgba(0,184,255,0.05) 0%, transparent 50%);
}
.lb-layout { position: relative; z-index: 10; max-width: 760px; margin: 0 auto; padding: 0 20px 60px; }

/* ── Header ── */
.lb-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 0 30px; }
.lb-back-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 8px;
  background: var(--s); border: 1px solid var(--border);
  color: var(--muted); font-family: var(--fb); font-size: 0.82rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px;
}
.lb-back-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(0,255,179,0.05); }
.lb-logo { font-family: var(--fd); font-size: 1.3rem; letter-spacing: 3px; color: var(--accent); }

/* ── Hero ── */
.lb-hero { text-align: center; padding: 10px 0 40px; }
.lb-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 14px; border-radius: 20px;
  border: 1px solid rgba(0,255,179,0.25); background: rgba(0,255,179,0.05);
  font-size: 0.68rem; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
  color: var(--accent); margin-bottom: 18px;
}
.lb-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: dotPulse 2s infinite; }
@keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
.lb-title { font-family: var(--fd); font-size: clamp(3rem, 10vw, 5.5rem); letter-spacing: 5px; line-height: 0.9; margin-bottom: 12px; background: linear-gradient(135deg, #fff 30%, var(--accent) 70%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.lb-sub { font-size: 0.85rem; color: var(--muted); letter-spacing: 0.5px; }

/* ── Tabs ── */
.lb-tabs-wrap { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; flex-wrap: wrap; }
.lb-tab-btn {
  padding: 9px 20px; border-radius: 20px;
  border: 1px solid var(--border); background: var(--s);
  color: var(--muted); font-family: var(--fb); font-size: 0.78rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px;
}
.lb-tab-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(0,255,179,0.08); }
.lb-tab-btn:hover:not(.active) { border-color: rgba(255,255,255,0.15); color: var(--text); }

/* ── Stats strip ── */
.lb-stats { display: flex; background: var(--s); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 28px; }
.lb-stat { flex: 1; padding: 14px 10px; text-align: center; border-right: 1px solid var(--border); }
.lb-stat:last-child { border-right: none; }
.lb-stat-num { font-family: var(--fd); font-size: 1.5rem; letter-spacing: 1px; color: var(--accent); }
.lb-stat-key { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }

/* ── Top 3 podium ── */
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 12px; margin-bottom: 32px; }
.podium-slot { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.podium-avatar { border-radius: 50%; overflow: hidden; border: 3px solid var(--border); position: relative; }
.podium-avatar img { display: block; }
.podium-crown { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 1.2rem; }
.podium-name { font-size: 0.78rem; font-weight: 600; text-align: center; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.podium-score { font-family: var(--fd); font-size: 1.1rem; letter-spacing: 1px; }
.podium-base { display: flex; align-items: center; justify-content: center; border-radius: 6px 6px 0 0; font-family: var(--fd); font-size: 1.6rem; letter-spacing: 2px; width: 80px; }

.podium-slot.rank-1 .podium-avatar { width: 72px; height: 72px; border-color: var(--gold); box-shadow: 0 0 20px rgba(255,215,0,0.3); }
.podium-slot.rank-1 .podium-avatar img { width: 72px; height: 72px; }
.podium-slot.rank-1 .podium-score { color: var(--gold); }
.podium-slot.rank-1 .podium-base { height: 80px; background: linear-gradient(180deg,rgba(255,215,0,0.15),rgba(255,215,0,0.05)); border: 1px solid rgba(255,215,0,0.3); color: var(--gold); }

.podium-slot.rank-2 .podium-avatar { width: 58px; height: 58px; border-color: var(--silver); box-shadow: 0 0 14px rgba(192,192,192,0.2); }
.podium-slot.rank-2 .podium-avatar img { width: 58px; height: 58px; }
.podium-slot.rank-2 .podium-score { color: var(--silver); }
.podium-slot.rank-2 .podium-base { height: 60px; background: linear-gradient(180deg,rgba(192,192,192,0.12),rgba(192,192,192,0.04)); border: 1px solid rgba(192,192,192,0.2); color: var(--silver); }

.podium-slot.rank-3 .podium-avatar { width: 50px; height: 50px; border-color: var(--bronze); box-shadow: 0 0 12px rgba(205,127,50,0.2); }
.podium-slot.rank-3 .podium-avatar img { width: 50px; height: 50px; }
.podium-slot.rank-3 .podium-score { color: var(--bronze); }
.podium-slot.rank-3 .podium-base { height: 46px; background: linear-gradient(180deg,rgba(205,127,50,0.12),rgba(205,127,50,0.04)); border: 1px solid rgba(205,127,50,0.2); color: var(--bronze); }

/* ── Full table ── */
.lb-table-card { background: var(--s); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.lb-table-head { display: grid; grid-template-columns: 52px 1fr auto auto; gap: 0; padding: 10px 20px; border-bottom: 1px solid var(--border); }
.lb-th { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); }
.lb-row {
  display: grid; grid-template-columns: 52px 1fr auto auto;
  align-items: center; padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.15s; gap: 0;
  animation: rowIn 0.4s both;
}
@keyframes rowIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
.lb-row:last-child { border-bottom: none; }
.lb-row:hover { background: var(--s2); }
.lb-row.current-user { background: rgba(0,255,179,0.04); border-left: 3px solid var(--accent); }
.rank-cell { font-family: var(--fd); font-size: 1.2rem; width: 40px; }
.rank-1-c { color: var(--gold); }
.rank-2-c { color: var(--silver); }
.rank-3-c { color: var(--bronze); }
.rank-other { color: var(--muted); font-size: 0.9rem; }
.player-cell { display: flex; align-items: center; gap: 12px; }
.player-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; border: 2px solid var(--border); flex-shrink: 0; }
.player-avatar img { width: 100%; height: 100%; }
.player-info {}
.player-name { font-size: 0.88rem; font-weight: 600; }
.player-meta { font-size: 0.7rem; color: var(--muted); margin-top: 1px; }
.score-cell { font-family: var(--fd); font-size: 1.3rem; letter-spacing: 1px; color: var(--accent); text-align: right; padding-right: 16px; }
.badge-cell { display: flex; justify-content: flex-end; }
.rank-badge { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; border-radius: 10px; font-weight: 700; white-space: nowrap; }
.badge-legend  { background: rgba(255,215,0,0.15); color: var(--gold); border: 1px solid rgba(255,215,0,0.3); }
.badge-master  { background: rgba(0,255,179,0.1); color: var(--accent); border: 1px solid rgba(0,255,179,0.25); }
.badge-expert  { background: rgba(0,184,255,0.1); color: var(--accent2); border: 1px solid rgba(0,184,255,0.2); }
.badge-skilled { background: rgba(255,140,0,0.1); color: var(--warn); border: 1px solid rgba(255,140,0,0.2); }
.badge-rookie  { background: var(--s2); color: var(--muted); border: 1px solid var(--border); }

/* ── Loading / Empty ── */
.lb-loading { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; gap: 16px; }
.lb-ring { width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(0,255,179,0.12); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.lb-empty { text-align: center; padding: 60px 20px; }
.lb-empty-icon { font-size: 3rem; margin-bottom: 12px; }
.lb-empty-text { font-size: 0.85rem; color: var(--muted); }

/* ── Footer ── */
.lb-footer-note { text-align: center; font-size: 0.72rem; color: var(--muted); margin-top: 28px; letter-spacing: 0.5px; }
.lb-footer-note span { color: var(--accent); }

/* ── Responsive ── */
@media (max-width: 500px) {
  .lb-table-head, .lb-row { grid-template-columns: 44px 1fr auto; }
  .badge-cell { display: none; }
  .podium { gap: 6px; }
  .podium-base { width: 66px; }
}
`;

// ─── Rank helpers ─────────────────────────────────────────────────────────────
const getRank = (score) =>
  score >= 5000 ? { label: "LEGEND",  cls: "badge-legend"  } :
  score >= 3000 ? { label: "MASTER",  cls: "badge-master"  } :
  score >= 1500 ? { label: "EXPERT",  cls: "badge-expert"  } :
  score >= 600  ? { label: "SKILLED", cls: "badge-skilled" } :
                  { label: "ROOKIE",  cls: "badge-rookie"  };

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = ["rank-1-c", "rank-2-c", "rank-3-c"];

// ─── Podium component ─────────────────────────────────────────────────────────
function Podium({ players }) {
  if (players.length < 3) return null;
  // Order: 2nd | 1st | 3rd
  const order = [
    { data: players[1], rank: 2 },
    { data: players[0], rank: 1 },
    { data: players[2], rank: 3 },
  ];
  return (
    <div className="podium">
      {order.map(({ data, rank }) => (
        <div key={rank} className={`podium-slot rank-${rank}`}>
          {rank === 1 && <div style={{fontSize:'1.4rem',marginBottom:'4px'}}>👑</div>}
          <div className="podium-avatar" style={{position:'relative'}}>
            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${data.username}`} alt={data.username} />
          </div>
          <div className="podium-name">{data.username}</div>
          <div className="podium-score">{data.score?.toLocaleString()}</div>
          <div className="podium-base">{rank}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Leaderboard Component ───────────────────────────────────────────────
const Leaderboard = ({ onHome }) => {
  const [players, setPlayers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [currentUser]             = useState(() => localStorage.getItem("fm_username") || "");

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getLeaderboard();
        setPlayers(data || []);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Tab filtering (mock weekly/monthly with slice for now — replace with real timestamps)
  const filtered =
    activeTab === "top10"   ? players.slice(0, 10)  :
    activeTab === "weekly"  ? players.slice(0, Math.ceil(players.length * 0.4)) :
    players;

  const totalFlags   = players.reduce((s, p) => s + (p.flagCount || 0), 0);
  const avgScore     = players.length ? Math.round(players.reduce((s, p) => s + (p.score || 0), 0) / players.length) : 0;
  const topScore     = players[0]?.score || 0;

  return (
    <div className="lb-root">
      <style>{CSS}</style>
      <div className="lb-bg-grid" />
      <div className="lb-bg-glow" />

      <div className="lb-layout">

        {/* Header */}
        <header className="lb-header">
          <button className="lb-back-btn" onClick={onHome}>
            ← Back to Home
          </button>
          <span className="lb-logo">🌍 FLAGMASTER</span>
        </header>

        {/* Hero */}
        <div className="lb-hero">
          <div className="lb-eyebrow">
            <span className="lb-dot" />
            Global Rankings · Updated Live
          </div>
          <h1 className="lb-title">LEADERBOARD</h1>
          <p className="lb-sub">The world's best flag hunters — ranked by score</p>
        </div>

        {/* Stats strip */}
        <div className="lb-stats">
          <div className="lb-stat">
            <div className="lb-stat-num">{players.length}</div>
            <div className="lb-stat-key">Players</div>
          </div>
          <div className="lb-stat">
            <div className="lb-stat-num">{topScore.toLocaleString()}</div>
            <div className="lb-stat-key">Top Score</div>
          </div>
          <div className="lb-stat">
            <div className="lb-stat-num">{avgScore.toLocaleString()}</div>
            <div className="lb-stat-key">Avg Score</div>
          </div>
          <div className="lb-stat">
            <div className="lb-stat-num">{totalFlags.toLocaleString()}</div>
            <div className="lb-stat-key">Flags Guessed</div>
          </div>
        </div>

        {/* Podium (top 3) */}
        {!loading && players.length >= 3 && <Podium players={players} />}

        {/* Tabs */}
        <div className="lb-tabs-wrap">
          {[
            { key: "all",    label: "🌍 All Time" },
            { key: "top10",  label: "🏅 Top 10" },
            { key: "weekly", label: "📅 This Week" },
          ].map(t => (
            <button
              key={t.key}
              className={`lb-tab-btn ${activeTab === t.key ? "active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="lb-table-card">
          <div className="lb-table-head">
            <div className="lb-th">#</div>
            <div className="lb-th">Player</div>
            <div className="lb-th" style={{paddingRight:'16px',textAlign:'right'}}>Score</div>
            <div className="lb-th" style={{textAlign:'right'}}>Rank</div>
          </div>

          {loading ? (
            <div className="lb-loading">
              <div className="lb-ring" />
              <span style={{fontSize:'0.75rem',color:'#6a7f96',letterSpacing:'2px',textTransform:'uppercase'}}>Loading scores…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="lb-empty">
              <div className="lb-empty-icon">🏁</div>
              <div className="lb-empty-text">No scores recorded yet. Be the first!</div>
            </div>
          ) : (
            filtered.map((player, i) => {
              const rank = getRank(player.score || 0);
              const isTop3 = i < 3;
              const isCurrent = player.username === currentUser;
              return (
                <div
                  key={i}
                  className={`lb-row${isCurrent ? " current-user" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`rank-cell ${isTop3 ? RANK_COLORS[i] : "rank-other"}`}>
                    {isTop3 ? MEDALS[i] : `#${i + 1}`}
                  </div>
                  <div className="player-cell">
                    <div className="player-avatar">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                        alt={player.username}
                      />
                    </div>
                    <div className="player-info">
                      <div className="player-name">
                        {player.username}
                        {isCurrent && <span style={{marginLeft:'6px',fontSize:'0.65rem',color:'var(--accent)'}}>YOU</span>}
                      </div>
                      <div className="player-meta">
                        {player.flagCount ? `${player.flagCount} flags` : "Classic mode"}
                      </div>
                    </div>
                  </div>
                  <div className="score-cell">{(player.score || 0).toLocaleString()}</div>
                  <div className="badge-cell">
                    <span className={`rank-badge ${rank.cls}`}>{rank.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="lb-footer-note">
          Powered by <span>Firebase Firestore</span> · Avatars by <span>DiceBear</span>
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
