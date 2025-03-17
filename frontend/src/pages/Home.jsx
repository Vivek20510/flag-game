import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard } from "../firebase/leaderboardService"; // Import Firestore function
import "../index.css";
import GameStartModal from "../components/GameStartModal";

const Home = () => {
  const navigate = useNavigate();
  const [topPlayers, setTopPlayers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Fetch leaderboard from Firestore
  const updateLeaderboard = async () => {
    try {
      const leaderboard = await getLeaderboard();
      setTopPlayers(leaderboard.slice(0, 3)); // Take top 3 players
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  useEffect(() => {
    updateLeaderboard(); // Fetch on page load

    // Listen for leaderboard updates across the app
    const handleStorageChange = () => {
      updateLeaderboard();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Handle game start
  const handleStartGame = ({ username, gameMode, flagCount }) => {
    if (gameMode === "multiplayer") {
      navigate("/multiplayer-game", { state: { username } });
    } else {
      navigate("/game", { state: { username, gameMode, flagCount } });
    }
  };

  return (
    <div className="home-container">
      <h1 className="title">🌍 Guess The Country Flag</h1>

      {/* Play Button */}
      <button className="play-btn" onClick={() => setShowModal(true)}>
        Play Now
      </button>

      {/* Game Start Modal */}
      {showModal && (
        <GameStartModal
          onStart={handleStartGame}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Leaderboard Section */}
      <div className="leaderboard">
        <h3>🏆 Top 3 Players</h3>
        {topPlayers.length > 0 ? (
          <ul>
            {topPlayers.map((player, index) => (
              <li key={index}>
                <span>
                  {index + 1}. {player.username}
                </span>{" "}
                - <b>{player.score} pts</b>
              </li>
            ))}
          </ul>
        ) : (
          <p>No scores yet! Be the first to play.</p>
        )}
        <button
          className="leaderboard-btn"
          onClick={() => navigate("/leaderboard")}
        >
          View Full Leaderboard
        </button>
      </div>

      {/* How to Play Section */}
      <div className="how-to-play">
        <h3>📖 How to Play</h3>
        <p>
          Guess the correct country flag from the options given. Try to score as
          high as possible!
        </p>
      </div>
    </div>
  );
};

export default Home;
