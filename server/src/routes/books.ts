import { Router } from 'express';
import db, { Book, DriftRecord, SearchHistory } from '../database';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware/auth';
import { validate, validateIdParam, validatePagination } from '../middleware/validate';
import { success, created, badRequest, unauthorized, forbidden, notFound } from '../utils/response';
import { fuzzyMatch, getMatchScore } from '../utils/searchUtils';

const router = Router();

interface BookWithHolder extends Book {
  holder_name?: string;
  holder_avatar?: string;
  search_score?: number;
}

interface BookWithOwner extends Book {
  owner_name?: string;
  owner_avatar?: string;
  holder_name?: string;
  holder_avatar?: string;
}

interface CreateBookBody {
  title: string;
  author: string;
  cover?: string;
  description?: string;
  isbn?: string;
  category?: string;
  condition: string;
  points_required?: number;
}

interface UpdateBookBody {
  title?: string;
  author?: string;
  cover?: string;
  description?: string;
  isbn?: string;
  category?: string;
  condition?: string;
  points_required?: number;
  status?: string;
}

interface BatchCreateBody {
  books: CreateBookBody[];
}

interface BatchUpdateBody {
  book_ids: number[];
  updates: Partial<Book>;
}

interface DriftRecordWithUser extends DriftRecord {
  username?: string;
  avatar?: string;
}

interface CreateDriftRecordBody {
  notes?: string;
  rating?: number;
  read_date?: string;
}

interface SearchHistoryBody {
  keyword: string;
}

interface BatchCreateResult {
  created: number;
  books: Book[];
  total_points_pending: number;
}

interface BatchUpdateResult {
  updated: number;
  books: Book[];
}

interface ClearHistoryResult {
  message: string;
}

interface DeleteHistoryResult {
  message: string;
}

interface DeleteBookResult {
  message: string;
}

