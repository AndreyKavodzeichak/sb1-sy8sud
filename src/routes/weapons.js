import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

router.get('/weapons', requireAuth, (req, res) => {
  const weaponStats = db.prepare(`
    SELECT 
      weapon_used,
      COUNT(*) as total_uses,
      SUM(kills) as total_kills,
      SUM(deaths) as total_deaths,
      ROUND(AVG(kills), 2) as avg_kills,
      ROUND(SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate
    FROM matches
    WHERE user_id = ?
    GROUP BY weapon_used
    ORDER BY total_uses DESC
  `).all(req.session.userId);

  const favoriteWeapon = db.prepare(`
    SELECT weapon_used, COUNT(*) as count
    FROM matches
    WHERE user_id = ?
    GROUP BY weapon_used
    ORDER BY count DESC
    LIMIT 1
  `).get(req.session.userId);

  const recentMatches = db.prepare(`
    SELECT *
    FROM matches
    WHERE user_id = ?
    ORDER BY match_date DESC
    LIMIT 5
  `).all(req.session.userId);

  res.render('weapons', { weaponStats, favoriteWeapon, recentMatches });
});

export default router;