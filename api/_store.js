// Shared in-memory state for demo purposes.
// NOTE: This will reset on server restarts / cold starts.
export const usernames = new Set();
export const leaderboard = []; // [{ username, score }]
