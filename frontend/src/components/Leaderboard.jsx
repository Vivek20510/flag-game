import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard } from "../firebase/leaderboardService";
import "../index.css"; // Ensure correct CSS path

const Leaderboard = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const data = await getLeaderboard();
      setPlayers(data);
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="leaderboard-container">
      <h1>🏆 Full Leaderboard</h1>
      <button className="back-btn" onClick={() => navigate("/")}>🔙 Back to Home</button>

      {players.length > 0 ? (
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              <span>{index + 1}. {player.username}</span> - <b>{player.score} pts</b>
            </li>
          ))}
        </ul>
      ) : (
        <p>No scores recorded yet!</p>
      )}
    </div>
  );
};

export default Leaderboard;
