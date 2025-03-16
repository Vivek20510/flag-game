import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css"; // Ensure correct CSS path

const Leaderboard = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
    const sortedPlayers = leaderboard.sort((a, b) => b.score - a.score); // Sort highest first
    setPlayers(sortedPlayers);
  }, []);

  return (
    <div className="leaderboard-container">
      <h1>🏆 Full Leaderboard</h1>
      <button className="back-btn" onClick={() => navigate("/")}>🔙 Back to Home</button>

      {players.length > 0 ? (
        <div className="leaderboard-list">
          <ul>
            {players.map((player, index) => (
              <li key={index}>
                <span>{index + 1}. {player.username}</span> - <b>{player.score} pts</b>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No scores recorded yet!</p>
      )}
    </div>
  );
};

export default Leaderboard;