router.get(
  '/',
  optionalAuthMiddleware,
  validatePagination(),
  async (req: AuthRequest, res) => {
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
      sort_order,
      approval_status,
    } = req.query;

    await db.read();

    let books: BookWithHolder[] = [...db.data.books];

    const currentUserId = req.user?.id;
    const isOwnerFilter = owner_id !== undefined;

    if (!approval_status && !isOwnerFilter) {
      books = books.filter(b => b.approval_status === 'approved');
    }

    if (approval_status) {
      books = books.filter(b => b.approval_status === approval_status);
    }

    if (category) {
      books = books.filter(b => b.category === category);
    }

    if (search) {
      const searchStr = search as string;
      books = books
        .filter(b => fuzzyMatch(b.title, searchStr) || fuzzyMatch(b.author, searchStr))
        .map(b => ({
          ...b,
          search_score: Math.max(getMatchScore(b.title, searchStr), getMatchScore(b.author, searchStr)),
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
      books.sort((a, b) => (b.search_score || 0) - (a.search_score || 0));
    } else {
      books.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const booksWithHolder = books.map(book => {
      const holder = db.data.users.find(u => u.id === book.current_holder_id);
      return {
        ...book,
        holder_name: holder?.username,
        holder_avatar: holder?.avatar,
      };
    });

    success<BookWithHolder[]>(res, booksWithHolder);
  }
);

router.get('/categories', (_req, res) => {
  const categories = ['文学', '科幻', '历史', '哲学', '艺术', '科技', '经济', '心理', '童话', '其他'];
  success<string[]>(res, categories);
});

router.get('/search-history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  await db.read();
  const histories = db.data.searchHistories
    .filter(h => h.user_id === req.user!.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  success<SearchHistory[]>(res, histories);
});

router.post(
  '/search-history',
  authMiddleware,
  validate({
    body: {
      keyword: { type: 'string', required: true, min: 1, max: 100 },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { keyword } = req.body as SearchHistoryBody;

    if (!keyword || keyword.trim() === '') {
      return badRequest(res, '关键词不能为空');
    }

    await db.read();

    const existingIndex = db.data.searchHistories.findIndex(
      h => h.user_id === req.user!.id && h.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (existingIndex !== -1) {
      db.data.searchHistories.splice(existingIndex, 1);
    }

    const newId = Math.max(0, ...db.data.searchHistories.map(h => h.id)) + 1;

    const newHistory: SearchHistory = {
      id: newId,
      user_id: req.user.id,
      keyword: keyword.trim(),
      created_at: new Date().toISOString(),
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

    created<SearchHistory>(res, newHistory, '搜索历史已添加');
  }
);

router.delete('/search-history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  await db.read();
  db.data.searchHistories = db.data.searchHistories.filter(h => h.user_id !== req.user!.id);
  await db.write();

  success<ClearHistoryResult>(res, { message: '所有搜索历史已清除' });
});

router.delete(
  '/search-history/:id',
  authMiddleware,
  validateIdParam(),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;

    await db.read();
    const historyIndex = db.data.searchHistories.findIndex(
      h => h.id === parseInt(id) && h.user_id === req.user!.id
    );

    if (historyIndex === -1) {
      return notFound(res, '搜索历史不存在');
    }

    db.data.searchHistories.splice(historyIndex, 1);
    await db.write();

    success<DeleteHistoryResult>(res, { message: '搜索历史已删除' });
  }
);

router.post(
  '/',
  authMiddleware,
  validate({
    body: {
      title: { type: 'string', required: true, min: 1, max: 200 },
      author: { type: 'string', required: true, min: 1, max: 100 },
      condition: { type: 'string', required: true },
      cover: { type: 'string' },
      description: { type: 'string' },
      isbn: { type: 'string' },
      category: { type: 'string' },
      points_required: { type: 'number', min: 0 },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { title, author, cover, description, isbn, category, condition, points_required } = req.body as CreateBookBody;

    const points = points_required || 10;

    await db.read();
    const newId = Math.max(0, ...db.data.books.map(b => b.id)) + 1;

    const newBook: Book = {
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
      approval_status: 'pending',
      points_required: points,
      created_at: new Date().toISOString(),
    };

    db.data.books.push(newBook);

    await db.write();

    created<Book>(res, newBook, '书籍添加成功');
  }
);

router.post(
  '/batch',
  authMiddleware,
  validate({
    body: {
      books: { type: 'array', required: true, min: 1 },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { books } = req.body as BatchCreateBody;

    await db.read();

    const newBooks: Book[] = [];
    let totalPoints = 0;
    let currentMaxId = Math.max(0, ...db.data.books.map(b => b.id));

    for (const bookData of books) {
      const { title, author, cover, description, isbn, category, condition, points_required } = bookData;

      if (!title || !author || !condition) {
        continue;
      }

      const points = points_required || 10;
      currentMaxId += 1;

      const newBook: Book = {
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
        approval_status: 'pending',
        points_required: points,
        created_at: new Date().toISOString(),
      };

      newBooks.push(newBook);
      totalPoints += points;
    }

    db.data.books.push(...newBooks);

    await db.write();

    created<BatchCreateResult>(res, {
      created: newBooks.length,
      books: newBooks,
      total_points_pending: totalPoints,
    }, '批量添加成功');
  }
);

router.put(
  '/batch/update',
  authMiddleware,
  validate({
    body: {
      book_ids: { type: 'array', required: true, min: 1 },
      updates: { type: 'object', required: true },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { book_ids, updates } = req.body as BatchUpdateBody;

    const allowedFields = ['category', 'condition', 'status', 'points_required'];
    const validUpdates: Partial<Book> = {};

    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        (validUpdates as any)[field] = (updates as any)[field];
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return badRequest(res, '没有有效的更新字段');
    }

    await db.read();

    let updatedCount = 0;
    const updatedBooks: Book[] = [];

    for (const bookId of book_ids) {
      const book = db.data.books.find(b => b.id === bookId);
      if (book && book.owner_id === req.user.id) {
        Object.assign(book, validUpdates);
        updatedCount++;
        updatedBooks.push(book);
      }
    }

    await db.write();

    success<BatchUpdateResult>(res, {
      updated: updatedCount,
      books: updatedBooks,
    }, '批量更新成功');
  }
);

router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
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
    created_at: book.created_at,
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
        book.created_at,
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

router.get(
  '/:id',
  optionalAuthMiddleware,
  validateIdParam(),
  async (req: AuthRequest, res) => {
    const { id } = req.params;

    await db.read();
    const book = db.data.books.find(b => b.id === parseInt(id));

    if (!book) {
      return notFound(res, '书籍不存在');
    }

    if (book.approval_status !== 'approved') {
      if (!req.user || (req.user.id !== book.owner_id && req.user.role !== 'admin')) {
        return forbidden(res, '书籍尚未通过审核');
      }
    }

    const owner = db.data.users.find(u => u.id === book.owner_id);
    const holder = db.data.users.find(u => u.id === book.current_holder_id);

    const bookWithOwner: BookWithOwner = {
      ...book,
      owner_name: owner?.username,
      owner_avatar: owner?.avatar,
      holder_name: holder?.username,
      holder_avatar: holder?.avatar,
    };

    success<BookWithOwner>(res, bookWithOwner);
  }
);

router.put(
  '/:id',
  authMiddleware,
  validateIdParam(),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const updates = req.body as UpdateBookBody;

    await db.read();
    const bookIndex = db.data.books.findIndex(b => b.id === parseInt(id));

    if (bookIndex === -1) {
      return notFound(res, '书籍不存在');
    }

    const book = db.data.books[bookIndex];

    if (book.owner_id !== req.user.id) {
      return forbidden(res, '没有权限更新这本书');
    }

    if (updates.title !== undefined) book.title = updates.title;
    if (updates.author !== undefined) book.author = updates.author;
    if (updates.cover !== undefined) book.cover = updates.cover;
    if (updates.description !== undefined) book.description = updates.description;
    if (updates.isbn !== undefined) book.isbn = updates.isbn;
    if (updates.category !== undefined) book.category = updates.category;
    if (updates.condition !== undefined) book.condition = updates.condition;
    if (updates.points_required !== undefined) book.points_required = updates.points_required;
    if (updates.status !== undefined) book.status = updates.status as Book['status'];

    await db.write();

    success<Book>(res, book, '书籍更新成功');
  }
);

router.delete(
  '/:id',
  authMiddleware,
  validateIdParam(),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;

    await db.read();
    const bookIndex = db.data.books.findIndex(b => b.id === parseInt(id));

    if (bookIndex === -1) {
      return notFound(res, '书籍不存在');
    }

    const book = db.data.books[bookIndex];

    if (book.owner_id !== req.user.id) {
      return forbidden(res, '没有权限删除这本书');
    }

    db.data.books.splice(bookIndex, 1);
    await db.write();

    success<DeleteBookResult>(res, { message: '书籍删除成功' });
  }
);

router.get(
  '/:id/drift-records',
  validateIdParam(),
  async (req, res) => {
    const { id } = req.params;

    await db.read();
    const records = db.data.driftRecords
      .filter(r => r.book_id === parseInt(id))
      .map(record => {
        const user = db.data.users.find(u => u.id === record.user_id);
        return {
          ...record,
          username: user?.username,
          avatar: user?.avatar,
        } as DriftRecordWithUser;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    success<DriftRecordWithUser[]>(res, records);
  }
);

router.post(
  '/:id/drift-records',
  authMiddleware,
  validateIdParam(),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const { notes, rating, read_date } = req.body as CreateDriftRecordBody;

    if (!notes && rating === undefined) {
      return badRequest(res, '笔记或评分至少需要一项');
    }

    await db.read();
    const newId = Math.max(0, ...db.data.driftRecords.map(r => r.id)) + 1;

    const newRecord: DriftRecord = {
      id: newId,
      book_id: parseInt(id),
      user_id: req.user.id,
      notes,
      rating,
      read_date,
      created_at: new Date().toISOString(),
    };

    db.data.driftRecords.push(newRecord);
    await db.write();

    created<DriftRecord>(res, newRecord, '漂流记录添加成功');
  }
);

export default router;
