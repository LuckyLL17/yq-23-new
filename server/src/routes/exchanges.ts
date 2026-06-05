import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { book_id, message } = req.body;

  if (!book_id) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  await db.read();
  const book = db.data.books.find(b => b.id === book_id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.current_holder_id === req.user.id) {
    return res.status(400).json({ error: 'You already have this book' });
  }

  if (book.status !== 'available') {
    return res.status(400).json({ error: 'Book is not available for exchange' });
  }

  const user = db.data.users.find(u => u.id === req.user!.id);
  if (!user || user.points < book.points_required) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  const newId = Math.max(0, ...db.data.exchanges.map(e => e.id)) + 1;

  const newExchange = {
    id: newId,
    book_id,
    requester_id: req.user.id,
    owner_id: book.current_holder_id,
    status: 'pending',
    message,
    created_at: new Date().toISOString()
  };

  db.data.exchanges.push(newExchange);
  await db.write();

  res.status(201).json(newExchange);
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();
  const exchanges = db.data.exchanges
    .filter(e => e.requester_id === req.user!.id || e.owner_id === req.user!.id)
    .map(exchange => {
      const book = db.data.books.find(b => b.id === exchange.book_id);
      const requester = db.data.users.find(u => u.id === exchange.requester_id);
      const owner = db.data.users.find(u => u.id === exchange.owner_id);
      
      return {
        ...exchange,
        title: book?.title,
        cover: book?.cover,
        author: book?.author,
        points_required: book?.points_required,
        requester_name: requester?.username,
        requester_avatar: requester?.avatar,
        owner_name: owner?.username,
        owner_avatar: owner?.avatar
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(exchanges);
});

router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  const exchange = db.data.exchanges.find(e => e.id === exchangeId);

  if (!exchange) {
    return res.status(404).json({ error: 'Exchange not found' });
  }

  if (exchange.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (exchange.status !== 'pending') {
    return res.status(400).json({ error: 'Exchange already processed' });
  }

  const book = db.data.books.find(b => b.id === exchange.book_id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  exchange.status = 'accepted';
  
  const requester = db.data.users.find(u => u.id === exchange.requester_id);
  const owner = db.data.users.find(u => u.id === req.user!.id);
  
  if (requester) requester.points -= book.points_required;
  if (owner) owner.points += book.points_required;
  
  book.current_holder_id = exchange.requester_id;
  
  await db.write();

  res.json({ message: 'Exchange accepted' });
});

router.post('/:id/reject', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  const exchange = db.data.exchanges.find(e => e.id === exchangeId);

  if (!exchange) {
    return res.status(404).json({ error: 'Exchange not found' });
  }

  if (exchange.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (exchange.status !== 'pending') {
    return res.status(400).json({ error: 'Exchange already processed' });
  }

  exchange.status = 'rejected';
  await db.write();

  res.json({ message: 'Exchange rejected' });
});

export default router;
