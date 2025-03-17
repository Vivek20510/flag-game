import { db } from "./firebaseConfig";
import { collection, doc, getDocs, setDoc, query, orderBy, limit } from "firebase/firestore";

const leaderboardRef = collection(db, "leaderboard");

// ✅ Fetch leaderboard (Top 10 players)
export const getLeaderboard = async () => {
  const q = query(leaderboardRef, orderBy("score", "desc"), limit(10));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ username: doc.id, ...doc.data() })); // Use document ID as username
};

// ✅ Add or update a player's score
export const addToLeaderboard = async (username, score) => {
  const userRef = doc(db, "leaderboard", username); // Use username as document ID
  await setDoc(userRef, { score }, { merge: true }); // Merge to update existing scores
};
