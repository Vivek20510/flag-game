import React from "react";
import { useNavigate } from "react-router-dom";
import "../index.css"; // Ensure correct CSS path

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <h1 className="error-code">404</h1>
      <h2 className="error-text">Oops! Page Not Found</h2>
      <p className="error-description">
        The page you are looking for does not exist or is under construction. 🚧
      </p>
      <div className="construction-animation">
        🚧👷‍♂️ Under Construction... Please check back later! 👷‍♀️🚧
      </div>
      <button className="home-btn" onClick={() => navigate("/")}>🏠 Back to Home</button>
    </div>
  );
};

export default NotFound;
