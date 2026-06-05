import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const { category, search, owner_id } = req.query;
  
  await db.read();
  
  let books = [...db.data.books];

  if (category) {
    books = books.filter(b => b.category === category);
  }

  if (search) {
    const searchLower = (search as string).toLowerCase();
    books = books.filter(b => 
      b.title.toLowerCase().includes(searchLower) || 
      b.author.toLowerCase().includes(searchLower)
    );
  }

  if (owner_id) {
    books = books.filter(b => b.owner_id === parseInt(owner_id as string));
  }

  const booksWithHolder = books.map(book => {
    const holder = db.data.users.find(u => u.id === book.current_holder_id);
    return {
      ...book,
      holder_name: holder?.username,
      holder_avatar: holder?.avatar
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(booksWithHolder);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const owner = db.data.users.find(u => u.id === book.owner_id);
  const holder = db.data.users.find(u => u.id === book.current_holder_id);

  res.json({
    ...book,
    owner_name: owner?.username,
    owner_avatar: owner?.avatar,
    holder_name: holder?.username,
    holder_avatar: holder?.avatar
  });
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { title, author, cover, description, isbn, category, condition, points_required } = req.body;

  if (!title || !author || !condition) {
    return res.status(400).json({ error: 'Title, author and condition are required' });
  }

  const points = points_required || 10;

  await db.read();
  const newId = Math.max(0, ...db.data.books.map(b => b.id)) + 1;

  const newBook = {
    id: newId,
    title,
    author,
    cover,
    description,
    isbn,
    category,
    condition,
    owner_id: req.user.id,
    current_holder_id: req.user.id,
    status: 'available',
    points_required: points,
    created_at: new Date().toISOString()
  };

  db.data.books.push(newBook);
  
  const user = db.data.users.find(u => u.id === req.user!.id);
  if (user) {
    user.points += points;
  }
  
  await db.write();

  res.status(201).json(newBook);
});

router.get('/:id/drift-records', async (req, res) => {
  const { id } = req.params;

  await db.read();
  const records = db.data.driftRecords
    .filter(r => r.book_id === parseInt(id))
    .map(record => {
      const user = db.data.users.find(u => u.id === record.user_id);
      return {
        ...record,
        username: user?.username,
        avatar: user?.avatar
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(records);
});

router.post('/:id/drift-records', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { notes, rating, read_date } = req.body;

  if (!notes && !rating) {
    return res.status(400).json({ error: 'Notes or rating is required' });
  }

  await db.read();
  const newId = Math.max(0, ...db.data.driftRecords.map(r => r.id)) + 1;

  const newRecord = {
    id: newId,
    book_id: parseInt(id),
    user_id: req.user.id,
    notes,
    rating,
    read_date,
    created_at: new Date().toISOString()
  };

  db.data.driftRecords.push(newRecord);
  await db.write();

  res.status(201).json(newRecord);
});

router.get('/categories', (_req, res) => {
  const categories = ['文学', '科幻', '历史', '哲学', '艺术', '科技', '经济', '心理', '童话', '其他'];
  res.json(categories);
});

export default router;
