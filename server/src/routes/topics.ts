import { Router } from 'express';
import db, { Topic, Post, Comment, User, PostLike, CommentLike } from '../database';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { success, created, badRequest, unauthorized, forbidden, notFound } from '../utils/response';
import { validate, validateIdParam, validatePagination } from '../middleware/validate';

const router = Router();

interface CreatePostRequest {
  title: string;
  content: string;
  topic_ids?: number[];
  images?: string[];
}

interface PostWithAuthor extends Post {
  author_name?: string;
  author_avatar?: string;
  author_bio?: string;
  topics: { id: number; name: string; icon?: string }[];
  liked: boolean;
}

interface PostListResponse {
  posts: PostWithAuthor[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface LikeStatusResponse {
  liked: boolean;
}

interface LikeResponse {
  liked: boolean;
  like_count: number;
}

interface CreateCommentRequest {
  content: string;
  parent_id?: number;
  reply_to_user_id?: number;
}

interface CommentWithAuthor extends Comment {
  author_name?: string;
  author_avatar?: string;
  reply_to_username?: string;
  liked: boolean;
}

interface CommentTreeNode extends CommentWithAuthor {
  replies: CommentTreeNode[];
}

// 获取所有话题
router.get('/', async (_req, res) => {
  const topics = [...db.data.topics].sort((a, b) => b.post_count - a.post_count);
  success(res, topics);
});

// 获取帖子列表
router.get('/posts', optionalAuthMiddleware, validatePagination(), validate({
  query: {
    topic_id: { type: 'number' },
    search: { type: 'string' },
    sort_by: { type: 'string', enum: ['created_at', 'like_count', 'view_count', 'comment_count'] },
    sort_order: { type: 'string', enum: ['asc', 'desc'] },
  },
}), async (req: AuthRequest, res) => {
  const { topic_id, search, sort_by = 'created_at', sort_order = 'desc', page = 1, limit = 10 } = req.query;
  const userId = req.user?.id;

  let posts = [...db.data.posts];

  if (topic_id) {
    const tid = parseInt(topic_id as string);
    posts = posts.filter(p => p.topic_ids.includes(tid));
  }

  if (search) {
    const keyword = (search as string).toLowerCase();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(keyword) ||
      p.content.toLowerCase().includes(keyword)
    );
  }

  if (sort_by === 'created_at') {
    posts.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sort_order === 'asc' ? -diff : diff;
    });
  } else if (sort_by === 'like_count') {
    posts.sort((a, b) => {
      return sort_order === 'asc' ? a.like_count - b.like_count : b.like_count - a.like_count;
    });
  } else if (sort_by === 'view_count') {
    posts.sort((a, b) => {
      return sort_order === 'asc' ? a.view_count - b.view_count : b.view_count - a.view_count;
    });
  } else if (sort_by === 'comment_count') {
    posts.sort((a, b) => {
      return sort_order === 'asc' ? a.comment_count - b.comment_count : b.comment_count - a.comment_count;
    });
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = posts.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedPosts = posts.slice(startIndex, startIndex + limitNum);

  const likedPostIds = new Set<number>();
  if (userId) {
    db.data.postLikes
      .filter(l => l.user_id === userId)
      .forEach(l => likedPostIds.add(l.post_id));
  }

  const postsWithAuthor: PostWithAuthor[] = paginatedPosts.map(post => {
    const author = db.data.users.find(u => u.id === post.author_id);
    const topics = post.topic_ids.map(tid => db.data.topics.find(t => t.id === tid)).filter(Boolean);
    return {
      ...post,
      author_name: author?.username,
      author_avatar: author?.avatar,
      topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon })),
      liked: likedPostIds.has(post.id)
    };
  });

  const response: PostListResponse = {
    posts: postsWithAuthor,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum)
  };

  success(res, response);
});

