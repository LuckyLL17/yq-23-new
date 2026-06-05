import { Router } from 'express';
import db from '../database';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 获取所有话题
router.get('/', async (_req, res) => {
  const topics = [...db.data.topics].sort((a, b) => b.post_count - a.post_count);
  res.json(topics);
});

// 获取帖子列表
router.get('/posts', optionalAuthMiddleware, async (req: AuthRequest, res) => {
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

  const postsWithAuthor = paginatedPosts.map(post => {
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

  res.json({
    posts: postsWithAuthor,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum)
  });
});

// 创建帖子
router.post('/posts', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { title, content, topic_ids = [], images = [] } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  if (title.length > 200) {
    return res.status(400).json({ error: 'Title cannot exceed 200 characters' });
  }

  await db.read();

  const newId = Math.max(0, ...db.data.posts.map(p => p.id)) + 1;
  const now = new Date().toISOString();

  const newPost = {
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

  res.status(201).json({
    ...newPost,
    author_name: author?.username,
    author_avatar: author?.avatar,
    topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon }))
  });
});

// 获取帖子详情
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const postId = parseInt(id);

  const post = db.data.posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  post.view_count += 1;
  await db.write();

  const author = db.data.users.find(u => u.id === post.author_id);
  const topics = post.topic_ids.map(tid => db.data.topics.find(t => t.id === tid)).filter(Boolean);

  res.json({
    ...post,
    author_name: author?.username,
    author_avatar: author?.avatar,
    author_bio: author?.bio,
    topics: topics.map(t => ({ id: t!.id, name: t!.name, icon: t!.icon }))
  });
});

// 获取帖子点赞状态
router.get('/posts/:id/like-status', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const postId = parseInt(id);

  const liked = db.data.postLikes.some(
    l => l.post_id === postId && l.user_id === req.user!.id
  );

  res.json({ liked });
});

// 点赞帖子
router.post('/posts/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const postId = parseInt(id);

  await db.read();
  const post = db.data.posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const existingLike = db.data.postLikes.find(
    l => l.post_id === postId && l.user_id === req.user!.id
  );

  if (existingLike) {
    return res.status(400).json({ error: 'Already liked' });
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

  res.json({ liked: true, like_count: post.like_count });
});

// 取消点赞帖子
router.post('/posts/:id/unlike', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const postId = parseInt(id);

  await db.read();
  const post = db.data.posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const likeIndex = db.data.postLikes.findIndex(
    l => l.post_id === postId && l.user_id === req.user!.id
  );

  if (likeIndex === -1) {
    return res.status(400).json({ error: 'Not liked yet' });
  }

  db.data.postLikes.splice(likeIndex, 1);
  post.like_count -= 1;
  await db.write();

  res.json({ liked: false, like_count: post.like_count });
});

// 获取帖子评论列表（包含多级回复）
router.get('/posts/:id/comments', optionalAuthMiddleware, async (req: AuthRequest, res) => {
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

  const commentsWithAuthor = comments.map(comment => {
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

  const buildCommentTree = (parentId: number | null): any[] => {
    return commentsWithAuthor
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        replies: buildCommentTree(c.id)
      }));
  };

  const commentTree = buildCommentTree(null);

  res.json(commentTree);
});

// 添加评论
router.post('/posts/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const postId = parseInt(id);
  const { content, parent_id, reply_to_user_id } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  await db.read();

  const post = db.data.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (parent_id) {
    const parentComment = db.data.comments.find(c => c.id === parent_id);
    if (!parentComment || parentComment.post_id !== postId) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }
  }

  const newId = Math.max(0, ...db.data.comments.map(c => c.id)) + 1;
  const now = new Date().toISOString();

  const newComment = {
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

  res.status(201).json({
    ...newComment,
    author_name: author?.username,
    author_avatar: author?.avatar,
    reply_to_username: replyToUser?.username,
    replies: []
  });
});

// 点赞评论
router.post('/comments/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const commentId = parseInt(id);

  await db.read();
  const comment = db.data.comments.find(c => c.id === commentId);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const existingLike = db.data.commentLikes.find(
    l => l.comment_id === commentId && l.user_id === req.user!.id
  );

  if (existingLike) {
    return res.status(400).json({ error: 'Already liked' });
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

  res.json({ liked: true, like_count: comment.like_count });
});

// 取消点赞评论
router.post('/comments/:id/unlike', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const commentId = parseInt(id);

  await db.read();
  const comment = db.data.comments.find(c => c.id === commentId);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const likeIndex = db.data.commentLikes.findIndex(
    l => l.comment_id === commentId && l.user_id === req.user!.id
  );

  if (likeIndex === -1) {
    return res.status(400).json({ error: 'Not liked yet' });
  }

  db.data.commentLikes.splice(likeIndex, 1);
  comment.like_count -= 1;
  await db.write();

  res.json({ liked: false, like_count: comment.like_count });
});

// 获取话题详情（必须放在最后，因为 :id 会匹配 posts 等路径
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const topicId = parseInt(id);

  const topic = db.data.topics.find(t => t.id === topicId);

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  res.json(topic);
});

export default router;
