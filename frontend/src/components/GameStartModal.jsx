import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

const GameStartModal = ({ onClose }) => {
  const [username, setUsername] = useState("");
  const [gameMode, setGameMode] = useState("classic");
  const [flagCount, setFlagCount] = useState(10);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleStart = () => {
    if (!username.trim()) {
      setError("⚠️ Please enter your name before starting.");
      return;
    }

    // Check for valid game modes
    const validGameModes = ["classic", "time-attack", "elimination", "multiplayer"];
    
    if (validGameModes.includes(gameMode)) {
      if (gameMode === "multiplayer") {
        navigate("/404", { state: { username } });
      } else {
        navigate("/Game", { state: { username, gameMode, flagCount } });
      }
    } else {
      navigate("/404"); // Redirect to 404 page if invalid game mode
    }

    onClose();
  };

  const modeDescriptions = {
    classic: "🏆 Classic Mode: Choose the number of flags and guess at your own pace.",
    "time-attack": "⏳ Time Attack: 60 seconds to guess as many flags as possible!",
    elimination: "❌ Elimination: One wrong guess, and it's game over!",
    multiplayer: "🌍 Multiplayer: Play real-time against another player!",
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>✖</button>
        <h2>🎮 Start Your Game</h2>

        <label>Enter Your Name:</label>
        <input
          type="text"
          placeholder="Your Name"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(""); // Clear error when typing
          }}
        />

        <label>Select Game Mode:</label>
        <div className="game-modes">
          {["classic", "time-attack", "elimination", "multiplayer"].map((mode) => (
            <button
              key={mode}
              className={`mode-btn ${gameMode === mode ? "selected" : ""}`}
              onClick={() => setGameMode(mode)}
            >
              {mode === "classic" && "🏆 Classic"}
              {mode === "time-attack" && "⏳ Time Attack"}
              {mode === "elimination" && "❌ Elimination"}
              {mode === "multiplayer" && "🌍 Multiplayer"}
            </button>
          ))}
        </div>

        <p className="mode-description">{modeDescriptions[gameMode]}</p>

        {gameMode === "classic" && (
          <div className="flag-count">
            <label>Number of Flags:</label>
            <select value={flagCount} onChange={(e) => setFlagCount(Number(e.target.value))}>
              {[10, 20, 50, 100].map((num) => (
                <option key={num} value={num}>{num} Flags</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <button className="start-btn" onClick={handleStart} disabled={!username.trim()}>
          Start Game 🚀
        </button>
      </div>
    </div>
  );
};

export default GameStartModal;
