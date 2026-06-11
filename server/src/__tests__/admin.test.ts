import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import './setup';
import '../database';
import db from '../database';
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

describe('Admin API', () => {
  describe('GET /api/admin/stats', () => {
    it('should return admin stats for admin user', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalBooks');
      expect(res.body.data).toHaveProperty('totalExchanges');
      expect(res.body.data).toHaveProperty('totalPosts');
      expect(res.body.data).toHaveProperty('pendingBooks');
      expect(res.body.data).toHaveProperty('pendingDonations');
      expect(res.body.data).toHaveProperty('activeUsers');
      expect(res.body.data).toHaveProperty('bannedUsers');
      expect(res.body.data).toHaveProperty('booksByCategory');
      expect(res.body.data).toHaveProperty('exchangesByStatus');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/admin/stats');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/books', () => {
    it('should return list of books for admin', async () => {
      const res = await request(app)
        .get('/api/admin/books')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('books');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
      expect(res.body.data).toHaveProperty('total_pages');
    });

    it('should filter by approval_status', async () => {
      const res = await request(app)
        .get('/api/admin/books?approval_status=approved')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should filter by search query', async () => {
      const res = await request(app)
        .get('/api/admin/books?search=三体')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/admin/books?page=1&page_size=2')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.data.page_size).toBe(2);
    });

    it('should include owner info in books', async () => {
      const res = await request(app)
        .get('/api/admin/books')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.books.length > 0) {
        const book = res.body.data.books[0];
        expect(book).toHaveProperty('owner_name');
        expect(book).toHaveProperty('owner_email');
      }
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/books')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/books/:id/approve', () => {
    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .post('/api/admin/books/1/approve')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .post('/api/admin/books/9999/approve')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 400 when book is already approved', async () => {
      const res = await request(app)
        .post('/api/admin/books/1/approve')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/admin/books/1/approve');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/admin/books/:id/reject', () => {
    it('should reject a book with reason', async () => {
      const res = await request(app)
        .post('/api/admin/books/2/reject')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Inappropriate content' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.book.approval_status).toBe('rejected');
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .post('/api/admin/books/9999/reject')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return validation error when reason is missing', async () => {
      const res = await request(app)
        .post('/api/admin/books/3/reject')
        .set(AUTH_HEADERS.admin)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .post('/api/admin/books/3/reject')
        .set(AUTH_HEADERS.reader123)
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/books/:id', () => {
    it('should delete a book successfully', async () => {
      const res = await request(app)
        .delete('/api/admin/books/5')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .delete('/api/admin/books/9999')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .delete('/api/admin/books/1')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete('/api/admin/books/1');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/admin/books/:id', () => {
    it('should update a book successfully', async () => {
      const res = await request(app)
        .put('/api/admin/books/1')
        .set(AUTH_HEADERS.admin)
        .send({ title: 'Updated Book Title' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('Updated Book Title');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .put('/api/admin/books/1')
        .set(AUTH_HEADERS.admin)
        .send({
          category: '哲学',
          condition: '全新',
          points_required: 25,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category).toBe('哲学');
      expect(res.body.data.condition).toBe('全新');
      expect(res.body.data.points_required).toBe(25);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .put('/api/admin/books/9999')
        .set(AUTH_HEADERS.admin)
        .send({ title: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put('/api/admin/books/1')
        .set(AUTH_HEADERS.reader123)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
      expect(res.body.data).toHaveProperty('total_pages');
    });

    it('should filter by search query', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=book')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/admin/users?status=active')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=admin')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      res.body.data.users.forEach((u: any) => {
        expect(u.role).toBe('admin');
      });
    });

    it('should support sorting by username', async () => {
      const res = await request(app)
        .get('/api/admin/users?sort_by=username&sort_order=asc')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should support sorting by points', async () => {
      const res = await request(app)
        .get('/api/admin/users?sort_by=points&sort_order=desc')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/admin/users?page=1&page_size=2')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.data.page_size).toBe(2);
    });

    it('should include user stats in response', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.users.length > 0) {
        const user = res.body.data.users[0];
        expect(user).toHaveProperty('book_count');
        expect(user).toHaveProperty('exchange_count');
      }
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id/ban', () => {
    it('should ban a user successfully', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/ban')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Violation of rules' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 400 when trying to ban an admin', async () => {
      const res = await request(app)
        .put('/api/admin/users/1/ban')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/users/9999/ban')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put('/api/admin/users/3/ban')
        .set(AUTH_HEADERS.booklover)
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id/unban', () => {
    it('should unban a user successfully', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/unban')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/users/9999/unban')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/unban')
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should update user role to admin', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(AUTH_HEADERS.admin)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should update user role back to user', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(AUTH_HEADERS.admin)
        .send({ role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return validation error for invalid role', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(AUTH_HEADERS.admin)
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/users/9999/role')
        .set(AUTH_HEADERS.admin)
        .send({ role: 'admin' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(AUTH_HEADERS.booklover)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id/points', () => {
    it('should update user points successfully', async () => {
      const res = await request(app)
        .put('/api/admin/users/3/points')
        .set(AUTH_HEADERS.admin)
        .send({ points: 500, reason: 'Bonus reward' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.points).toBe(500);
    });

    it('should update points without reason', async () => {
      const res = await request(app)
        .put('/api/admin/users/3/points')
        .set(AUTH_HEADERS.admin)
        .send({ points: 100 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return validation error when points is missing', async () => {
      const res = await request(app)
        .put('/api/admin/users/3/points')
        .set(AUTH_HEADERS.admin)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/users/9999/points')
        .set(AUTH_HEADERS.admin)
        .send({ points: 100 });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put('/api/admin/users/3/points')
        .set(AUTH_HEADERS.booklover)
        .send({ points: 9999 });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/exchanges', () => {
    it('should return list of exchanges for admin', async () => {
      const res = await request(app)
        .get('/api/admin/exchanges')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('exchanges');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
      expect(res.body.data).toHaveProperty('total_pages');
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/exchanges')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/admin/exchanges');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/posts', () => {
    it('should return list of posts for admin', async () => {
      const res = await request(app)
        .get('/api/admin/posts')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('posts');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
    });

    it('should filter by search query', async () => {
      const res = await request(app)
        .get('/api/admin/posts?search=三体')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should include author info in posts', async () => {
      const res = await request(app)
        .get('/api/admin/posts')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.posts.length > 0) {
        const post = res.body.data.posts[0];
        expect(post).toHaveProperty('author_name');
      }
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/posts')
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/posts/:id', () => {
    it('should delete a post successfully', async () => {
      const res = await request(app)
        .delete('/api/admin/posts/3')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .delete('/api/admin/posts/9999')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .delete('/api/admin/posts/1')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete('/api/admin/posts/1');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/donations', () => {
    it('should return list of donations for admin', async () => {
      const res = await request(app)
        .get('/api/admin/donations')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('donations');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/admin/donations?status=approved')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
    });

    it('should include user info in donations', async () => {
      const res = await request(app)
        .get('/api/admin/donations')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.donations.length > 0) {
        const donation = res.body.data.donations[0];
        expect(donation).toHaveProperty('username');
        expect(donation).toHaveProperty('user_email');
      }
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/donations')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/donations/:id/approve', () => {
    it('should approve a donation', async () => {
      const createRes = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.bibliophile)
        .send({
          book_title: 'Admin Approve Test',
          book_author: 'Author',
          book_condition: 'New',
        });

      const donationId = createRes.body.data.donation.id;

      await request(app)
        .post('/api/admin/donations/' + donationId + '/reject')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'test' });

      const res = await request(app)
        .post(`/api/admin/donations/${donationId}/approve`)
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent donation', async () => {
      const res = await request(app)
        .post('/api/admin/donations/9999/approve')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .post('/api/admin/donations/1/approve')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/donations/:id/reject', () => {
    it('should reject a donation', async () => {
      const createRes = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.bibliophile)
        .send({
          book_title: 'Admin Reject Test',
          book_author: 'Author',
          book_condition: 'New',
        });

      const donationId = createRes.body.data.donation.id;

      const res = await request(app)
        .post(`/api/admin/donations/${donationId}/reject`)
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Not eligible' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent donation', async () => {
      const res = await request(app)
        .post('/api/admin/donations/9999/reject')
        .set(AUTH_HEADERS.admin)
        .send({ reason: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .post('/api/admin/donations/1/reject')
        .set(AUTH_HEADERS.reader123)
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/reading-clubs', () => {
    beforeAll(async () => {
      await db.read();
      db.data.readingClubs.push({
        id: 200,
        title: 'Admin Test Club',
        description: 'For testing admin club listing',
        organizer_id: 1,
        location: 'Test Location',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        max_participants: 10,
        status: 'upcoming' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await db.write();
    });

    it('should return list of reading clubs for admin', async () => {
      const res = await request(app)
        .get('/api/admin/reading-clubs')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('clubs');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
    });

    it('should include organizer info in clubs', async () => {
      const res = await request(app)
        .get('/api/admin/reading-clubs')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.clubs.length > 0) {
        const club = res.body.data.clubs[0];
        expect(club).toHaveProperty('organizer_name');
        expect(club).toHaveProperty('participant_count');
      }
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/reading-clubs')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/reading-clubs/:id', () => {
    it('should delete a reading club successfully', async () => {
      await db.read();
      const club = {
        id: 100,
        title: 'Test Club for Deletion',
        description: 'Test',
        organizer_id: 1,
        location: 'Test Location',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        max_participants: 10,
        status: 'upcoming' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.data.readingClubs.push(club);
      await db.write();

      const res = await request(app)
        .delete('/api/admin/reading-clubs/100')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app)
        .delete('/api/admin/reading-clubs/9999')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .delete('/api/admin/reading-clubs/1')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete('/api/admin/reading-clubs/1');

      expect(res.status).toBe(401);
    });
  });
});
