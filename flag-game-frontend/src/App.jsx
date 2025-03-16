import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Game from "./pages/Game";
import NotFound from "./pages/NotFound";
import Leaderboard from "./components/Leaderboard";

const App = () => {
    return (
        <Router>
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/game" element={<Game />} />
                    <Route path="*" element={<NotFound />} /> {/* 404 Route */}
                    <Route path="/leaderboard" element={<Leaderboard />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
