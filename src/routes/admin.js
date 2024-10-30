import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

router.get('/admin', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
  
  res.render('admin/dashboard', { users, announcements });
});

router.post('/admin/announcement', requireAdmin, (req, res) => {
  const { title, content } = req.body;
  db.prepare(
    'INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)'
  ).run(title, content, req.session.userId);
  
  res.redirect('/admin');
});

router.post('/admin/user/:id', requireAdmin, (req, res) => {
  const { role } = req.body;
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.redirect('/admin');
});

router.delete('/admin/user/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;