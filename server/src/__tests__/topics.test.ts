import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import db from '../database';
import topicRoutes from '../routes/topics';
import '../database';

const JWT_SECRET = 'book-exchange-secret-key';

const app = express();
app.use(express.json());
app.use('/api/topics', topicRoutes);

function generateToken(userId: number) {
  const users: Record<number, { id: number; username: string; email: string; role: string }> = {
    1: { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin' },
    2: { id: 2, username: 'booklover', email: 'booklover@example.com', role: 'user' },
    3: { id: 3, username: 'reader123', email: 'reader@example.com', role: 'user' },
    4: { id: 4, username: 'bibliophile', email: 'biblio@example.com', role: 'user' },
  };
  return jwt.sign(users[userId], JWT_SECRET);
}

function authHeader(userId: number) {
  return { Authorization: `Bearer ${generateToken(userId)}` };
}

describe('Topics & Posts API', () => {
  describe('GET /api/topics', () => {
    it('should return all topics as an array', async () => {
      const res = await request(app).get('/api/topics');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should sort topics by post_count descending', async () => {
      const res = await request(app).get('/api/topics');

      expect(res.status).toBe(200);
      if (res.body.data.length > 1) {
        for (let i = 1; i < res.body.data.length; i++) {
          expect(res.body.data[i - 1].post_count).toBeGreaterThanOrEqual(res.body.data[i].post_count);
        }
      }
    });

    it('should include topic fields: id, name, description, icon, post_count', async () => {
      const res = await request(app).get('/api/topics');

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const topic = res.body.data[0];
        expect(topic).toHaveProperty('id');
        expect(topic).toHaveProperty('name');
        expect(topic).toHaveProperty('post_count');
      }
    });
  });

  describe('GET /api/topics/:id', () => {
    it('should return a topic by id', async () => {
      const res = await request(app).get('/api/topics/1');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id', 1);
      expect(res.body.data).toHaveProperty('name');
    });

    it('should return 404 for non-existent topic', async () => {
      const res = await request(app).get('/api/topics/9999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/topics/abc');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('GET /api/topics/posts', () => {
    it('should return paginated posts list', async () => {
      const res = await request(app).get('/api/topics/posts');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('posts');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
      expect(res.body.data).toHaveProperty('total_pages');
      expect(Array.isArray(res.body.data.posts)).toBe(true);
    });

    it('should filter posts by topic_id', async () => {
      const res = await request(app).get('/api/topics/posts?topic_id=1');

      expect(res.status).toBe(200);
      if (res.body.data.posts.length > 0) {
        for (const post of res.body.data.posts) {
          expect(post.topic_ids).toContain(1);
        }
      }
    });

    it('should search posts by keyword', async () => {
      const res = await request(app).get('/api/topics/posts?search=三体');

      expect(res.status).toBe(200);
      if (res.body.data.posts.length > 0) {
        for (const post of res.body.data.posts) {
          const match = post.title.includes('三体') || post.content.includes('三体');
          expect(match).toBe(true);
        }
      }
    });

    it('should sort posts by like_count descending', async () => {
      const res = await request(app).get('/api/topics/posts?sort_by=like_count&sort_order=desc');

      expect(res.status).toBe(200);
      const posts = res.body.data.posts;
      for (let i = 1; i < posts.length; i++) {
        expect(posts[i - 1].like_count).toBeGreaterThanOrEqual(posts[i].like_count);
      }
    });

    it('should sort posts by view_count ascending', async () => {
      const res = await request(app).get('/api/topics/posts?sort_by=view_count&sort_order=asc');

      expect(res.status).toBe(200);
      const posts = res.body.data.posts;
      for (let i = 1; i < posts.length; i++) {
        expect(posts[i - 1].view_count).toBeLessThanOrEqual(posts[i].view_count);
      }
    });

    it('should sort posts by comment_count', async () => {
      const res = await request(app).get('/api/topics/posts?sort_by=comment_count&sort_order=desc');

      expect(res.status).toBe(200);
      const posts = res.body.data.posts;
      for (let i = 1; i < posts.length; i++) {
        expect(posts[i - 1].comment_count).toBeGreaterThanOrEqual(posts[i].comment_count);
      }
    });

    it('should respect page and limit parameters', async () => {
      const res = await request(app).get('/api/topics/posts?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBeLessThanOrEqual(2);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
    });

    it('should calculate total_pages correctly', async () => {
      const res = await request(app).get('/api/topics/posts?limit=2');

      expect(res.status).toBe(200);
      const { total, limit, total_pages } = res.body.data;
      expect(total_pages).toBe(Math.ceil(total / limit));
    });

    it('should enrich posts with author_name, topics, liked', async () => {
      const res = await request(app).get('/api/topics/posts');

      expect(res.status).toBe(200);
      if (res.body.data.posts.length > 0) {
        const post = res.body.data.posts[0];
        expect(post).toHaveProperty('author_name');
        expect(post).toHaveProperty('topics');
        expect(post).toHaveProperty('liked');
        expect(Array.isArray(post.topics)).toBe(true);
        expect(typeof post.liked).toBe('boolean');
      }
    });

    it('should reflect liked status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/topics/posts')
        .set(authHeader(2));

      expect(res.status).toBe(200);
      for (const post of res.body.data.posts) {
        expect(typeof post.liked).toBe('boolean');
      }
    });

    it('should return liked=false when not authenticated', async () => {
      const res = await request(app).get('/api/topics/posts');

      expect(res.status).toBe(200);
      for (const post of res.body.data.posts) {
        expect(post.liked).toBe(false);
      }
    });

    it('should return empty posts for non-matching search', async () => {
      const res = await request(app).get('/api/topics/posts?search=zzznonexistent');

      expect(res.status).toBe(200);
      expect(res.body.data.posts.length).toBe(0);
      expect(res.body.data.total).toBe(0);
    });

    it('should return validation error for invalid sort_by', async () => {
      const res = await request(app).get('/api/topics/posts?sort_by=invalid_field');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error for invalid sort_order', async () => {
      const res = await request(app).get('/api/topics/posts?sort_order=random');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('POST /api/topics/posts', () => {
    it('should create a new post with auth', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set(authHeader(2))
        .send({
          title: 'Test Post Title',
          content: 'Test post content body',
          topic_ids: [5],
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('Test Post Title');
      expect(res.body.data.content).toBe('Test post content body');
      expect(res.body.data.author_id).toBe(2);
      expect(res.body.data.view_count).toBe(0);
      expect(res.body.data.like_count).toBe(0);
      expect(res.body.data.comment_count).toBe(0);
      expect(res.body.data).toHaveProperty('author_name');
      expect(res.body.data).toHaveProperty('topics');
    });

    it('should create a post with images', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set(authHeader(3))
        .send({
          title: 'Post with Images',
          content: 'Content with images',
          topic_ids: [1],
          images: ['https://example.com/img1.jpg'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.images).toEqual(['https://example.com/img1.jpg']);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .send({
          title: 'Unauthorized Post',
          content: 'Should fail',
        });

      expect(res.status).toBe(401);
    });

    it('should return validation error when title is missing', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set(authHeader(1))
        .send({ content: 'Content without title' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when content is missing', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set(authHeader(1))
        .send({ title: 'Title without content' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when title exceeds max length', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set(authHeader(1))
        .send({
          title: 'a'.repeat(201),
          content: 'Valid content',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should increment post_count for each associated topic', async () => {
      await db.read();
      const beforeTopic1 = db.data.topics.find(t => t.id === 1)!.post_count;
      const beforeTopic2 = db.data.topics.find(t => t.id === 2)!.post_count;

      await request(app)
        .post('/api/topics/posts')
        .set(authHeader(1))
        .send({
          title: 'Multi-topic post',
          content: 'Belongs to multiple topics',
          topic_ids: [1, 2],
        });

      await db.read();
      expect(db.data.topics.find(t => t.id === 1)!.post_count).toBe(beforeTopic1 + 1);
      expect(db.data.topics.find(t => t.id === 2)!.post_count).toBe(beforeTopic2 + 1);
    });
  });

  describe('GET /api/topics/posts/:id', () => {
    it('should return post detail', async () => {
      const res = await request(app).get('/api/topics/posts/1');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data).toHaveProperty('author_name');
      expect(res.body.data).toHaveProperty('author_bio');
      expect(res.body.data).toHaveProperty('topics');
      expect(res.body.data).toHaveProperty('liked');
    });

    it('should increment view_count on each request', async () => {
      await db.read();
      const viewsBefore = db.data.posts.find(p => p.id === 1)!.view_count;

      await request(app).get('/api/topics/posts/1');

      await db.read();
      expect(db.data.posts.find(p => p.id === 1)!.view_count).toBe(viewsBefore + 1);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app).get('/api/topics/posts/9999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/topics/posts/invalid');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('GET /api/topics/posts/:id/like-status', () => {
    it('should return liked status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/topics/posts/1/like-status')
        .set(authHeader(2));

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('liked');
      expect(typeof res.body.data.liked).toBe('boolean');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/topics/posts/1/like-status');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/topics/posts/:id/like', () => {
    it('should like a post successfully', async () => {
      const likeRes = await request(app)
        .post('/api/topics/posts/3/like')
        .set(authHeader(4));

      if (likeRes.status === 400) {
        await request(app)
          .post('/api/topics/posts/3/unlike')
          .set(authHeader(4));
        const retryRes = await request(app)
          .post('/api/topics/posts/3/like')
          .set(authHeader(4));
        expect(retryRes.status).toBe(200);
        expect(retryRes.body.data.liked).toBe(true);
        return;
      }

      expect(likeRes.status).toBe(200);
      expect(likeRes.body.code).toBe(0);
      expect(likeRes.body.data.liked).toBe(true);
    });

    it('should not allow liking the same post twice', async () => {
      await request(app)
        .post('/api/topics/posts/3/like')
        .set(authHeader(4))
        .catch(() => {});

      const res = await request(app)
        .post('/api/topics/posts/3/like')
        .set(authHeader(4));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 when liking non-existent post', async () => {
      const res = await request(app)
        .post('/api/topics/posts/9999/like')
        .set(authHeader(1));

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/topics/posts/1/like');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/topics/posts/:id/unlike', () => {
    it('should unlike a post successfully', async () => {
      await request(app)
        .post('/api/topics/posts/3/like')
        .set(authHeader(4))
        .catch(() => {});

      const res = await request(app)
        .post('/api/topics/posts/3/unlike')
        .set(authHeader(4));

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.liked).toBe(false);
    });

    it('should return 400 when unliking a post not liked', async () => {
      const res = await request(app)
        .post('/api/topics/posts/3/unlike')
        .set(authHeader(4));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 when unliking non-existent post', async () => {
      const res = await request(app)
        .post('/api/topics/posts/9999/unlike')
        .set(authHeader(1));

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/topics/posts/1/unlike');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/topics/posts/:id/comments', () => {
    it('should return comments tree for a post', async () => {
      const res = await request(app).get('/api/topics/posts/1/comments');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return nested replies within comments', async () => {
      const res = await request(app).get('/api/topics/posts/2/comments');

      expect(res.status).toBe(200);
      const comments = res.body.data;
      const commentWithReplies = comments.find((c: any) => c.replies && c.replies.length > 0);
      if (commentWithReplies) {
        expect(Array.isArray(commentWithReplies.replies)).toBe(true);
        expect(commentWithReplies.replies[0]).toHaveProperty('id');
        expect(commentWithReplies.replies[0]).toHaveProperty('content');
      }
    });

    it('should enrich comments with author_name and liked status', async () => {
      const res = await request(app)
        .get('/api/topics/posts/1/comments')
        .set(authHeader(3));

      expect(res.status).toBe(200);
      const comments = res.body.data;
      if (comments.length > 0) {
        const comment = comments[0];
        expect(comment).toHaveProperty('author_name');
        expect(comment).toHaveProperty('liked');
        expect(typeof comment.liked).toBe('boolean');
      }
    });

    it('should show liked=false without auth', async () => {
      const res = await request(app).get('/api/topics/posts/1/comments');

      expect(res.status).toBe(200);
      const flattenComments = (nodes: any[]): any[] =>
        nodes.flatMap(n => [n, ...flattenComments(n.replies || [])]);
      const allComments = flattenComments(res.body.data);
      for (const c of allComments) {
        expect(c.liked).toBe(false);
      }
    });

    it('should include reply_to_username for reply comments', async () => {
      const res = await request(app).get('/api/topics/posts/1/comments');

      expect(res.status).toBe(200);
      const flattenComments = (nodes: any[]): any[] =>
        nodes.flatMap(n => [n, ...flattenComments(n.replies || [])]);
      const allComments = flattenComments(res.body.data);
      const replyComment = allComments.find(c => c.parent_id !== null && c.reply_to_user_id);
      if (replyComment) {
        expect(replyComment).toHaveProperty('reply_to_username');
      }
    });

    it('should return empty array for post with no comments', async () => {
      const res = await request(app).get('/api/topics/posts/9999/comments');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/topics/posts/:id/comments', () => {
    it('should add a top-level comment to a post', async () => {
      await db.read();
      const commentCountBefore = db.data.posts.find(p => p.id === 2)!.comment_count;

      const res = await request(app)
        .post('/api/topics/posts/2/comments')
        .set(authHeader(1))
        .send({ content: 'Great post!' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.content).toBe('Great post!');
      expect(res.body.data.author_id).toBe(1);
      expect(res.body.data.post_id).toBe(2);
      expect(res.body.data.parent_id).toBeNull();
      expect(res.body.data).toHaveProperty('author_name');
      expect(res.body.data).toHaveProperty('replies');
      expect(res.body.data.liked).toBe(false);

      await db.read();
      expect(db.data.posts.find(p => p.id === 2)!.comment_count).toBe(commentCountBefore + 1);
    });

    it('should add a reply comment with parent_id', async () => {
      await db.read();
      const existingComment = db.data.comments.find(c => c.post_id === 2)!;
      const commentCountBefore = db.data.posts.find(p => p.id === 2)!.comment_count;

      const res = await request(app)
        .post('/api/topics/posts/2/comments')
        .set(authHeader(3))
        .send({
          content: 'Reply to your comment',
          parent_id: existingComment.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.parent_id).toBe(existingComment.id);

      await db.read();
      expect(db.data.posts.find(p => p.id === 2)!.comment_count).toBe(commentCountBefore + 1);
    });

    it('should add a reply with reply_to_user_id', async () => {
      await db.read();
      const existingComment = db.data.comments.find(c => c.post_id === 2)!;

      const res = await request(app)
        .post('/api/topics/posts/2/comments')
        .set(authHeader(4))
        .send({
          content: 'Replying to user',
          parent_id: existingComment.id,
          reply_to_user_id: existingComment.author_id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reply_to_user_id).toBe(existingComment.author_id);
      expect(res.body.data).toHaveProperty('reply_to_username');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/topics/posts/1/comments')
        .send({ content: 'No auth comment' });

      expect(res.status).toBe(401);
    });

    it('should return validation error when content is missing', async () => {
      const res = await request(app)
        .post('/api/topics/posts/1/comments')
        .set(authHeader(1))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .post('/api/topics/posts/9999/comments')
        .set(authHeader(1))
        .send({ content: 'Comment on ghost post' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 404 for non-existent parent comment', async () => {
      const res = await request(app)
        .post('/api/topics/posts/1/comments')
        .set(authHeader(1))
        .send({
          content: 'Reply to ghost comment',
          parent_id: 9999,
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 404 when parent comment belongs to different post', async () => {
      await db.read();
      const wrongPostComment = db.data.comments.find(c => c.post_id !== 1);

      if (wrongPostComment) {
        const res = await request(app)
          .post('/api/topics/posts/1/comments')
          .set(authHeader(1))
          .send({
            content: 'Wrong parent',
            parent_id: wrongPostComment.id,
          });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe(40400);
      }
    });

    it('should trim content whitespace', async () => {
      const res = await request(app)
        .post('/api/topics/posts/2/comments')
        .set(authHeader(1))
        .send({ content: '  trimmed content  ' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('trimmed content');
    });
  });

  describe('POST /api/topics/comments/:id/like', () => {
    it('should like a comment successfully', async () => {
      const likeRes = await request(app)
        .post('/api/topics/comments/2/like')
        .set(authHeader(4));

      if (likeRes.status === 400) {
        await request(app)
          .post('/api/topics/comments/2/unlike')
          .set(authHeader(4));
        const retryRes = await request(app)
          .post('/api/topics/comments/2/like')
          .set(authHeader(4));
        expect(retryRes.status).toBe(200);
        expect(retryRes.body.data.liked).toBe(true);
        return;
      }

      expect(likeRes.status).toBe(200);
      expect(likeRes.body.code).toBe(0);
      expect(likeRes.body.data.liked).toBe(true);
    });

    it('should not allow liking the same comment twice', async () => {
      await request(app)
        .post('/api/topics/comments/2/like')
        .set(authHeader(4))
        .catch(() => {});

      const res = await request(app)
        .post('/api/topics/comments/2/like')
        .set(authHeader(4));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .post('/api/topics/comments/9999/like')
        .set(authHeader(1));

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/topics/comments/1/like');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/topics/comments/:id/unlike', () => {
    it('should unlike a comment successfully', async () => {
      await request(app)
        .post('/api/topics/comments/2/like')
        .set(authHeader(4))
        .catch(() => {});

      const res = await request(app)
        .post('/api/topics/comments/2/unlike')
        .set(authHeader(4));

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.liked).toBe(false);
    });

    it('should return 400 when unliking a comment not liked', async () => {
      const res = await request(app)
        .post('/api/topics/comments/2/unlike')
        .set(authHeader(4));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .post('/api/topics/comments/9999/unlike')
        .set(authHeader(1));

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/topics/comments/1/unlike');

      expect(res.status).toBe(401);
    });
  });

  describe('Like/Unlike flow integration', () => {
    it('should like then unlike a post correctly', async () => {
      const likeRes = await request(app)
        .post('/api/topics/posts/3/like')
        .set(authHeader(1));

      if (likeRes.status === 400) {
        await request(app)
          .post('/api/topics/posts/3/unlike')
          .set(authHeader(1));
        const retryLike = await request(app)
          .post('/api/topics/posts/3/like')
          .set(authHeader(1));
        expect(retryLike.status).toBe(200);
        expect(retryLike.body.data.liked).toBe(true);

        const unlikeRes = await request(app)
          .post('/api/topics/posts/3/unlike')
          .set(authHeader(1));
        expect(unlikeRes.status).toBe(200);
        expect(unlikeRes.body.data.liked).toBe(false);
        expect(unlikeRes.body.data.like_count).toBe(retryLike.body.data.like_count - 1);
        return;
      }

      expect(likeRes.status).toBe(200);
      expect(likeRes.body.data.liked).toBe(true);

      const unlikeRes = await request(app)
        .post('/api/topics/posts/3/unlike')
        .set(authHeader(1));

      expect(unlikeRes.status).toBe(200);
      expect(unlikeRes.body.data.liked).toBe(false);
      expect(unlikeRes.body.data.like_count).toBe(likeRes.body.data.like_count - 1);
    });

    it('should like then unlike a comment correctly', async () => {
      await request(app)
        .post('/api/topics/comments/2/like')
        .set(authHeader(2))
        .catch(() => {});

      const likeRes = await request(app)
        .post('/api/topics/comments/2/unlike')
        .set(authHeader(2));

      if (likeRes.status === 400) {
        const retryLike = await request(app)
          .post('/api/topics/comments/2/like')
          .set(authHeader(2));
        expect(retryLike.status).toBe(200);

        const unlikeRes = await request(app)
          .post('/api/topics/comments/2/unlike')
          .set(authHeader(2));
        expect(unlikeRes.status).toBe(200);
        expect(unlikeRes.body.data.liked).toBe(false);
        return;
      }

      const reLike = await request(app)
        .post('/api/topics/comments/2/like')
        .set(authHeader(2));
      expect(reLike.status).toBe(200);
      expect(reLike.body.data.liked).toBe(true);
    });
  });

  describe('Auth edge cases', () => {
    it('should reject malformed Bearer token', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set('Authorization', 'NotBearer sometoken')
        .send({ title: 'Test', content: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid JWT', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({ title: 'Test', content: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should allow optional auth endpoints without token', async () => {
      const res = await request(app).get('/api/topics/posts');

      expect(res.status).toBe(200);
    });
  });
});
