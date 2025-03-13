import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "./config";
import "./App.css";

function App() {
    const [username, setUsername] = useState("");
    const [numFlags, setNumFlags] = useState(20); // Default to 20 flags
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [flag, setFlag] = useState("");
    const [options, setOptions] = useState([]);
    const [correctCountry, setCorrectCountry] = useState("");
    const [message, setMessage] = useState("");
    const [timer, setTimer] = useState(10);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [round, setRound] = useState(1);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    useEffect(() => {
        if (isGameStarted && timer > 0) {
            const countdown = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(countdown);
        } else if (timer === 0) {
            handleTimeout();
        }
    }, [timer, isGameStarted]);

    // Start the game
    const startGame = async () => {
        if (!username.trim()) {
            alert("Please enter your name to start the game!");
            return;
        }
        setIsGameStarted(true);
        setRound(1);
        setScore(0);
        fetchFlag();
    };

    // Fetch a random flag and options
    const fetchFlag = async () => {
        try {
            //const res = await axios.get(`http://localhost:5000/api/random-flag`);
            const res = await axios.get(`${API_URL}/api/random-flag`);

            setFlag(res.data.flag);
            setOptions(res.data.options);
            setCorrectCountry(res.data.correctAnswer);
            setMessage("");
            setTimer(10);
        } catch (error) {
            console.error("Error fetching flag:", error);
        }
    };

    // Handle answer selection
    const handleAnswer = (selectedOption) => {
        if (selectedOption === correctCountry) {
            setMessage("✅ Correct! 🎉");
            setScore((prevScore) => prevScore + 10);
        } else {
            setMessage(`❌ Wrong! The correct answer was ${correctCountry}`);
        }
        updateLeaderboard();

        if (round < numFlags) {
            setTimeout(() => {
                setRound((prevRound) => prevRound + 1);
                fetchFlag();
            }, 2000);
        } else {
            setTimeout(() => endGame(), 2000);
        }
    };

    // Handle timeout (if player doesn't answer in time)
    const handleTimeout = () => {
        setMessage(`⏳ Time's up! The correct answer was ${correctCountry}`);
        updateLeaderboard();

        if (round < numFlags) {
            setTimeout(() => {
                setRound((prevRound) => prevRound + 1);
                fetchFlag();
            }, 2000);
        } else {
            setTimeout(() => endGame(), 2000);
        }
    };

    // End the game
    const endGame = () => {
        alert(`Game Over! Your final score is: ${score}`);
        setIsGameStarted(false);
        setUsername("");
    };

    // Update the leaderboard
    // const updateLeaderboard = () => {
    //     const newEntry = { name: username, score };
    //     const updatedLeaderboard = [...leaderboard, newEntry].sort((a, b) => b.score - a.score);
    //     setLeaderboard(updatedLeaderboard.slice(0, 5));
    //     localStorage.setItem("leaderboard", JSON.stringify(updatedLeaderboard.slice(0, 5)));
    // };

    const updateLeaderboard = async () => {
      try {
          const newEntry = { name: username, score };
          
          // Send the new score to the backend
          await axios.post(`${API_URL}/leaderboard`, newEntry);
  
          // Fetch the updated leaderboard from the backend
          const res = await axios.get(`${API_URL}/leaderboard`);
          setLeaderboard(res.data);
      } catch (error) {
          console.error("Error updating leaderboard:", error);
      }
  };
  

    // Load leaderboard from local storage
    // const loadLeaderboard = () => {
    //     const storedLeaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
    //     setLeaderboard(storedLeaderboard);
    // };

    const loadLeaderboard = async () => {
      try {
          const res = await axios.get(`${API_URL}/leaderboard`);
          setLeaderboard(res.data);
      } catch (error) {
          console.error("Error fetching leaderboard:", error);
      }
  };
  

    return (
        <div className="container">
            {!isGameStarted ? (
                <div className="setup-screen">
                    <h1>🌍 Guess the Country Flag</h1>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <h3>Select Number of Flags</h3>
                    <div className="options">
                        <button onClick={() => setNumFlags(20)} className={numFlags === 20 ? "selected" : ""}>20 Flags</button>
                        <button onClick={() => setNumFlags(50)} className={numFlags === 50 ? "selected" : ""}>50 Flags</button>
                        <button onClick={() => setNumFlags(100)} className={numFlags === 100 ? "selected" : ""}>100 Flags</button>
                    </div>

                    <button className="start-btn" onClick={startGame}>Start Game 🚀</button>
                </div>
            ) : (
                <>
                    <h1>🌍 Guess the Country Flag</h1>
                    <div className="info-bar">
                        <div className="timer">⏳ {timer} seconds left</div>
                        <div className="score">🏆 {username} - Score: {score}</div>
                        <div className="round">🔄 Round {round} of {numFlags}</div>
                    </div>
                    <div className="flag-container">
                        {flag && <img src={flag} alt="Country Flag" className="flag" />}
                    </div>
                    <div className="options">
                        {options.map((option, index) => (
                            <button key={index} onClick={() => handleAnswer(option)}>
                                {option}
                            </button>
                        ))}
                    </div>
                    <p className="message">{message}</p>

                    <div className="leaderboard">
                        <h2>🏅 Leaderboard</h2>
                        <ul>
                            {leaderboard.map((entry, index) => (
                                <li key={index}>
                                    {index + 1}. {entry.name} - {entry.score} pts
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
