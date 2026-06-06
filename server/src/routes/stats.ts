import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/overview', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userId = req.user.id;

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === userId);
  const goalBooks = db.data.goalBooks.filter(gb => {
    const goal = db.data.readingGoals.find(g => g.id === gb.goal_id);
    return goal?.user_id === userId && gb.is_completed;
  });

  const allReadBooks = [...driftRecords, ...goalBooks.map(gb => ({
    id: gb.id,
    book_id: gb.book_id,
    user_id: userId,
    read_date: gb.completed_at || new Date().toISOString(),
    created_at: gb.added_at
  }))];

  const uniqueReadBooks = allReadBooks.filter((record, index, self) =>
    index === self.findIndex(r => r.book_id === record.book_id)
  );

  const totalBooks = uniqueReadBooks.length;
  const totalPages = totalBooks * 250;
  const totalHours = totalBooks * 6;

  const categoriesMap = new Map<string, number>();
  uniqueReadBooks.forEach(record => {
    const book = db.data.books.find(b => b.id === record.book_id);
    if (book && book.category) {
      categoriesMap.set(book.category, (categoriesMap.get(book.category) || 0) + 1);
    }
  });

  const categories = Array.from(categoriesMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    total_books: totalBooks,
    total_pages: totalPages,
    total_hours: totalHours,
    categories_count: categories.length,
    top_category: categories[0]?.name || '暂无',
  });
});

router.get('/monthly', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userId = req.user.id;
  const months = 12;
  const monthlyData: { month: string; count: number; hours: number }[] = [];

  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.push({ month: monthStr, count: 0, hours: 0 });
  }

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === userId);
  const goalBooks = db.data.goalBooks.filter(gb => {
    const goal = db.data.readingGoals.find(g => g.id === gb.goal_id);
    return goal?.user_id === userId && gb.is_completed;
  });

  const allReadBooks = [...driftRecords, ...goalBooks.map(gb => ({
    id: gb.id,
    book_id: gb.book_id,
    user_id: userId,
    read_date: gb.completed_at || new Date().toISOString(),
  }))];

  const uniqueReadBooks = allReadBooks.filter((record, index, self) =>
    index === self.findIndex(r => r.book_id === record.book_id)
  );

  uniqueReadBooks.forEach(record => {
    if (!record.read_date) return;
    const readDate = new Date(record.read_date);
    const monthStr = `${readDate.getFullYear()}-${String(readDate.getMonth() + 1).padStart(2, '0')}`;
    const monthData = monthlyData.find(m => m.month === monthStr);
    if (monthData) {
      monthData.count += 1;
      monthData.hours += 6;
    }
  });

  res.json(monthlyData);
});

router.get('/categories', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userId = req.user.id;

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === userId);
  const goalBooks = db.data.goalBooks.filter(gb => {
    const goal = db.data.readingGoals.find(g => g.id === gb.goal_id);
    return goal?.user_id === userId && gb.is_completed;
  });

  const allReadBooks = [...driftRecords, ...goalBooks.map(gb => ({
    id: gb.id,
    book_id: gb.book_id,
    user_id: userId,
  }))];

  const uniqueReadBooks = allReadBooks.filter((record, index, self) =>
    index === self.findIndex(r => r.book_id === record.book_id)
  );

  const categoriesMap = new Map<string, number>();
  let totalCount = 0;

  uniqueReadBooks.forEach(record => {
    const book = db.data.books.find(b => b.id === record.book_id);
    if (book) {
      const category = book.category || '未分类';
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
      totalCount++;
    }
  });

  const categories = Array.from(categoriesMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalCount > 0 ? Math.round((value / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  res.json(categories);
});

router.get('/reading-trend', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userId = req.user.id;
  const days = 30;
  const dailyData: { date: string; minutes: number; books: number }[] = [];

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData.push({ date: dateStr, minutes: Math.floor(Math.random() * 60) + 10, books: 0 });
  }

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === userId);
  const goalBooks = db.data.goalBooks.filter(gb => {
    const goal = db.data.readingGoals.find(g => g.id === gb.goal_id);
    return goal?.user_id === userId && gb.is_completed;
  });

  const allReadBooks = [...driftRecords, ...goalBooks.map(gb => ({
    id: gb.id,
    book_id: gb.book_id,
    user_id: userId,
    read_date: gb.completed_at || new Date().toISOString(),
  }))];

  const uniqueReadBooks = allReadBooks.filter((record, index, self) =>
    index === self.findIndex(r => r.book_id === record.book_id)
  );

  uniqueReadBooks.forEach(record => {
    if (!record.read_date) return;
    const readDate = new Date(record.read_date).toISOString().split('T')[0];
    const dayData = dailyData.find(d => d.date === readDate);
    if (dayData) {
      dayData.books += 1;
      dayData.minutes += 120;
    }
  });

  res.json(dailyData);
});

router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const format = (req.query.format as string) || 'json';

  await db.read();

  const userId = req.user.id;
  const user = db.data.users.find(u => u.id === userId);

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === userId);
  const goalBooks = db.data.goalBooks.filter(gb => {
    const goal = db.data.readingGoals.find(g => g.id === gb.goal_id);
    return goal?.user_id === userId && gb.is_completed;
  });

  const allReadBooks = [...driftRecords, ...goalBooks.map(gb => ({
    id: gb.id,
    book_id: gb.book_id,
    user_id: userId,
    read_date: gb.completed_at || new Date().toISOString(),
    rating: null,
    notes: null,
  }))];

  const uniqueReadBooks = allReadBooks.filter((record, index, self) =>
    index === self.findIndex(r => r.book_id === record.book_id)
  );

  const readingHistory = uniqueReadBooks.map(record => {
    const book = db.data.books.find(b => b.id === record.book_id);
    return {
      book_title: book?.title || '未知书籍',
      book_author: book?.author || '未知作者',
      category: book?.category || '未分类',
      read_date: record.read_date,
      rating: (record as any).rating || null,
      notes: (record as any).notes || null,
    };
  }).sort((a, b) => {
    const dateA = a.read_date ? new Date(a.read_date).getTime() : 0;
    const dateB = b.read_date ? new Date(b.read_date).getTime() : 0;
    return dateB - dateA;
  });

  const categoriesMap = new Map<string, number>();
  readingHistory.forEach(record => {
    categoriesMap.set(record.category, (categoriesMap.get(record.category) || 0) + 1);
  });

  const stats = {
    user: {
      username: user?.username,
      email: user?.email,
    },
    summary: {
      total_books: readingHistory.length,
      total_categories: categoriesMap.size,
      total_points: user?.points || 0,
      export_date: new Date().toISOString(),
    },
    categories: Array.from(categoriesMap.entries()).map(([name, count]) => ({ name, count })),
    reading_history: readingHistory,
  };

  if (format === 'csv') {
    const headers = ['书名', '作者', '分类', '阅读日期', '评分', '笔记'];
    const rows = readingHistory.map(r => [
      r.book_title,
      r.book_author,
      r.category,
      r.read_date,
      r.rating || '',
      r.notes || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reading-stats-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csvContent);
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reading-stats-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(stats);
  }
});

export default router;
