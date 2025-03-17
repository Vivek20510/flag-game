import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { addToLeaderboard } from "../firebase/leaderboardService"; // Import Firebase function

import "../index.css";

const TIME_ATTACK_DURATION = 60; // ⏳ 60 seconds for Time Attack

const easyFlags = [
  "USA", "India", "UK", "France", "Germany", "Brazil", "Canada", "Australia", "Italy", "Japan",
  "Spain", "Mexico", "Argentina", "China", "Russia", "South Korea", "South Africa", "Egypt", "Turkey", "Indonesia",
  "Sweden", "Netherlands", "Poland", "Thailand", "Switzerland", "Norway", "Belgium", "Portugal", "Denmark", "Finland",
  "Greece", "Ireland", "New Zealand", "Singapore", "Malaysia", "Vietnam", "Chile", "Colombia", "Saudi Arabia", "UAE",
  "Philippines", "Czech Republic", "Hungary", "Ukraine", "Austria", "Israel", "Qatar", "Peru", "Bangladesh", "Pakistan",
  "Nigeria", "Kenya", "Morocco", "Venezuela", "Romania", "Algeria", "Sri Lanka", "Ethiopia", "Cuba", "Kazakhstan",
  "Croatia", "Slovakia", "Bulgaria", "Belarus", "Uruguay", "Paraguay", "Ecuador", "Bolivia", "Costa Rica", "Panama",
  "Kuwait", "Oman", "Jordan", "Lebanon", "Luxembourg", "Lithuania", "Latvia", "Estonia", "Slovenia", "Iceland",
  "Malta", "Cyprus", "Georgia", "Armenia", "Azerbaijan", "Mongolia", "Nepal", "Myanmar", "Cambodia", "Laos",
  "Afghanistan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan", "North Korea", "Botswana", "Namibia", "Zambia", "Zimbabwe"
];


const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, gameMode, flagCount } = location.state || {};

  const [flag, setFlag] = useState(null);
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(TIME_ATTACK_DURATION);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const usedFlags = useRef(new Set());

  // Redirect to Home if no username is provided
  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  // Fetch Flags only when questionIndex changes, NOT when globalTimeLeft updates
  useEffect(() => {
    if (!gameOver) {
      if (gameMode === "time-attack" || questionIndex < flagCount) {
        fetchFlagAndOptions();
        if (gameMode !== "time-attack") setTimeLeft(10);
      } else {
        endGame();
      }
    }
  }, [questionIndex, gameMode, gameOver]); // ❌ Removed globalTimeLeft

  // Countdown Timer for Normal Mode
  useEffect(() => {
    if (gameMode !== "time-attack" && !gameOver && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      nextQuestion();
    }
  }, [timeLeft, gameOver, gameMode]);

  // Countdown Timer for Time Attack Mode (No Flag Refresh)
  useEffect(() => {
    if (gameMode === "time-attack" && !gameOver && globalTimeLeft > 0) {
      const timer = setTimeout(() => setGlobalTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (globalTimeLeft === 0 && !gameOver) {
      endGame();
    }
  }, [globalTimeLeft, gameOver, gameMode]);

  // Fetch a random flag and options
  const fetchFlagAndOptions = async () => {
    try {
      const response = await fetch("https://restcountries.com/v3.1/all");
      if (!response.ok) throw new Error("Failed to fetch flags");

      const data = await response.json();
      const easyCountries = data.filter((country) => easyFlags.includes(country.name.common));
      let availableCountries = easyCountries.filter(
        (country) => !usedFlags.current.has(country.name.common)
      );

      if (availableCountries.length === 0) {
        endGame();
        return;
      }

      const selectedCountry =
        availableCountries[Math.floor(Math.random() * availableCountries.length)];

      if (!selectedCountry) {
        console.warn("No valid country found, skipping...");
        return;
      }

      setFlag(selectedCountry.flags?.svg || selectedCountry.flags?.png);
      setCorrectAnswer(selectedCountry.name.common);
      usedFlags.current.add(selectedCountry.name.common);

      const incorrectOptions = getRandomEasyFlags(selectedCountry.name.common);
      setOptions(shuffleArray([selectedCountry.name.common, ...incorrectOptions]));
    } catch (error) {
      console.error("Error fetching flag data:", error);
    }
  };

  const getRandomEasyFlags = (correctCountry) => {
    let options = new Set();
    while (options.size < 3) {
      const randomCountry = easyFlags[Math.floor(Math.random() * easyFlags.length)];
      if (randomCountry !== correctCountry && !usedFlags.current.has(randomCountry)) {
        options.add(randomCountry);
      }
    }
    return [...options];
  };

  const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

  const handleAnswer = (selectedOption) => {
    if (isWaiting) return;

    setSelectedAnswer(selectedOption);
    setIsWaiting(true);

    if (selectedOption === correctAnswer) {
      setScore((prev) => prev + 10);
      setShowCorrectAnswer(false);
    } else {
      setShowCorrectAnswer(true);
    }

    setTimeout(() => nextQuestion(), 500);
  };

  // Ensure Time Attack only fetches new flag when a question is answered
  const nextQuestion = () => {
    if (gameMode === "time-attack" && globalTimeLeft > 0) {
      setQuestionIndex((prev) => prev + 1); // ✅ Ensures a new flag only appears when an answer is selected
    } else if (questionIndex < flagCount - 1) {
      setQuestionIndex((prev) => prev + 1);
      setTimeLeft(10);
    } else {
      endGame();
    }

    setSelectedAnswer(null);
    setShowCorrectAnswer(false);
    setIsWaiting(false);
  };

  const endGame = () => {
    setGameOver(true);
    saveScore(); // ✅ Now saves to Firestore instead of localStorage
  };
  

  // 🏆 Save Score to Local Storage
  const saveScore = async () => {
    try {
      await addToLeaderboard(username, score);
      console.log("Score saved to Firestore!");
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };
  

  return (
    <div className="game-container">
      <h1>🌍 Guess The Flag</h1>
      <h3>🎮 {username} - {gameMode?.toUpperCase()} Mode</h3>

      {gameOver ? (
        <div className="game-over">
          <h2>🎉 Game Over!</h2>
          <p>Your Final Score: {score}</p>
          <button onClick={() => navigate("/")}>Play Again 🔄</button>
        </div>
      ) : (
        <>
          <div className="score-display">Score: {score}</div>
          <div className={`timer ${timeLeft < 4 ? "low-time" : ""}`}>
            ⏳ Time Left: {gameMode === "time-attack" ? globalTimeLeft : timeLeft}s
          </div>

          {flag && <img src={flag} alt="Country Flag" className="flag-image" />}

          <div className="options-container">
            {options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${selectedAnswer === option ? (option === correctAnswer ? "correct" : "wrong") : ""} ${showCorrectAnswer && option === correctAnswer ? "correct" : ""}`}
                onClick={() => handleAnswer(option)}
                disabled={isWaiting}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Game;
