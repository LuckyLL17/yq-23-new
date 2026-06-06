import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import authRoutes from './routes/auth';
import bookRoutes from './routes/books';
import exchangeRoutes from './routes/exchanges';
import topicRoutes from './routes/topics';
import uploadRoutes from './routes/upload';
import wishlistRoutes from './routes/wishlists';

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

import './database';

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlists', wishlistRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Book Exchange API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
