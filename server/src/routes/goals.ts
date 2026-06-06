import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const checkAchievements = async (userId: number) => {
  await db.read();

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === userId);
  const completedGoals = db.data.readingGoals.filter(g => g.user_id === userId && g.status === 'completed');
  const userPosts = db.data.posts.filter(p => p.author_id === userId);
  const userBooks = db.data.books.filter(b => b.owner_id === userId);
  const completedExchanges = db.data.exchanges.filter(e =>
    (e.requester_id === userId || e.owner_id === userId) && e.status === 'completed'
  );

  const stats = {
    books_read: driftRecords.length,
    goals_completed: completedGoals.length,
    posts_made: userPosts.length,
    books_added: userBooks.length,
    exchange_count: completedExchanges.length,
  };

  const userAchievementIds = db.data.userAchievements
    .filter(ua => ua.user_id === userId)
    .map(ua => ua.achievement_id);

  const newlyUnlocked: any[] = [];

  for (const achievement of db.data.achievements) {
    if (userAchievementIds.includes(achievement.id)) continue;

    const currentValue = stats[achievement.condition_type as keyof typeof stats];
    if (currentValue >= achievement.condition_value) {
      const newId = Math.max(0, ...db.data.userAchievements.map(ua => ua.id)) + 1;
      const userAchievement = {
        id: newId,
        user_id: userId,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString(),
      };
      db.data.userAchievements.push(userAchievement);
      newlyUnlocked.push({ ...achievement, unlocked_at: userAchievement.unlocked_at });

      const user = db.data.users.find(u => u.id === userId);
      if (user) {
        user.points += achievement.points_reward;
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.write();
  }

  return newlyUnlocked;
};

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const goals = db.data.readingGoals
    .filter(g => g.user_id === req.user!.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(goal => {
      const books = db.data.goalBooks.filter(b => b.goal_id === goal.id);
      const completedCount = books.filter(b => b.is_completed).length;
      return {
        ...goal,
        book_count: books.length,
        completed_count: completedCount,
        progress: goal.target_books > 0 ? Math.min(100, Math.round((completedCount / goal.target_books) * 100)) : 0,
      };
    });

  res.json(goals);
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { title, description, target_books, start_date, end_date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '目标标题不能为空' });
  }

  if (!target_books || target_books < 1) {
    return res.status(400).json({ error: '目标书籍数量不能少于1本' });
  }

  if (!start_date || !end_date) {
    return res.status(400).json({ error: '请设置开始和结束日期' });
  }

  await db.read();

  const newId = Math.max(0, ...db.data.readingGoals.map(g => g.id)) + 1;

  const newGoal = {
    id: newId,
    user_id: req.user.id,
    title: title.trim(),
    description: description || '',
    target_books: parseInt(target_books),
    start_date: new Date(start_date).toISOString(),
    end_date: new Date(end_date).toISOString(),
    status: 'active' as const,
    created_at: new Date().toISOString(),
  };

  db.data.readingGoals.push(newGoal);
  await db.write();

  res.status(201).json({ ...newGoal, book_count: 0, completed_count: 0, progress: 0 });
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();

  const goal = db.data.readingGoals.find(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (!goal) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  const goalBooks = db.data.goalBooks
    .filter(b => b.goal_id === parseInt(id))
    .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());

  const books = goalBooks.map(gb => {
    const book = db.data.books.find(b => b.id === gb.book_id);
    if (!book) return null;
    return {
      ...book,
      goal_book_id: gb.id,
      is_completed: gb.is_completed,
      completed_at: gb.completed_at,
      added_at: gb.added_at,
    };
  }).filter(Boolean);

  const completedCount = books.filter((b: any) => b.is_completed).length;

  res.json({
    ...goal,
    books,
    book_count: books.length,
    completed_count: completedCount,
    progress: goal.target_books > 0 ? Math.min(100, Math.round((completedCount / goal.target_books) * 100)) : 0,
  });
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { title, description, target_books, start_date, end_date, status } = req.body;

  await db.read();

  const goalIndex = db.data.readingGoals.findIndex(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (goalIndex === -1) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  if (title && title.trim()) {
    db.data.readingGoals[goalIndex].title = title.trim();
  }
  if (description !== undefined) {
    db.data.readingGoals[goalIndex].description = description;
  }
  if (target_books && target_books > 0) {
    db.data.readingGoals[goalIndex].target_books = parseInt(target_books);
  }
  if (start_date) {
    db.data.readingGoals[goalIndex].start_date = new Date(start_date).toISOString();
  }
  if (end_date) {
    db.data.readingGoals[goalIndex].end_date = new Date(end_date).toISOString();
  }
  if (status && ['active', 'completed', 'failed'].includes(status)) {
    db.data.readingGoals[goalIndex].status = status;
  }

  await db.write();

  const goalBooks = db.data.goalBooks.filter(b => b.goal_id === parseInt(id));
  const completedCount = goalBooks.filter(b => b.is_completed).length;

  res.json({
    ...db.data.readingGoals[goalIndex],
    book_count: goalBooks.length,
    completed_count: completedCount,
    progress: db.data.readingGoals[goalIndex].target_books > 0
      ? Math.min(100, Math.round((completedCount / db.data.readingGoals[goalIndex].target_books) * 100))
      : 0,
  });
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();

  const goalIndex = db.data.readingGoals.findIndex(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (goalIndex === -1) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  db.data.goalBooks = db.data.goalBooks.filter(b => b.goal_id !== parseInt(id));
  db.data.readingGoals.splice(goalIndex, 1);
  await db.write();

  res.json({ message: '阅读目标已删除' });
});

