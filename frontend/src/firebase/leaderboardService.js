import { db } from "./firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "firebase/firestore";

const COLLECTION = "leaderboard";
const leaderboardRef = collection(db, COLLECTION);

// ─── Fetch leaderboard ────────────────────────────────────────────────────────
// Returns top N players ordered by score descending.
// Pass { limitCount: 50 } to get more results (default 100).
export const getLeaderboard = async ({ limitCount = 100 } = {}) => {
  try {
    const q = query(leaderboardRef, orderBy("score", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      username: d.id,
      ...d.data(),
      // Ensure score is always a number
      score: d.data().score || 0,
    }));
  } catch (err) {
    console.error("[Leaderboard] getLeaderboard error:", err);
    throw err;
  }
};

// ─── Add / update a player's score ───────────────────────────────────────────
// Only saves if the new score is HIGHER than the stored best score.
// Also tracks: gamesPlayed, totalFlags, bestStreak, lastPlayed, gameMode.
//
// Usage:
//   addToLeaderboard("GeoMaster99", 1450, {
//     accuracy:    88,
//     bestStreak:  7,
//     flagCount:   15,
//     gameMode:    "classic",
//   });
export const addToLeaderboard = async (username, score, stats = {}) => {
  if (!username || typeof score !== "number") {
    console.warn("[Leaderboard] Invalid username or score — skipping save.");
    return { saved: false, reason: "invalid_input" };
  }

  const userRef = doc(db, COLLECTION, username);

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // ── First time this player has been recorded ──
      await setDoc(userRef, {
        score,
        gamesPlayed:  1,
        totalFlags:   stats.flagCount   || 0,
        bestStreak:   stats.bestStreak  || 0,
        bestAccuracy: stats.accuracy    || 0,
        lastGameMode: stats.gameMode    || "classic",
        lastPlayed:   serverTimestamp(),
        createdAt:    serverTimestamp(),
      });
      return { saved: true, newBest: true, previous: null };
    }

    const existing = snap.data();
    const previousBest = existing.score || 0;
    const isNewBest = score > previousBest;

    // Always increment play count and flags regardless of score
    const updates = {
      gamesPlayed:  increment(1),
      totalFlags:   increment(stats.flagCount  || 0),
      lastGameMode: stats.gameMode   || existing.lastGameMode || "classic",
      lastPlayed:   serverTimestamp(),
    };

    // Only update score + personal bests if this run beat them
    if (isNewBest) {
      updates.score = score;
    }
    if ((stats.bestStreak || 0) > (existing.bestStreak || 0)) {
      updates.bestStreak = stats.bestStreak;
    }
    if ((stats.accuracy || 0) > (existing.bestAccuracy || 0)) {
      updates.bestAccuracy = stats.accuracy;
    }

    await updateDoc(userRef, updates);

    return {
      saved:     true,
      newBest:   isNewBest,
      previous:  previousBest,
      improved:  isNewBest ? score - previousBest : 0,
    };

  } catch (err) {
    console.error("[Leaderboard] addToLeaderboard error:", err);
    throw err;
  }
};

// ─── Fetch a single player's stats ───────────────────────────────────────────
// Useful for profile pages or "your best" displays.
export const getPlayerStats = async (username) => {
  if (!username) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, username));
    if (!snap.exists()) return null;
    return { username: snap.id, ...snap.data(), score: snap.data().score || 0 };
  } catch (err) {
    console.error("[Leaderboard] getPlayerStats error:", err);
    return null;
  }
};

// ─── Get a player's rank ──────────────────────────────────────────────────────
// Returns 1-based rank position (null if player not found).
export const getPlayerRank = async (username) => {
  if (!username) return null;
  try {
    const all = await getLeaderboard({ limitCount: 1000 });
    const idx = all.findIndex((p) => p.username === username);
    return idx === -1 ? null : idx + 1;
  } catch {
    return null;
  }
};
