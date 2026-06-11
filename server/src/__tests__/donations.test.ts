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

describe('Donations API', () => {
  describe('POST /api/donations', () => {
    it('should create a donation with required fields', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.booklover)
        .send({
          book_title: '红楼梦',
          book_author: '曹雪芹',
          book_condition: '九成新',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('donation');
      expect(res.body.data).toHaveProperty('certificate');
      expect(res.body.data).toHaveProperty('points_earned');
      expect(res.body.data.donation.book_title).toBe('红楼梦');
      expect(res.body.data.donation.book_author).toBe('曹雪芹');
      expect(res.body.data.donation.book_condition).toBe('九成新');
      expect(res.body.data.donation.status).toBe('approved');
      expect(res.body.data.donation.certificate_issued).toBe(true);
    });

    it('should auto-approve donation and create certificate', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.reader123)
        .send({
          book_title: '西游记',
          book_author: '吴承恩',
          book_condition: '全新',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.donation.status).toBe('approved');
      expect(res.body.data.certificate).toHaveProperty('certificate_no');
      expect(res.body.data.certificate).toHaveProperty('issued_at');
    });

    it('should award 20 points per quantity', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.bibliophile)
        .send({
          book_title: '水浒传',
          book_author: '施耐庵',
          book_condition: '八成新',
          quantity: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.points_earned).toBe(60);
      expect(res.body.data.donation.quantity).toBe(3);
    });

    it('should award 20 points for default quantity of 1', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.admin)
        .send({
          book_title: '三国演义',
          book_author: '罗贯中',
          book_condition: '七成新',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.points_earned).toBe(20);
      expect(res.body.data.donation.quantity).toBe(1);
    });

    it('should accept optional fields', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.booklover)
        .send({
          book_title: '围城',
          book_author: '钱钟书',
          book_condition: '九成新',
          book_id: 1,
          book_cover: 'https://example.com/cover.jpg',
          book_category: '文学',
          quantity: 2,
          message: 'Great book to share',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.donation.book_category).toBe('文学');
      expect(res.body.data.donation.message).toBe('Great book to share');
      expect(res.body.data.donation.quantity).toBe(2);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/donations')
        .send({
          book_title: 'Test',
          book_author: 'Author',
          book_condition: 'New',
        });

      expect(res.status).toBe(401);
    });

    it('should return validation error when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.booklover)
        .send({ book_title: 'Only title' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return validation error when book_title is empty', async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.booklover)
        .send({
          book_title: '',
          book_author: 'Author',
          book_condition: 'New',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/donations/mine', () => {
    it('should return my donations for authenticated user', async () => {
      const res = await request(app)
        .get('/api/donations/mine')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('donations');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toHaveProperty('page');
      expect(res.body.data.pagination).toHaveProperty('limit');
      expect(res.body.data.pagination).toHaveProperty('total');
      expect(res.body.data.pagination).toHaveProperty('total_pages');
    });

    it('should filter by status query param', async () => {
      const res = await request(app)
        .get('/api/donations/mine?status=approved')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should support pagination and sorting', async () => {
      const res = await request(app)
        .get('/api/donations/mine?page=1&limit=5&sort_by=date&sort_order=desc')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('should include certificate info in donations', async () => {
      const res = await request(app)
        .get('/api/donations/mine')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      if (res.body.data.donations.length > 0) {
        const donation = res.body.data.donations[0];
        expect(donation).toHaveProperty('certificate_no');
        expect(donation).toHaveProperty('certificate_issued_at');
      }
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/donations/mine');

      expect(res.status).toBe(401);
    });

    it('should sort by quantity ascending', async () => {
      const res = await request(app)
        .get('/api/donations/mine?sort_by=quantity&sort_order=asc')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('GET /api/donations', () => {
    it('should return list of public donations', async () => {
      const res = await request(app).get('/api/donations');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('donations');
      expect(res.body.data).toHaveProperty('pagination');
    });

    it('should filter by user_id', async () => {
      const res = await request(app)
        .get('/api/donations?user_id=2');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/donations?status=approved');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/donations?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('should include user info in donations', async () => {
      const res = await request(app).get('/api/donations');

      expect(res.status).toBe(200);
      if (res.body.data.donations.length > 0) {
        const donation = res.body.data.donations[0];
        expect(donation).toHaveProperty('username');
      }
    });

    it('should be accessible without authentication', async () => {
      const res = await request(app).get('/api/donations');

      expect(res.status).toBe(200);
    });

    it('should only show approved donations by default', async () => {
      const res = await request(app).get('/api/donations');

      expect(res.status).toBe(200);
      res.body.data.donations.forEach((d: any) => {
        expect(d.status).toBe('approved');
      });
    });
  });

  describe('GET /api/donations/ranking', () => {
    it('should return donation ranking', async () => {
      const res = await request(app).get('/api/donations/ranking');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('rankings');
      expect(res.body.data).toHaveProperty('period');
      expect(res.body.data).toHaveProperty('type');
      expect(res.body.data).toHaveProperty('total_users');
    });

    it('should support type=count for ranking by donation count', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?type=count');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.type).toBe('count');
    });

    it('should support type=total for ranking by total books', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?type=total');

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('total');
    });

    it('should support period=month', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?period=month');

      expect(res.status).toBe(200);
      expect(res.body.data.period).toBe('month');
    });

    it('should support period=week', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?period=week');

      expect(res.status).toBe(200);
      expect(res.body.data.period).toBe('week');
    });

    it('should support period=all', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?period=all');

      expect(res.status).toBe(200);
      expect(res.body.data.period).toBe('all');
    });

    it('should support limit query param', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?limit=3');

      expect(res.status).toBe(200);
      expect(res.body.data.rankings.length).toBeLessThanOrEqual(3);
    });

    it('should include user details in rankings', async () => {
      const res = await request(app).get('/api/donations/ranking');

      expect(res.status).toBe(200);
      if (res.body.data.rankings.length > 0) {
        const rank = res.body.data.rankings[0];
        expect(rank).toHaveProperty('user_id');
        expect(rank).toHaveProperty('total_books');
        expect(rank).toHaveProperty('total_donations');
        expect(rank).toHaveProperty('username');
      }
    });

    it('should be accessible without authentication', async () => {
      const res = await request(app).get('/api/donations/ranking');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/donations/stats', () => {
    it('should return donation stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/donations/stats')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('total_books');
      expect(res.body.data).toHaveProperty('total_donations');
      expect(res.body.data).toHaveProperty('total_certificates');
      expect(res.body.data).toHaveProperty('global_total_books');
      expect(res.body.data).toHaveProperty('my_rank');
      expect(res.body.data).toHaveProperty('total_donors');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/donations/stats');

      expect(res.status).toBe(401);
    });

    it('should return different stats for different users', async () => {
      const res1 = await request(app)
        .get('/api/donations/stats')
        .set(AUTH_HEADERS.booklover);

      const res2 = await request(app)
        .get('/api/donations/stats')
        .set(AUTH_HEADERS.reader123);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe('GET /api/donations/:id', () => {
    let donationId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.reader123)
        .send({
          book_title: 'Test Book for Detail',
          book_author: 'Test Author',
          book_condition: 'New',
        });
      donationId = res.body.data.donation.id;
    });

    it('should return donation detail by id', async () => {
      const res = await request(app).get(`/api/donations/${donationId}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(donationId);
      expect(res.body.data).toHaveProperty('book_title');
      expect(res.body.data).toHaveProperty('book_author');
      expect(res.body.data).toHaveProperty('username');
    });

    it('should include user info in detail', async () => {
      const res = await request(app).get(`/api/donations/${donationId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('username');
    });

    it('should include certificate info if available', async () => {
      const res = await request(app).get(`/api/donations/${donationId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('certificate_no');
    });

    it('should return 404 for non-existent donation', async () => {
      const res = await request(app).get('/api/donations/9999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/donations/abc');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/donations/:id/certificate', () => {
    let donationId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.bibliophile)
        .send({
          book_title: 'Certificate Test Book',
          book_author: 'Cert Author',
          book_condition: 'New',
        });
      donationId = res.body.data.donation.id;
    });

    it('should return certificate for a donation', async () => {
      const res = await request(app).get(`/api/donations/${donationId}/certificate`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('certificate_no');
      expect(res.body.data).toHaveProperty('issued_at');
      expect(res.body.data).toHaveProperty('donation');
      expect(res.body.data).toHaveProperty('user');
    });

    it('should include donation info in certificate', async () => {
      const res = await request(app).get(`/api/donations/${donationId}/certificate`);

      expect(res.status).toBe(200);
      expect(res.body.data.donation).toHaveProperty('book_title');
      expect(res.body.data.donation).toHaveProperty('book_author');
      expect(res.body.data.donation).toHaveProperty('book_condition');
      expect(res.body.data.donation).toHaveProperty('quantity');
      expect(res.body.data.donation).toHaveProperty('donated_at');
    });

    it('should include user info in certificate', async () => {
      const res = await request(app).get(`/api/donations/${donationId}/certificate`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user).toHaveProperty('username');
    });

    it('should return 404 for non-existent donation', async () => {
      const res = await request(app).get('/api/donations/9999/certificate');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 404 for donation without certificate', async () => {
      const res = await request(app).get('/api/donations/99999/certificate');

      expect(res.status).toBe(404);
    });
  });
});
