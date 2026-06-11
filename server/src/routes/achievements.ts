import { Router } from 'express';
import db, { Achievement, UserAchievement } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, unauthorized } from '../utils/response';

const router = Router();

interface AchievementWithUnlocked extends Achievement {
  unlocked: boolean;
  unlocked_at: string | null;
}

interface AchievementStats {
  books_read: number;
  goals_completed: number;
  posts_made: number;
  books_added: number;
  exchange_count: number;
  achievements_unlocked: number;
  total_achievements: number;
}

interface CheckAchievementsResponse {
  newly_unlocked: AchievementWithUnlocked[];
  stats: Omit<AchievementStats, 'achievements_unlocked' | 'total_achievements'>;
}

interface AchievementType {
  key: string;
  name: string;
  icon: string;
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
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
    } as AchievementWithUnlocked;
  }).sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return a.condition_value - b.condition_value;
  });

  success<AchievementWithUnlocked[]>(res, achievements);
});

router.get('/mine', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
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
    } as AchievementWithUnlocked;
  }).filter(Boolean) as AchievementWithUnlocked[];

  success<AchievementWithUnlocked[]>(res, achievements);
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
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

  const stats: AchievementStats = {
    books_read: driftRecords.length,
    goals_completed: completedGoals.length,
    posts_made: userPosts.length,
    books_added: userBooks.length,
    exchange_count: completedExchanges.length,
    achievements_unlocked: userAchievements.length,
    total_achievements: db.data.achievements.length,
  };

  success<AchievementStats>(res, stats);
});

router.post('/check', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
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

  const newlyUnlocked: AchievementWithUnlocked[] = [];

  for (const achievement of db.data.achievements) {
    if (userAchievementIds.includes(achievement.id)) continue;

    const currentValue = stats[achievement.condition_type as keyof typeof stats] || 0;
    if (currentValue >= achievement.condition_value) {
      const newId = Math.max(0, ...db.data.userAchievements.map(ua => ua.id)) + 1;
      const userAchievement: UserAchievement = {
        id: newId,
        user_id: req.user.id,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString(),
      };
      db.data.userAchievements.push(userAchievement);
      newlyUnlocked.push({ ...achievement, unlocked: true, unlocked_at: userAchievement.unlocked_at });

      const user = db.data.users.find(u => u.id === req.user!.id);
      if (user) {
        user.points += achievement.points_reward;
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.write();
  }

  success<CheckAchievementsResponse>(res, {
    newly_unlocked: newlyUnlocked,
    stats,
  });
});

router.get('/types', (_req, res) => {
  const types: AchievementType[] = [
    { key: 'reading', name: '阅读成就', icon: '📚' },
    { key: 'goal', name: '目标成就', icon: '🎯' },
    { key: 'social', name: '社交成就', icon: '💬' },
    { key: 'collection', name: '收藏成就', icon: '📦' },
  ];
  success<AchievementType[]>(res, types);
});

export default router;
