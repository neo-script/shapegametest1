import { leaderboard, usernames } from './_store.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { old, new: newName } = req.body || {};
  if (!old || !newName) {
    return res.status(400).json({ success: false, error: 'old and new required' });
  }

  // If new name already exists on leaderboard, merge scores (keep max) and delete old.
  const oldIdx = leaderboard.findIndex(e => e.username === old);
  const newIdx = leaderboard.findIndex(e => e.username === newName);

  if (oldIdx !== -1 && newIdx !== -1) {
    leaderboard[newIdx].score = Math.max(leaderboard[newIdx].score, leaderboard[oldIdx].score);
    leaderboard.splice(oldIdx, 1);
  } else if (oldIdx !== -1 && newIdx === -1) {
    leaderboard[oldIdx].username = newName;
  }

  if (usernames.has(old)) usernames.delete(old);
  usernames.add(newName);

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.splice(50);

  return res.status(200).json({ success: true });
}
