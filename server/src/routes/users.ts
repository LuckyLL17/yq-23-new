import { Router } from 'express';
import db from '../database';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/feed/following', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const currentUserId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const followingIds = db.data.follows
    .filter(f => f.follower_id === currentUserId)
    .map(f => f.following_id);

  let posts = db.data.posts
    .filter(p => followingIds.includes(p.author_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = posts.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedPosts = posts.slice(startIndex, startIndex + limitNum);

  const likedPostIds = new Set<number>();
  db.data.postLikes
    .filter(l => l.user_id === currentUserId)
    .forEach(l => likedPostIds.add(l.post_id));

  const postsWithAuthor = paginatedPosts.map(post => {
    const author = db.data.users.find(u => u.id === post.author_id);
    const topics = post.topic_ids
      .map(tid => db.data.topics.find(t => t.id === tid))
      .filter(Boolean);
    return {
      ...post,
      author_name: author?.username,
      author_avatar: author?.avatar,
      topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon })),
      liked: likedPostIds.has(post.id)
    };
  });

  res.json({
    posts: postsWithAuthor,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum)
  });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  const user = db.data.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const followerCount = db.data.follows.filter(f => f.following_id === userId).length;
  const followingCount = db.data.follows.filter(f => f.follower_id === userId).length;
  const bookCount = db.data.books.filter(b => b.owner_id === userId).length;
  const postCount = db.data.posts.filter(p => p.author_id === userId).length;

  res.json({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    points: user.points,
    created_at: user.created_at,
    follower_count: followerCount,
    following_count: followingCount,
    book_count: bookCount,
    post_count: postCount
  });
});

router.get('/:id/follow-status', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user.id;

  if (userId === currentUserId) {
    return res.json({ is_following: false, is_self: true });
  }

  const isFollowing = db.data.follows.some(
    f => f.follower_id === currentUserId && f.following_id === userId
  );

  res.json({ is_following: isFollowing, is_self: false });
});

router.post('/:id/follow', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user.id;

  if (userId === currentUserId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  const targetUser = db.data.users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const existingFollow = db.data.follows.find(
    f => f.follower_id === currentUserId && f.following_id === userId
  );

  if (existingFollow) {
    return res.status(400).json({ error: 'Already following' });
  }

  const newId = Math.max(0, ...db.data.follows.map(f => f.id)) + 1;
  const newFollow = {
    id: newId,
    follower_id: currentUserId,
    following_id: userId,
    created_at: new Date().toISOString()
  };

  db.data.follows.push(newFollow);
  await db.write();

  const followerCount = db.data.follows.filter(f => f.following_id === userId).length;

  res.json({
    is_following: true,
    follower_count: followerCount
  });
});

router.post('/:id/unfollow', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user.id;

  const followIndex = db.data.follows.findIndex(
    f => f.follower_id === currentUserId && f.following_id === userId
  );

  if (followIndex === -1) {
    return res.status(400).json({ error: 'Not following yet' });
  }

  db.data.follows.splice(followIndex, 1);
  await db.write();

  const followerCount = db.data.follows.filter(f => f.following_id === userId).length;

  res.json({
    is_following: false,
    follower_count: followerCount
  });
});

router.get('/:id/followers', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  const followers = db.data.follows
    .filter(f => f.following_id === userId)
    .map(f => {
      const user = db.data.users.find(u => u.id === f.follower_id);
      return {
        id: user!.id,
        username: user!.username,
        avatar: user!.avatar,
        bio: user!.bio,
        followed_at: f.created_at
      };
    });

  res.json(followers);
});

router.get('/:id/following', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  const following = db.data.follows
    .filter(f => f.follower_id === userId)
    .map(f => {
      const user = db.data.users.find(u => u.id === f.following_id);
      return {
        id: user!.id,
        username: user!.username,
        avatar: user!.avatar,
        bio: user!.bio,
        followed_at: f.created_at
      };
    });

  res.json(following);
});

router.get('/:id/posts', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);
  const { page = 1, limit = 10 } = req.query;

  let posts = db.data.posts
    .filter(p => p.author_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = posts.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedPosts = posts.slice(startIndex, startIndex + limitNum);

  const postsWithTopics = paginatedPosts.map(post => {
    const topics = post.topic_ids
      .map(tid => db.data.topics.find(t => t.id === tid))
      .filter(Boolean);
    return {
      ...post,
      topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon }))
    };
  });

  res.json({
    posts: postsWithTopics,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum)
  });
});

router.get('/:id/books', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  const books = db.data.books
    .filter(b => b.owner_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(books);
});

export default router;