router.post('/:id/books', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { book_id } = req.body;

  if (!book_id) {
    return res.status(400).json({ error: 'book_id is required' });
  }

  await db.read();

  const goal = db.data.readingGoals.find(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (!goal) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  const book = db.data.books.find(b => b.id === book_id);
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const existingItem = db.data.goalBooks.find(
    b => b.goal_id === parseInt(id) && b.book_id === book_id
  );
  if (existingItem) {
    return res.status(400).json({ error: '该书已在阅读目标中' });
  }

  const newId = Math.max(0, ...db.data.goalBooks.map(b => b.id)) + 1;

  const newGoalBook = {
    id: newId,
    goal_id: parseInt(id),
    book_id: book_id,
    is_completed: false,
    added_at: new Date().toISOString(),
  };

  db.data.goalBooks.push(newGoalBook);
  await db.write();

  res.status(201).json({ ...newGoalBook, book });
});

router.delete('/:id/books/:bookId', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id, bookId } = req.params;

  await db.read();

  const goal = db.data.readingGoals.find(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (!goal) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  const itemIndex = db.data.goalBooks.findIndex(
    b => b.goal_id === parseInt(id) && b.book_id === parseInt(bookId)
  );

  if (itemIndex === -1) {
    return res.status(404).json({ error: '该书不在阅读目标中' });
  }

  db.data.goalBooks.splice(itemIndex, 1);
  await db.write();

  res.json({ message: '已从阅读目标中移除' });
});

router.post('/:id/books/:bookId/complete', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id, bookId } = req.params;

  await db.read();

  const goal = db.data.readingGoals.find(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (!goal) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  const goalBook = db.data.goalBooks.find(
    b => b.goal_id === parseInt(id) && b.book_id === parseInt(bookId)
  );

  if (!goalBook) {
    return res.status(404).json({ error: '该书不在阅读目标中' });
  }

  if (goalBook.is_completed) {
    return res.status(400).json({ error: '该书已经标记为已读' });
  }

  goalBook.is_completed = true;
  goalBook.completed_at = new Date().toISOString();

  const goalBooks = db.data.goalBooks.filter(b => b.goal_id === parseInt(id));
  const completedCount = goalBooks.filter(b => b.is_completed).length;

  if (completedCount >= goal.target_books && goal.status === 'active') {
    goal.status = 'completed';
  }

  await db.write();

  const newlyUnlocked = await checkAchievements(req.user.id);

  const book = db.data.books.find(b => b.id === parseInt(bookId));

  res.json({
    message: '已标记为已读',
    goal_book: goalBook,
    book,
    newly_unlocked_achievements: newlyUnlocked,
  });
});

router.post('/:id/books/:bookId/uncomplete', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id, bookId } = req.params;

  await db.read();

  const goal = db.data.readingGoals.find(
    g => g.id === parseInt(id) && g.user_id === req.user!.id
  );

  if (!goal) {
    return res.status(404).json({ error: '阅读目标不存在' });
  }

  const goalBook = db.data.goalBooks.find(
    b => b.goal_id === parseInt(id) && b.book_id === parseInt(bookId)
  );

  if (!goalBook) {
    return res.status(404).json({ error: '该书不在阅读目标中' });
  }

  if (!goalBook.is_completed) {
    return res.status(400).json({ error: '该书尚未标记为已读' });
  }

  goalBook.is_completed = false;
  goalBook.completed_at = undefined;

  const goalBooks = db.data.goalBooks.filter(b => b.goal_id === parseInt(id));
  const completedCount = goalBooks.filter(b => b.is_completed).length;

  if (completedCount < goal.target_books && goal.status === 'completed') {
    goal.status = 'active';
  }

  await db.write();

  const book = db.data.books.find(b => b.id === parseInt(bookId));

  res.json({
    message: '已取消已读标记',
    goal_book: goalBook,
    book,
  });
});

export default router;
