import { usernames } from './_store.js';

export default function handler(req, res) {
  const { name } = req.query || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' });
  }
  // BUGFIX: Do NOT claim the name during a check.
  return res.status(200).json({ taken: usernames.has(name) });
}
