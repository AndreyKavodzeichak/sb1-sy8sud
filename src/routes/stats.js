import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../config/database.js';
import { formatDistanceToNow } from 'date-fns';

const router = express.Router();

router.post('/stats/match', requireAuth, (req, res) => {
  const { kills, deaths, weapon, map, result } = req.body;
  
  const match = db.prepare(`
    INSERT INTO matches (user_id, kills, deaths, weapon_used, map, result)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.session.userId, kills, deaths, weapon, map, result);

  // Update player stats
  const stats = db.prepare(`
    UPDATE player_stats 
    SET kills = kills + ?,
        deaths = deaths + ?,
        matches_played = matches_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        last_match_date = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(
    kills, 
    deaths, 
    result === 'win' ? 1 : 0,
    result === 'loss' ? 1 : 0,
    req.session.userId
  );

  // Update favorite weapon
  const weapons = db.prepare(`
    SELECT weapon_used, COUNT(*) as count 
    FROM matches 
    WHERE user_id = ? 
    GROUP BY weapon_used 
    ORDER BY count DESC 
    LIMIT 1
  `).get(req.session.userId);

  if (weapons) {
    db.prepare(`
      UPDATE player_stats 
      SET favorite_weapon = ? 
      WHERE user_id = ?
    `).run(weapons.weapon_used, req.session.userId);
  }

  // Check for achievements
  checkAchievements(req.session.userId);

  res.redirect('/dashboard');
});

router.get('/stats/history', requireAuth, (req, res) => {
  const matches = db.prepare(`
    SELECT * FROM matches 
    WHERE user_id = ? 
    ORDER BY match_date DESC
    LIMIT 10
  `).all(req.session.userId);

  const achievements = db.prepare(`
    SELECT * FROM achievements 
    WHERE user_id = ? 
    ORDER BY unlocked_at DESC
  `).all(req.session.userId);

  const stats = db.prepare(`
    SELECT * FROM player_stats 
    WHERE user_id = ?
  `).get(req.session.userId);

  res.render('stats/history', { 
    matches, 
    achievements,
    stats,
    formatDistanceToNow
  });
});

function checkAchievements(userId) {
  const stats = db.prepare(`
    SELECT * FROM player_stats 
    WHERE user_id = ?
  `).get(userId);

  const achievements = [
    {
      id: 'first_blood',
      name: 'First Blood',
      description: 'Get your first kill',
      condition: stats.kills >= 1
    },
    {
      id: 'veteran',
      name: 'Veteran',
      description: 'Play 100 matches',
      condition: stats.matches_played >= 100
    },
    {
      id: 'sharpshooter',
      name: 'Sharpshooter',
      description: 'Maintain a K/D ratio above 2.0 for 10 matches',
      condition: stats.kills / Math.max(stats.deaths, 1) >= 2.0 && stats.matches_played >= 10
    }
  ];

  achievements.forEach(achievement => {
    if (achievement.condition) {
      db.prepare(`
        INSERT OR IGNORE INTO achievements (user_id, achievement_id, name, description)
        VALUES (?, ?, ?, ?)
      `).run(userId, achievement.id, achievement.name, achievement.description);
    }
  });
}

export default router;