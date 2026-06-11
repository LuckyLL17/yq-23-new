import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import './setup';
import '../database';
import authRoutes from '../routes/auth';
import bookRoutes from '../routes/books';
import exchangeRoutes from '../routes/exchanges';
import topicRoutes from '../routes/topics';
import uploadRoutes from '../routes/upload';
import wishlistRoutes from '../routes/wishlists';
import goalRoutes from '../routes/goals';
import achievementRoutes from '../routes/achievements';
import readingClubRoutes from '../routes/reading-clubs';
import userRoutes from '../routes/users';
import statsRoutes from '../routes/stats';
import donationRoutes from '../routes/donations';
import adminRoutes from '../routes/admin';
import { AUTH_HEADERS } from './setup';

const app = express();
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/reading-clubs', readingClubRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);

describe('Users API', () => {
  describe('GET /api/users/feed/following', () => {
    it('should return following feed for authenticated user', async () => {
      const res = await request(app)
        .get('/api/users/feed/following')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('posts');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
      expect(res.body.data).toHaveProperty('total_pages');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/feed/following');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should support pagination query params', async () => {
      const res = await request(app)
        .get('/api/users/feed/following?page=1&limit=5')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.limit).toBe(5);
    });

    it('should return posts from followed users only', async () => {
      const res = await request(app)
        .get('/api/users/feed/following')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.posts)).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user profile for valid id', async () => {
      const res = await request(app).get('/api/users/1');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.username).toBe('admin');
      expect(res.body.data).toHaveProperty('follower_count');
      expect(res.body.data).toHaveProperty('following_count');
      expect(res.body.data).toHaveProperty('book_count');
      expect(res.body.data).toHaveProperty('post_count');
    });

    it('should return profile with reading_tags and shelf_style', async () => {
      const res = await request(app).get('/api/users/2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('reading_tags');
      expect(res.body.data).toHaveProperty('expertise_fields');
      expect(res.body.data).toHaveProperty('shelf_style');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/users/999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return validation error for invalid id format', async () => {
      const res = await request(app).get('/api/users/abc');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should be accessible without authentication', async () => {
      const res = await request(app).get('/api/users/2');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('GET /api/users/:id/follow-status', () => {
    it('should return is_following true when user follows target', async () => {
      const res = await request(app)
        .get('/api/users/1/follow-status')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_following).toBe(true);
      expect(res.body.data.is_self).toBe(false);
    });

    it('should return is_following false when user does not follow target', async () => {
      const res = await request(app)
        .get('/api/users/4/follow-status')
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_following).toBe(false);
      expect(res.body.data.is_self).toBe(false);
    });

    it('should return is_self true when checking own profile', async () => {
      const res = await request(app)
        .get('/api/users/1/follow-status')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_self).toBe(true);
      expect(res.body.data.is_following).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/1/follow-status');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/:id/follow', () => {
    it('should follow a user successfully', async () => {
      const res = await request(app)
        .post('/api/users/4/follow')
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_following).toBe(true);
      expect(res.body.data).toHaveProperty('follower_count');
    });

    it('should return 400 when following self', async () => {
      const res = await request(app)
        .post('/api/users/3/follow')
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 400 when already following', async () => {
      const res = await request(app)
        .post('/api/users/1/follow')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/users/999/follow')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/users/1/follow');

      expect(res.status).toBe(401);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app)
        .post('/api/users/invalid/follow')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/users/:id/unfollow', () => {
    it('should unfollow a user successfully', async () => {
      const res = await request(app)
        .post('/api/users/1/unfollow')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_following).toBe(false);
      expect(res.body.data).toHaveProperty('follower_count');
    });

    it('should return 400 when not following the user', async () => {
      const res = await request(app)
        .post('/api/users/4/unfollow')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/users/1/unfollow');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id/followers', () => {
    it('should return list of followers for a user', async () => {
      const res = await request(app).get('/api/users/1/followers');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include follower profile details', async () => {
      const res = await request(app).get('/api/users/1/followers');

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const follower = res.body.data[0];
        expect(follower).toHaveProperty('id');
        expect(follower).toHaveProperty('username');
        expect(follower).toHaveProperty('followed_at');
      }
    });

    it('should be accessible without authentication', async () => {
      const res = await request(app).get('/api/users/1/followers');

      expect(res.status).toBe(200);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/users/abc/followers');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/:id/following', () => {
    it('should return list of following users', async () => {
      const res = await request(app).get('/api/users/2/following');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include following user details', async () => {
      const res = await request(app).get('/api/users/2/following');

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const following = res.body.data[0];
        expect(following).toHaveProperty('id');
        expect(following).toHaveProperty('username');
        expect(following).toHaveProperty('followed_at');
      }
    });

    it('should return empty array for user with no following', async () => {
      const res = await request(app).get('/api/users/4/following');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/users/:id/posts', () => {
    it('should return user posts with pagination', async () => {
      const res = await request(app).get('/api/users/1/posts');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('posts');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
      expect(res.body.data).toHaveProperty('total_pages');
    });

    it('should support pagination params', async () => {
      const res = await request(app).get('/api/users/1/posts?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.limit).toBe(2);
    });

    it('should include topic info in posts', async () => {
      const res = await request(app).get('/api/users/1/posts');

      expect(res.status).toBe(200);
      if (res.body.data.posts.length > 0) {
        const post = res.body.data.posts[0];
        expect(post).toHaveProperty('topics');
      }
    });

    it('should be accessible without authentication', async () => {
      const res = await request(app).get('/api/users/1/posts');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/users/:id/books', () => {
    it('should return user books', async () => {
      const res = await request(app).get('/api/users/2/books');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return books owned by the user', async () => {
      const res = await request(app).get('/api/users/2/books');

      expect(res.status).toBe(200);
      res.body.data.forEach((book: any) => {
        expect(book.owner_id).toBe(2);
      });
    });

    it('should return empty array for user with no books', async () => {
      const res = await request(app).get('/api/users/1/books');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/users/invalid/books');

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update avatar and bio successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set(AUTH_HEADERS.booklover)
        .send({
          avatar: 'https://example.com/avatar.jpg',
          bio: 'Updated bio',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.bio).toBe('Updated bio');
      expect(res.body.data.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should update reading_tags', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set(AUTH_HEADERS.booklover)
        .send({ reading_tags: ['fiction', 'sci-fi'] });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.reading_tags).toEqual(['fiction', 'sci-fi']);
    });

    it('should update expertise_fields', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set(AUTH_HEADERS.booklover)
        .send({ expertise_fields: ['literature', 'history'] });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.expertise_fields).toEqual(['literature', 'history']);
    });

    it('should update shelf_style', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set(AUTH_HEADERS.booklover)
        .send({ shelf_style: 'list' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.shelf_style).toBe('list');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ bio: 'test' });

      expect(res.status).toBe(401);
    });

    it('should only update provided fields and preserve others', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set(AUTH_HEADERS.reader123)
        .send({ bio: 'New bio only' });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('New bio only');
      expect(res.body.data).toHaveProperty('username');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('points');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set(AUTH_HEADERS.bibliophile)
        .send({
          avatar: 'https://example.com/new-avatar.jpg',
          bio: 'Multi-field update',
          reading_tags: ['classic'],
          expertise_fields: ['philosophy'],
          shelf_style: 'grid',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.avatar).toBe('https://example.com/new-avatar.jpg');
      expect(res.body.data.bio).toBe('Multi-field update');
      expect(res.body.data.reading_tags).toEqual(['classic']);
      expect(res.body.data.expertise_fields).toEqual(['philosophy']);
      expect(res.body.data.shelf_style).toBe('grid');
    });
  });

  describe('GET /api/users/me/profile', () => {
    it('should return own profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/users/me/profile')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.username).toBe('admin');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('points');
      expect(res.body.data).toHaveProperty('reading_tags');
      expect(res.body.data).toHaveProperty('expertise_fields');
      expect(res.body.data).toHaveProperty('shelf_style');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/me/profile');

      expect(res.status).toBe(401);
    });

    it('should return correct profile for different authenticated users', async () => {
      const res = await request(app)
        .get('/api/users/me/profile')
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(3);
      expect(res.body.data.username).toBe('reader123');
    });

    it('should include email in own profile', async () => {
      const res = await request(app)
        .get('/api/users/me/profile')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('booklover@example.com');
    });
  });
});
