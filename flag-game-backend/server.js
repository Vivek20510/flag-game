const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

let allFlags = []; // Store all country flags after fetching

// 🌍 Fetch country flags once when the server starts
async function fetchFlags() {
    try {
        const response = await axios.get("https://restcountries.com/v3.1/all");
        allFlags = response.data.map((country) => ({
            name: country.name.common,
            flag: country.flags.svg,
        }));
        console.log(`✅ Loaded ${allFlags.length} flags into memory.`);
    } catch (error) {
        console.error("❌ Error fetching flags:", error);
    }
}
fetchFlags(); // Load flag data on startup

// 🎯 Categorize flags into difficulty levels
const easyFlags = [
    "United States", "India", "Canada", "Germany", "France", "Japan", "Brazil",
    "Australia", "Italy", "United Kingdom", "Russia", "China", "Mexico", "Spain",
    "South Korea", "Argentina", "Netherlands", "Sweden", "Turkey", "Switzerland"
];

const mediumFlags = [
    "Norway", "Denmark", "Greece", "Portugal", "South Africa", "Colombia",
    "Thailand", "Malaysia", "Philippines", "Vietnam", "Egypt", "Poland",
    "Pakistan", "Czech Republic", "New Zealand", "Saudi Arabia", "Belgium",
    "Finland", "Hungary", "Ukraine"
];

const hardFlags = [
    "Bhutan", "Marshall Islands", "Burundi", "Eswatini", "Nauru", "Mauritania",
    "Saint Kitts and Nevis", "Vanuatu", "Kiribati", "Malawi", "Lesotho",
    "Comoros", "Tuvalu", "Djibouti", "Seychelles", "Solomon Islands",
    "Micronesia", "São Tomé and Príncipe", "Equatorial Guinea", "Palau"
];

// 📌 Helper function to select random flags
const getRandomFlags = (list, count) => {
    return list.sort(() => Math.random() - 0.5).slice(0, count);
};

// 🏁 API: Fetch a single random flag with multiple-choice options
app.get("/api/random-flag", async (req, res) => {
    try {
        if (!allFlags.length) {
            return res.status(500).json({ error: "Flags not loaded yet. Please retry later." });
        }

        // Select a random flag
        const selectedCountry = allFlags[Math.floor(Math.random() * allFlags.length)];
        const correctAnswer = selectedCountry.name;

        // Generate multiple-choice options
        const options = [correctAnswer];
        while (options.length < 4) {
            const randomCountry = allFlags[Math.floor(Math.random() * allFlags.length)].name;
            if (!options.includes(randomCountry)) {
                options.push(randomCountry);
            }
        }
        options.sort(() => Math.random() - 0.5); // Shuffle options

        res.json({
            flag: selectedCountry.flag,
            options,
            correctAnswer,
        });
    } catch (error) {
        console.error("❌ Error in /api/random-flag:", error);
        res.status(500).json({ error: "Failed to fetch flag." });
    }
});

// 🏁 API: Fetch multiple flags based on difficulty and count
app.get("/api/random-flags", async (req, res) => {
    try {
        if (!allFlags.length) {
            return res.status(500).json({ error: "Flags not loaded yet. Please retry later." });
        }

        const { numFlags } = req.query;
        const flagCount = parseInt(numFlags) || 20; // Default to 20 flags

        // Set distribution of difficulty levels
        let easyCount, mediumCount, hardCount;
        if (flagCount === 20) {
            easyCount = 14; mediumCount = 6; hardCount = 0;
        } else if (flagCount === 50) {
            easyCount = 25; mediumCount = 15; hardCount = 10;
        } else {
            easyCount = 30; mediumCount = 40; hardCount = 30;
        }

        // Select flags based on difficulty
        const selectedFlags = [
            ...getRandomFlags(allFlags.filter(f => easyFlags.includes(f.name)), easyCount),
            ...getRandomFlags(allFlags.filter(f => mediumFlags.includes(f.name)), mediumCount),
            ...getRandomFlags(allFlags.filter(f => hardFlags.includes(f.name)), hardCount)
        ];

        // Shuffle and send the response
        res.json(selectedFlags.sort(() => Math.random() - 0.5));
    } catch (error) {
        console.error("❌ Error in /api/random-flags:", error);
        res.status(500).json({ error: "Failed to fetch flags." });
    }
});

// 🚀 Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