// 创建帖子
router.post(
  '/posts',
  authMiddleware,
  validate({
    body: {
      title: { type: 'string', required: true, max: 200 },
      content: { type: 'string', required: true },
      topic_ids: { type: 'array' },
      images: { type: 'array' },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res, 'Not authenticated');
    }

    const { title, content, topic_ids = [], images = [] } = req.body as CreatePostRequest;

    await db.read();

    const newId = Math.max(0, ...db.data.posts.map(p => p.id)) + 1;
    const now = new Date().toISOString();

    const newPost: Post = {
      id: newId,
      title,
      content,
      author_id: req.user.id,
      topic_ids: Array.isArray(topic_ids) ? topic_ids : [],
      images: Array.isArray(images) ? images : [],
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now
    };

    db.data.posts.push(newPost);

    for (const tid of newPost.topic_ids) {
      const topic = db.data.topics.find(t => t.id === tid);
      if (topic) {
        topic.post_count += 1;
      }
    }

    await db.write();

    const author = db.data.users.find(u => u.id === req.user!.id);
    const topics = newPost.topic_ids.map(tid => db.data.topics.find(t => t.id === tid)).filter(Boolean);

    const response = {
      ...newPost,
      author_name: author?.username,
      author_avatar: author?.avatar,
      topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon }))
    };

    created(res, response);
  }
);

// 获取帖子详情
router.get('/posts/:id', validateIdParam(), async (req, res) => {
  const { id } = req.params;
  const postId = parseInt(id);

  const post = db.data.posts.find(p => p.id === postId);

  if (!post) {
    return notFound(res, 'Post not found');
  }

  post.view_count += 1;
  await db.write();

  const author = db.data.users.find(u => u.id === post.author_id);
  const topics = post.topic_ids.map(tid => db.data.topics.find(t => t.id === tid)).filter(Boolean);

  const response: PostWithAuthor = {
    ...post,
    author_name: author?.username,
    author_avatar: author?.avatar,
    author_bio: author?.bio,
    topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon })),
    liked: false
  };

  success(res, response);
});

// 获取帖子点赞状态
router.get('/posts/:id/like-status', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const postId = parseInt(id);

  const liked = db.data.postLikes.some(
    l => l.post_id === postId && l.user_id === req.user!.id
  );

  const response: LikeStatusResponse = { liked };
  success(res, response);
});

// 点赞帖子
router.post('/posts/:id/like', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const postId = parseInt(id);

  await db.read();
  const post = db.data.posts.find(p => p.id === postId);

  if (!post) {
    return notFound(res, 'Post not found');
  }

  const existingLike = db.data.postLikes.find(
    l => l.post_id === postId && l.user_id === req.user!.id
  );

  if (existingLike) {
    return badRequest(res, 'Already liked');
  }

  const newLikeId = Math.max(0, ...db.data.postLikes.map(l => l.id)) + 1;
  db.data.postLikes.push({
    id: newLikeId,
    post_id: postId,
    user_id: req.user.id,
    created_at: new Date().toISOString()
  });

  post.like_count += 1;
  await db.write();

  const response: LikeResponse = { liked: true, like_count: post.like_count };
  success(res, response);
});

// 取消点赞帖子
router.post('/posts/:id/unlike', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const postId = parseInt(id);

  await db.read();
  const post = db.data.posts.find(p => p.id === postId);

  if (!post) {
    return notFound(res, 'Post not found');
  }

  const likeIndex = db.data.postLikes.findIndex(
    l => l.post_id === postId && l.user_id === req.user!.id
  );

  if (likeIndex === -1) {
    return badRequest(res, 'Not liked yet');
  }

  db.data.postLikes.splice(likeIndex, 1);
  post.like_count -= 1;
  await db.write();

  const response: LikeResponse = { liked: false, like_count: post.like_count };
  success(res, response);
});

// 获取帖子评论列表（包含多级回复）
router.get('/posts/:id/comments', optionalAuthMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const postId = parseInt(id);
  const userId = req.user?.id;

  const comments = db.data.comments
    .filter(c => c.post_id === postId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const likedCommentIds = new Set<number>();
  if (userId) {
    db.data.commentLikes
      .filter(l => l.user_id === userId)
      .forEach(l => likedCommentIds.add(l.comment_id));
  }

  const commentsWithAuthor: CommentWithAuthor[] = comments.map(comment => {
    const author = db.data.users.find(u => u.id === comment.author_id);
    const replyToUser = comment.reply_to_user_id
      ? db.data.users.find(u => u.id === comment.reply_to_user_id)
      : null;
    return {
      ...comment,
      author_name: author?.username,
      author_avatar: author?.avatar,
      reply_to_username: replyToUser?.username,
      liked: likedCommentIds.has(comment.id)
    };
  });

  const buildCommentTree = (parentId: number | null): CommentTreeNode[] => {
    return commentsWithAuthor
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        replies: buildCommentTree(c.id)
      }));
  };

  const commentTree = buildCommentTree(null);

  success(res, commentTree);
});

