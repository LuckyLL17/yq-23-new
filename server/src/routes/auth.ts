import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'book-exchange-secret-key';

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  await db.read();

  const existingUser = db.data.users.find(u => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newId = Math.max(0, ...db.data.users.map(u => u.id)) + 1;

  const newUser = {
    id: newId,
    username,
    email,
    password: hashedPassword,
    points: 100,
    created_at: new Date().toISOString()
  };

  db.data.users.push(newUser);
  await db.write();

  const token = jwt.sign(
    { id: newId, username, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: newId, username, email, points: 100 }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  await db.read();
  const user = db.data.users.find(u => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      points: user.points,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();
  const user = db.data.users.find(u => u.id === req.user!.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    avatar: user.avatar,
    bio: user.bio
  });
});

export default router;
