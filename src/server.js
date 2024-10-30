import express from 'express';
import session from 'express-session';
import SQLiteStore from 'connect-sqlite3';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './config/database.js';
import adminRoutes from './routes/admin.js';
import statsRoutes from './routes/stats.js';
import friendsRoutes from './routes/friends.js';
import weaponsRoutes from './routes/weapons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const SQLiteStoreSession = SQLiteStore(session);

// File upload configuration
const storage = multer.diskStorage({
  destination: join(__dirname, 'public/uploads'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Middleware
app.use(express.static(join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  store: new SQLiteStoreSession({
    db: 'sessions.db',
    dir: '.'
  }),
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Load routes
app.use(adminRoutes);
app.use(statsRoutes);
app.use(friendsRoutes);
app.use(weaponsRoutes);

// Auth routes
app.post('/register', upload.single('avatar'), async (req, res) => {
  const { username, email, password } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashedPassword, avatar);

    db.prepare(
      'INSERT INTO player_stats (user_id) VALUES (?)'
    ).run(result.lastInsertRowid);

    res.redirect('/login');
  } catch (error) {
    res.render('register', { error: 'Username or email already exists' });
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});