// 添加评论
router.post(
  '/posts/:id/comments',
  authMiddleware,
  validateIdParam(),
  validate({
    body: {
      content: { type: 'string', required: true, min: 1 },
      parent_id: { type: 'number' },
      reply_to_user_id: { type: 'number' },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res, 'Not authenticated');
    }

    const { id } = req.params;
    const postId = parseInt(id);
    const { content, parent_id, reply_to_user_id } = req.body as CreateCommentRequest;

    await db.read();

    const post = db.data.posts.find(p => p.id === postId);
    if (!post) {
      return notFound(res, 'Post not found');
    }

    if (parent_id) {
      const parentComment = db.data.comments.find(c => c.id === parent_id);
      if (!parentComment || parentComment.post_id !== postId) {
        return notFound(res, 'Parent comment not found');
      }
    }

    const newId = Math.max(0, ...db.data.comments.map(c => c.id)) + 1;
    const now = new Date().toISOString();

    const newComment: Comment = {
      id: newId,
      post_id: postId,
      author_id: req.user.id,
      content: content.trim(),
      parent_id: parent_id || null,
      reply_to_user_id: reply_to_user_id || undefined,
      like_count: 0,
      created_at: now
    };

    db.data.comments.push(newComment);
    post.comment_count += 1;
    await db.write();

    const author = db.data.users.find(u => u.id === req.user!.id);
    const replyToUser = newComment.reply_to_user_id
      ? db.data.users.find(u => u.id === newComment.reply_to_user_id)
      : null;

    const response: CommentTreeNode = {
      ...newComment,
      author_name: author?.username,
      author_avatar: author?.avatar,
      reply_to_username: replyToUser?.username,
      liked: false,
      replies: []
    };

    created(res, response);
  }
);

// 点赞评论
router.post('/comments/:id/like', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const commentId = parseInt(id);

  await db.read();
  const comment = db.data.comments.find(c => c.id === commentId);

  if (!comment) {
    return notFound(res, 'Comment not found');
  }

  const existingLike = db.data.commentLikes.find(
    l => l.comment_id === commentId && l.user_id === req.user!.id
  );

  if (existingLike) {
    return badRequest(res, 'Already liked');
  }

  const newLikeId = Math.max(0, ...db.data.commentLikes.map(l => l.id)) + 1;
  db.data.commentLikes.push({
    id: newLikeId,
    comment_id: commentId,
    user_id: req.user.id,
    created_at: new Date().toISOString()
  });

  comment.like_count += 1;
  await db.write();

  const response: LikeResponse = { liked: true, like_count: comment.like_count };
  success(res, response);
});

// 取消点赞评论
router.post('/comments/:id/unlike', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const commentId = parseInt(id);

  await db.read();
  const comment = db.data.comments.find(c => c.id === commentId);

  if (!comment) {
    return notFound(res, 'Comment not found');
  }

  const likeIndex = db.data.commentLikes.findIndex(
    l => l.comment_id === commentId && l.user_id === req.user!.id
  );

  if (likeIndex === -1) {
    return badRequest(res, 'Not liked yet');
  }

  db.data.commentLikes.splice(likeIndex, 1);
  comment.like_count -= 1;
  await db.write();

  const response: LikeResponse = { liked: false, like_count: comment.like_count };
  success(res, response);
});

// 获取话题详情（必须放在最后，因为 :id 会匹配 posts 等路径
router.get('/:id', validateIdParam(), async (req, res) => {
  const { id } = req.params;
  const topicId = parseInt(id);

  const topic = db.data.topics.find(t => t.id === topicId);

  if (!topic) {
    return notFound(res, 'Topic not found');
  }

  success(res, topic);
});

export default router;
