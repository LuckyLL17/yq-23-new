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

router.delete('/search-history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();
  db.data.searchHistories = db.data.searchHistories.filter(h => h.user_id !== req.user!.id);
  await db.write();

  res.json({ message: 'All search history cleared' });
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

router.post('/batch', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { books } = req.body;

  if (!Array.isArray(books) || books.length === 0) {
    return res.status(400).json({ error: 'Books array is required' });
  }

  await db.read();

  const newBooks = [];
  let totalPoints = 0;
  let currentMaxId = Math.max(0, ...db.data.books.map(b => b.id));

  for (const bookData of books) {
    const { title, author, cover, description, isbn, category, condition, points_required } = bookData;

    if (!title || !author || !condition) {
      continue;
    }

    const points = points_required || 10;
    currentMaxId += 1;

    const newBook = {
      id: currentMaxId,
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

    newBooks.push(newBook);
    totalPoints += points;
  }

  db.data.books.push(...newBooks);

  const user = db.data.users.find(u => u.id === req.user!.id);
  if (user) {
    user.points += totalPoints;
  }

  await db.write();

  res.status(201).json({
    created: newBooks.length,
    books: newBooks,
    total_points_earned: totalPoints
  });
});

router.put('/batch/update', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { book_ids, updates } = req.body;

  if (!Array.isArray(book_ids) || book_ids.length === 0) {
    return res.status(400).json({ error: 'book_ids array is required' });
  }

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'updates object is required' });
  }

  const allowedFields = ['category', 'condition', 'status', 'points_required'];
  const validUpdates: any = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      validUpdates[field] = updates[field];
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  await db.read();

  let updatedCount = 0;
  const updatedBooks = [];

  for (const bookId of book_ids) {
    const book = db.data.books.find(b => b.id === bookId);
    if (book && book.owner_id === req.user.id) {
      Object.assign(book, validUpdates);
      updatedCount++;
      updatedBooks.push(book);
    }
  }

  await db.write();

  res.json({
    updated: updatedCount,
    books: updatedBooks
  });
});

router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { format = 'json', book_ids } = req.query;

  await db.read();

  let books = db.data.books.filter(b => b.owner_id === req.user!.id);

  if (book_ids) {
    const ids = (book_ids as string).split(',').map(Number);
    books = books.filter(b => ids.includes(b.id));
  }

  const exportData = books.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category || '',
    condition: book.condition,
    isbn: book.isbn || '',
    status: book.status,
    points_required: book.points_required,
    description: book.description || '',
    cover: book.cover || '',
    created_at: book.created_at
  }));

  if (format === 'csv') {
    const headers = ['ID', '书名', '作者', '分类', '状态', 'ISBN', '所需积分', '创建时间'];
    const csvRows = [
      headers.join(','),
      ...exportData.map(book => [
        book.id,
        `"${book.title.replace(/"/g, '""')}"`,
        `"${book.author.replace(/"/g, '""')}"`,
        `"${book.category}"`,
        `"${book.condition}"`,
        `"${book.isbn}"`,
        book.points_required,
        book.created_at
      ].join(','))
    ];
    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="books_${Date.now()}.csv"`);
    res.send('\uFEFF' + csvContent);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="books_${Date.now()}.json"`);
    res.json(exportData);
  }
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

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { title, author, cover, description, isbn, category, condition, points_required, status } = req.body;

  await db.read();
  const bookIndex = db.data.books.findIndex(b => b.id === parseInt(id));

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const book = db.data.books[bookIndex];

  if (book.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to update this book' });
  }

  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (cover !== undefined) book.cover = cover;
  if (description !== undefined) book.description = description;
  if (isbn !== undefined) book.isbn = isbn;
  if (category !== undefined) book.category = category;
  if (condition !== undefined) book.condition = condition;
  if (points_required !== undefined) book.points_required = points_required;
  if (status !== undefined) book.status = status;

  await db.write();

  res.json(book);
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();
  const bookIndex = db.data.books.findIndex(b => b.id === parseInt(id));

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const book = db.data.books[bookIndex];

  if (book.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this book' });
  }

  db.data.books.splice(bookIndex, 1);
  await db.write();

  res.json({ message: 'Book deleted successfully' });
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

export default router;
