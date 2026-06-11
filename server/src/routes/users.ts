import { Router } from 'express';
import db, { User, Book, Post, Follow } from '../database';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { validateIdParam, validatePagination } from '../middleware/validate';
import { success, badRequest, unauthorized, forbidden, notFound } from '../utils/response';

const router = Router();

interface UserProfileResponse {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
  points: number;
  created_at: string;
  follower_count: number;
  following_count: number;
  book_count: number;
  post_count: number;
  reading_tags: string[];
  expertise_fields: string[];
  shelf_style: string;
}

interface FollowStatusResponse {
  is_following: boolean;
  is_self: boolean;
}

interface FollowResultResponse {
  is_following: boolean;
  follower_count: number;
}

interface FollowerItem {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
  followed_at: string;
}

interface PostWithTopics extends Post {
  topics: Array<{ id: number; name: string; icon?: string }>;
}

interface PaginatedPostsResponse {
  posts: PostWithTopics[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface UpdateProfileBody {
  avatar?: string;
  bio?: string;
  reading_tags?: string[];
  expertise_fields?: string[];
  shelf_style?: string;
}

function buildUserProfile(user: User): UserProfileResponse {
  const userId = user.id;
  const followerCount = db.data.follows.filter(f => f.following_id === userId).length;
  const followingCount = db.data.follows.filter(f => f.follower_id === userId).length;
  const bookCount = db.data.books.filter(b => b.owner_id === userId).length;
  const postCount = db.data.posts.filter(p => p.author_id === userId).length;

  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    points: user.points,
    created_at: user.created_at,
    follower_count: followerCount,
    following_count: followingCount,
    book_count: bookCount,
    post_count: postCount,
    reading_tags: (user as any).reading_tags || [],
    expertise_fields: (user as any).expertise_fields || [],
    shelf_style: (user as any).shelf_style || 'grid',
  };
}

router.get('/feed/following', authMiddleware, validatePagination(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  const currentUserId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  await db.read();

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
      liked: likedPostIds.has(post.id),
    };
  });

  success<PaginatedPostsResponse>(res, {
    posts: postsWithAuthor as PostWithTopics[],
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum),
  });
});

router.get('/:id', validateIdParam(), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  await db.read();
  const user = db.data.users.find(u => u.id === userId);

  if (!user) {
    return notFound(res, '用户不存在');
  }

  const profile = buildUserProfile(user);
  success<UserProfileResponse>(res, profile);
});

router.get('/:id/follow-status', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user.id;

  if (userId === currentUserId) {
    return success<FollowStatusResponse>(res, { is_following: false, is_self: true });
  }

  await db.read();
  const isFollowing = db.data.follows.some(
    f => f.follower_id === currentUserId && f.following_id === userId
  );

  success<FollowStatusResponse>(res, { is_following: isFollowing, is_self: false });
});

router.post('/:id/follow', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user.id;

  if (userId === currentUserId) {
    return badRequest(res, '不能关注自己');
  }

  await db.read();
  const targetUser = db.data.users.find(u => u.id === userId);
  if (!targetUser) {
    return notFound(res, '用户不存在');
  }

  const existingFollow = db.data.follows.find(
    f => f.follower_id === currentUserId && f.following_id === userId
  );

  if (existingFollow) {
    return badRequest(res, '已经关注了该用户');
  }

  const newId = Math.max(0, ...db.data.follows.map(f => f.id)) + 1;
  const newFollow: Follow = {
    id: newId,
    follower_id: currentUserId,
    following_id: userId,
    created_at: new Date().toISOString(),
  };

  db.data.follows.push(newFollow);
  await db.write();

  const followerCount = db.data.follows.filter(f => f.following_id === userId).length;

  success<FollowResultResponse>(res, {
    is_following: true,
    follower_count: followerCount,
  }, '关注成功');
});

router.post('/:id/unfollow', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user.id;

  await db.read();
  const followIndex = db.data.follows.findIndex(
    f => f.follower_id === currentUserId && f.following_id === userId
  );

  if (followIndex === -1) {
    return badRequest(res, '还没有关注该用户');
  }

  db.data.follows.splice(followIndex, 1);
  await db.write();

  const followerCount = db.data.follows.filter(f => f.following_id === userId).length;

  success<FollowResultResponse>(res, {
    is_following: false,
    follower_count: followerCount,
  }, '取消关注成功');
});

router.get('/:id/followers', validateIdParam(), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  await db.read();
  const followers = db.data.follows
    .filter(f => f.following_id === userId)
    .map(f => {
      const user = db.data.users.find(u => u.id === f.follower_id);
      return {
        id: user!.id,
        username: user!.username,
        avatar: user!.avatar,
        bio: user!.bio,
        followed_at: f.created_at,
      } as FollowerItem;
    });

  success<FollowerItem[]>(res, followers);
});

router.get('/:id/following', validateIdParam(), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  await db.read();
  const following = db.data.follows
    .filter(f => f.follower_id === userId)
    .map(f => {
      const user = db.data.users.find(u => u.id === f.following_id);
      return {
        id: user!.id,
        username: user!.username,
        avatar: user!.avatar,
        bio: user!.bio,
        followed_at: f.created_at,
      } as FollowerItem;
    });

  success<FollowerItem[]>(res, following);
});

router.get('/:id/posts', validateIdParam(), validatePagination(), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);
  const { page = 1, limit = 10 } = req.query;

  await db.read();
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
      topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon })),
    } as PostWithTopics;
  });

  success<PaginatedPostsResponse>(res, {
    posts: postsWithTopics,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum),
  });
});

router.get('/:id/books', validateIdParam(), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  await db.read();
  const books = db.data.books
    .filter(b => b.owner_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  success<Book[]>(res, books);
});

router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  const userId = req.user.id;
  const { avatar, bio, reading_tags, expertise_fields, shelf_style } = req.body as UpdateProfileBody;

  await db.read();
  const userIndex = db.data.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return notFound(res, '用户不存在');
  }

  const user = db.data.users[userIndex];

  if (avatar !== undefined) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio;
  if (reading_tags !== undefined) (user as any).reading_tags = reading_tags;
  if (expertise_fields !== undefined) (user as any).expertise_fields = expertise_fields;
  if (shelf_style !== undefined) (user as any).shelf_style = shelf_style;

  await db.write();

  const userProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    points: user.points,
    reading_tags: (user as any).reading_tags || [],
    expertise_fields: (user as any).expertise_fields || [],
    shelf_style: (user as any).shelf_style || 'grid',
  };

  success(res, userProfile, '个人资料更新成功');
});

router.get('/me/profile', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  const userId = req.user.id;

  await db.read();
  const user = db.data.users.find(u => u.id === userId);

  if (!user) {
    return notFound(res, '用户不存在');
  }

  const profile = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    points: user.points,
    reading_tags: (user as any).reading_tags || [],
    expertise_fields: (user as any).expertise_fields || [],
    shelf_style: (user as any).shelf_style || 'grid',
  };

  success(res, profile);
});

export default router;
