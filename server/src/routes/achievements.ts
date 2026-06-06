import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userAchievements = db.data.userAchievements.filter(ua => ua.user_id === req.user!.id);
  const userAchievementIds = userAchievements.map(ua => ua.achievement_id);

  const achievements = db.data.achievements.map(achievement => {
    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
    return {
      ...achievement,
      unlocked: !!userAchievement,
      unlocked_at: userAchievement?.unlocked_at || null,
    };
  }).sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return a.condition_value - b.condition_value;
  });

  res.json(achievements);
});

router.get('/mine', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const userAchievements = db.data.userAchievements
    .filter(ua => ua.user_id === req.user!.id)
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

  const achievements = userAchievements.map(ua => {
    const achievement = db.data.achievements.find(a => a.id === ua.achievement_id);
    if (!achievement) return null;
    return {
      ...achievement,
      unlocked: true,
      unlocked_at: ua.unlocked_at,
    };
  }).filter(Boolean);

  res.json(achievements);
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === req.user!.id);
  const completedGoals = db.data.readingGoals.filter(g => g.user_id === req.user!.id && g.status === 'completed');
  const userPosts = db.data.posts.filter(p => p.author_id === req.user!.id);
  const userBooks = db.data.books.filter(b => b.owner_id === req.user!.id);
  const completedExchanges = db.data.exchanges.filter(e =>
    (e.requester_id === req.user!.id || e.owner_id === req.user!.id) && e.status === 'completed'
  );
  const userAchievements = db.data.userAchievements.filter(ua => ua.user_id === req.user!.id);

  const stats = {
    books_read: driftRecords.length,
    goals_completed: completedGoals.length,
    posts_made: userPosts.length,
    books_added: userBooks.length,
    exchange_count: completedExchanges.length,
    achievements_unlocked: userAchievements.length,
    total_achievements: db.data.achievements.length,
  };

  res.json(stats);
});

router.post('/check', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  const driftRecords = db.data.driftRecords.filter(d => d.user_id === req.user!.id);
  const completedGoals = db.data.readingGoals.filter(g => g.user_id === req.user!.id && g.status === 'completed');
  const userPosts = db.data.posts.filter(p => p.author_id === req.user!.id);
  const userBooks = db.data.books.filter(b => b.owner_id === req.user!.id);
  const completedExchanges = db.data.exchanges.filter(e =>
    (e.requester_id === req.user!.id || e.owner_id === req.user!.id) && e.status === 'completed'
  );

  const stats = {
    books_read: driftRecords.length,
    goals_completed: completedGoals.length,
    posts_made: userPosts.length,
    books_added: userBooks.length,
    exchange_count: completedExchanges.length,
  };

  const userAchievementIds = db.data.userAchievements
    .filter(ua => ua.user_id === req.user!.id)
    .map(ua => ua.achievement_id);

  const newlyUnlocked: any[] = [];

  for (const achievement of db.data.achievements) {
    if (userAchievementIds.includes(achievement.id)) continue;

    const currentValue = stats[achievement.condition_type as keyof typeof stats] || 0;
    if (currentValue >= achievement.condition_value) {
      const newId = Math.max(0, ...db.data.userAchievements.map(ua => ua.id)) + 1;
      const userAchievement = {
        id: newId,
        user_id: req.user.id,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString(),
      };
      db.data.userAchievements.push(userAchievement);
      newlyUnlocked.push({ ...achievement, unlocked_at: userAchievement.unlocked_at });

      const user = db.data.users.find(u => u.id === req.user!.id);
      if (user) {
        user.points += achievement.points_reward;
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.write();
  }

  res.json({
    newly_unlocked: newlyUnlocked,
    stats,
  });
});

router.get('/types', (_req, res) => {
  const types = [
    { key: 'reading', name: '阅读成就', icon: '📚' },
    { key: 'goal', name: '目标成就', icon: '🎯' },
    { key: 'social', name: '社交成就', icon: '💬' },
    { key: 'collection', name: '收藏成就', icon: '📦' },
  ];
  res.json(types);
});

export default router;
