import React, { useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Leaderboard from "./components/Leaderboard";
import NotFound from "./pages/NotFound";
import { addToLeaderboard } from "./firebase/leaderboardService";

// ─── Inner App (has access to router hooks) ───────────────────────────────────
const AppInner = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Game config state (passed from Home modal → Game) ──
  const [gameConfig, setGameConfig] = useState(null);

  // ── Called by Home's modal "Launch Game" button ──
  const handleStartGame = useCallback(({ username, gameMode, flagCount }) => {
    setGameConfig({ username, gameMode, flagCount });
    navigate("/game");
  }, [navigate]);

  // ── Called by game mode cards / nav links on Home ──
  const handleNavigate = useCallback((destination) => {
    switch (destination) {
      case "leaderboard":  navigate("/leaderboard"); break;
      case "multiplayer":  navigate("/game", { state: { forceMode: "multiplayer" } }); break;
      case "daily":        navigate("/game", { state: { forceMode: "daily" } }); break;
      default:             navigate("/"); break;
    }
  }, [navigate]);

  // ── Called by Game's back button / home button ──
  const handleGoHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // ── Called when Game finishes → save to Firebase then go home ──
  // result = { username, score, accuracy, bestStreak, flagCount, gameMode, reason }
  const handleGameEnd = useCallback(async (result) => {
    const { username, score, accuracy, bestStreak, flagCount, gameMode } = result || {};

    // Only save valid completed games with a real score
    if (username && typeof score === "number" && score > 0) {
      try {
        const outcome = await addToLeaderboard(username, score, {
          accuracy,
          bestStreak,
          flagCount,
          gameMode,
        });
        if (outcome?.newBest) {
          console.info(`[Leaderboard] 🏆 New personal best for ${username}: ${score}`);
        } else if (outcome?.saved) {
          console.info(`[Leaderboard] Score saved. Best remains ${outcome.previous}`);
        }
      } catch (err) {
        // Never block navigation if Firebase fails
        console.error("[Leaderboard] Save failed:", err);
      }
    }

    navigate("/");
  }, [navigate]);

  return (
    <Routes>
      {/* ── Home ── */}
      <Route
        path="/"
        element={
          <Home
            onStart={handleStartGame}
            onNavigate={handleNavigate}
          />
        }
      />

      {/* ── Game ── */}
      <Route
        path="/game"
        element={
          <GameRoute
            gameConfig={gameConfig}
            locationState={location.state}
            onGameEnd={handleGameEnd}
            onHome={handleGoHome}
          />
        }
      />

      {/* ── Leaderboard ── */}
      <Route
        path="/leaderboard"
        element={<Leaderboard onHome={handleGoHome} />}
      />

      {/* ── 404 ── */}
      <Route path="*" element={<NotFound onHome={handleGoHome} />} />
    </Routes>
  );
};

// ─── GameRoute wrapper ────────────────────────────────────────────────────────
// Handles the case where someone navigates directly to /game without config
// (e.g. refreshed the page) — falls back to defaults gracefully.
const GameRoute = ({ gameConfig, locationState, onGameEnd, onHome }) => {
  const navigate = useNavigate();

  // Build final config: App state takes priority, then location.state, then defaults
  const config = {
    username:  gameConfig?.username  || locationState?.username  || "Player",
    gameMode:  gameConfig?.gameMode  || locationState?.forceMode || locationState?.gameMode || "classic",
    flagCount: gameConfig?.flagCount || locationState?.flagCount || 10,
  };

  // If someone hits /game directly with no config at all, redirect home
  if (!gameConfig && !locationState) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#060d16", gap: "16px",
        fontFamily: "'Outfit', sans-serif", color: "#7a8fa6",
      }}>
        <p style={{ fontSize: "1rem", letterSpacing: "2px" }}>No game config found.</p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "12px 28px", background: "#00ffb3", color: "#060d16",
            border: "none", borderRadius: "6px", cursor: "pointer",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "3px",
          }}
        >
          ← BACK TO HOME
        </button>
      </div>
    );
  }

  return (
    <Game
      config={config}
      onGameEnd={onGameEnd}
      onHome={onHome}
    />
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const App = () => {
  return (
    <Router>
      <div style={{ minHeight: "100vh", background: "#060d16" }}>
        <AppInner />
      </div>
    </Router>
  );
};

export default App;
