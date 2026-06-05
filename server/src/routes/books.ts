import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { fuzzyMatch, getMatchScore } from '../utils/searchUtils';

const router = Router();

router.get('/', async (req, res) => {
  const { 
    category, 
    search, 
    owner_id,
    condition,
    min_points,
    max_points,
    start_date,
    end_date,
    sort_by,
    sort_order
  } = req.query;
  
  await db.read();
  
  let books = [...db.data.books];

  if (category) {
    books = books.filter(b => b.category === category);
  }

  if (search) {
    const searchStr = search as string;
    books = books.filter(b => 
      fuzzyMatch(b.title, searchStr) || 
      fuzzyMatch(b.author, searchStr)
    ).map(b => ({
      ...b,
      search_score: Math.max(
        getMatchScore(b.title, searchStr),
        getMatchScore(b.author, searchStr)
      )
    }));
  }

  if (owner_id) {
    books = books.filter(b => b.owner_id === parseInt(owner_id as string));
  }

  if (condition) {
    books = books.filter(b => b.condition === condition);
  }

  if (min_points) {
    books = books.filter(b => b.points_required >= parseInt(min_points as string));
  }

  if (max_points) {
    books = books.filter(b => b.points_required <= parseInt(max_points as string));
  }

  if (start_date) {
    books = books.filter(b => new Date(b.created_at) >= new Date(start_date as string));
  }

  if (end_date) {
    books = books.filter(b => new Date(b.created_at) <= new Date(end_date as string));
  }

  const sortField = sort_by as string;
  const sortDir = (sort_order as string) === 'asc' ? 1 : -1;

  if (sortField === 'points') {
    books.sort((a, b) => (a.points_required - b.points_required) * sortDir);
  } else if (sortField === 'date') {
    books.sort((a, b) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * sortDir);
  } else if (sortField === 'title') {
    books.sort((a, b) => a.title.localeCompare(b.title) * sortDir);
  } else if (sortField === 'relevance' && search) {
    books.sort((a: any, b: any) => (b.search_score - a.search_score));
  } else {
    books.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const booksWithHolder = books.map(book => {
    const holder = db.data.users.find(u => u.id === book.current_holder_id);
    return {
      ...book,
      holder_name: holder?.username,
      holder_avatar: holder?.avatar
    };
  });

  res.json(booksWithHolder);
});

router.get('/categories', (_req, res) => {
  const categories = ['文学', '科幻', '历史', '哲学', '艺术', '科技', '经济', '心理', '童话', '其他'];
  res.json(categories);
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

router.get('/search-history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();
  const histories = db.data.searchHistories
    .filter(h => h.user_id === req.user!.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  res.json(histories);
});

router.post('/search-history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { keyword } = req.body;

  if (!keyword || keyword.trim() === '') {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  await db.read();

  const existingIndex = db.data.searchHistories.findIndex(
    h => h.user_id === req.user!.id && h.keyword.toLowerCase() === keyword.toLowerCase()
  );

  if (existingIndex !== -1) {
    db.data.searchHistories.splice(existingIndex, 1);
  }

  const newId = Math.max(0, ...db.data.searchHistories.map(h => h.id)) + 1;

  const newHistory = {
    id: newId,
    user_id: req.user.id,
    keyword: keyword.trim(),
    created_at: new Date().toISOString()
  };

  db.data.searchHistories.push(newHistory);

  const userHistories = db.data.searchHistories.filter(h => h.user_id === req.user!.id);
  if (userHistories.length > 50) {
    const sorted = userHistories.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const toRemove = sorted.slice(50);
    db.data.searchHistories = db.data.searchHistories.filter(
      h => !toRemove.some(r => r.id === h.id)
    );
  }

  await db.write();

  res.status(201).json(newHistory);
});

router.delete('/search-history/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();
  const historyIndex = db.data.searchHistories.findIndex(
    h => h.id === parseInt(id) && h.user_id === req.user!.id
  );

  if (historyIndex === -1) {
    return res.status(404).json({ error: 'Search history not found' });
  }

  db.data.searchHistories.splice(historyIndex, 1);
  await db.write();

  res.json({ message: 'Search history deleted' });
});

router.delete('/search-history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();
  db.data.searchHistories = db.data.searchHistories.filter(h => h.user_id !== req.user!.id);
  await db.write();

  res.json({ message: 'All search history cleared' });
});

export default router;
