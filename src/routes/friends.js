import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get friend list and requests
router.get('/friends', requireAuth, (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.username, u.avatar, f.status, f.created_at
    FROM friends f
    JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
    WHERE (f.user_id = ? OR f.friend_id = ?)
    AND u.id != ?
  `).all(req.session.userId, req.session.userId, req.session.userId);

  const pendingRequests = db.prepare(`
    SELECT u.id, u.username, u.avatar, f.created_at
    FROM friends f
    JOIN users u ON f.user_id = u.id
    WHERE f.friend_id = ? AND f.status = 'pending'
  `).all(req.session.userId);

  res.render('friends', { friends, pendingRequests });
});

// Send friend request
router.post('/friends/request/:id', requireAuth, (req, res) => {
  const friendId = req.params.id;
  
  db.prepare(`
    INSERT OR IGNORE INTO friends (user_id, friend_id, status)
    VALUES (?, ?, 'pending')
  `).run(req.session.userId, friendId);

  res.redirect('/friends');
});

// Accept friend request
router.post('/friends/accept/:id', requireAuth, (req, res) => {
  const friendId = req.params.id;
  
  db.prepare(`
    UPDATE friends 
    SET status = 'accepted' 
    WHERE user_id = ? AND friend_id = ?
  `).run(friendId, req.session.userId);

  res.redirect('/friends');
});

// Remove friend or decline request
router.delete('/friends/:id', requireAuth, (req, res) => {
  const friendId = req.params.id;
  
  db.prepare(`
    DELETE FROM friends 
    WHERE (user_id = ? AND friend_id = ?)
    OR (user_id = ? AND friend_id = ?)
  `).run(req.session.userId, friendId, friendId, req.session.userId);

  res.json({ success: true });
});

export default router;