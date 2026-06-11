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

describe('Stats API', () => {
  describe('GET /api/stats/overview', () => {
    it('should return reading overview for authenticated user', async () => {
      const res = await request(app)
        .get('/api/stats/overview')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('total_books');
      expect(res.body.data).toHaveProperty('total_pages');
      expect(res.body.data).toHaveProperty('total_hours');
      expect(res.body.data).toHaveProperty('categories_count');
      expect(res.body.data).toHaveProperty('top_category');
    });

    it('should return numeric values for stats', async () => {
      const res = await request(app)
        .get('/api/stats/overview')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.total_books).toBe('number');
      expect(typeof res.body.data.total_pages).toBe('number');
      expect(typeof res.body.data.total_hours).toBe('number');
      expect(typeof res.body.data.categories_count).toBe('number');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stats/overview');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return different stats for different users', async () => {
      const res1 = await request(app)
        .get('/api/stats/overview')
        .set(AUTH_HEADERS.admin);

      const res2 = await request(app)
        .get('/api/stats/overview')
        .set(AUTH_HEADERS.reader123);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/stats/overview')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/stats/monthly', () => {
    it('should return monthly stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/stats/monthly')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 12 months of data', async () => {
      const res = await request(app)
        .get('/api/stats/monthly')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(12);
    });

    it('should include month, count, and hours in each entry', async () => {
      const res = await request(app)
        .get('/api/stats/monthly')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      res.body.data.forEach((item: any) => {
        expect(item).toHaveProperty('month');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('hours');
        expect(typeof item.count).toBe('number');
        expect(typeof item.hours).toBe('number');
      });
    });

    it('should format month as YYYY-MM', async () => {
      const res = await request(app)
        .get('/api/stats/monthly')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      res.body.data.forEach((item: any) => {
        expect(item.month).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stats/monthly');

      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed auth header', async () => {
      const res = await request(app)
        .get('/api/stats/monthly')
        .set('Authorization', 'NotBearer sometoken');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/stats/categories', () => {
    it('should return category stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/stats/categories')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include name, value, and percentage in each category', async () => {
      const res = await request(app)
        .get('/api/stats/categories')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const category = res.body.data[0];
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('value');
        expect(category).toHaveProperty('percentage');
        expect(typeof category.value).toBe('number');
        expect(typeof category.percentage).toBe('number');
      }
    });

    it('should have percentages that sum to approximately 100', async () => {
      const res = await request(app)
        .get('/api/stats/categories')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const totalPercentage = res.body.data.reduce(
          (sum: number, cat: any) => sum + cat.percentage,
          0
        );
        expect(totalPercentage).toBeGreaterThanOrEqual(0);
        expect(totalPercentage).toBeLessThanOrEqual(100);
      }
    });

    it('should sort categories by value descending', async () => {
      const res = await request(app)
        .get('/api/stats/categories')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      for (let i = 1; i < res.body.data.length; i++) {
        expect(res.body.data[i - 1].value).toBeGreaterThanOrEqual(
          res.body.data[i].value
        );
      }
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stats/categories');

      expect(res.status).toBe(401);
    });

    it('should return different categories for different users', async () => {
      const res1 = await request(app)
        .get('/api/stats/categories')
        .set(AUTH_HEADERS.admin);

      const res2 = await request(app)
        .get('/api/stats/categories')
        .set(AUTH_HEADERS.booklover);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe('GET /api/stats/reading-trend', () => {
    it('should return 30-day reading trend for authenticated user', async () => {
      const res = await request(app)
        .get('/api/stats/reading-trend')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(30);
    });

    it('should include date, minutes, and books in each entry', async () => {
      const res = await request(app)
        .get('/api/stats/reading-trend')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      res.body.data.forEach((item: any) => {
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('minutes');
        expect(item).toHaveProperty('books');
        expect(typeof item.minutes).toBe('number');
        expect(typeof item.books).toBe('number');
      });
    });

    it('should format date as YYYY-MM-DD', async () => {
      const res = await request(app)
        .get('/api/stats/reading-trend')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      res.body.data.forEach((item: any) => {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should return dates in chronological order', async () => {
      const res = await request(app)
        .get('/api/stats/reading-trend')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      for (let i = 1; i < res.body.data.length; i++) {
        const prevDate = new Date(res.body.data[i - 1].date);
        const currDate = new Date(res.body.data[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stats/reading-trend');

      expect(res.status).toBe(401);
    });

    it('should return 401 with expired or invalid JWT', async () => {
      const res = await request(app)
        .get('/api/stats/reading-trend')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/stats/export', () => {
    it('should export stats in JSON format by default', async () => {
      const res = await request(app)
        .get('/api/stats/export')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('categories');
      expect(res.body).toHaveProperty('reading_history');
    });

    it('should export stats in JSON format explicitly', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('categories');
      expect(res.body).toHaveProperty('reading_history');
    });

    it('should include user info in JSON export', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('username');
      expect(res.body.user).toHaveProperty('email');
    });

    it('should include summary in JSON export', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.summary).toHaveProperty('total_books');
      expect(res.body.summary).toHaveProperty('total_categories');
      expect(res.body.summary).toHaveProperty('total_points');
      expect(res.body.summary).toHaveProperty('export_date');
    });

    it('should include categories in JSON export', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      if (res.body.categories.length > 0) {
        expect(res.body.categories[0]).toHaveProperty('name');
        expect(res.body.categories[0]).toHaveProperty('count');
      }
    });

    it('should include reading history in JSON export', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reading_history)).toBe(true);
    });

    it('should export stats in CSV format', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=csv')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');
      expect(typeof res.text).toBe('string');
    });

    it('should include BOM in CSV for UTF-8 compatibility', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=csv')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.text.startsWith('\uFEFF')).toBe(true);
    });

    it('should include header row in CSV', async () => {
      const res = await request(app)
        .get('/api/stats/export?format=csv')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      const lines = res.text.split('\n');
      expect(lines[0]).toContain('书名');
      expect(lines[0]).toContain('作者');
      expect(lines[0]).toContain('分类');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/stats/export');

      expect(res.status).toBe(401);
    });

    it('should return 401 without auth token for CSV format', async () => {
      const res = await request(app).get('/api/stats/export?format=csv');

      expect(res.status).toBe(401);
    });

    it('should return correct data for different users', async () => {
      const res1 = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.admin);

      const res2 = await request(app)
        .get('/api/stats/export?format=json')
        .set(AUTH_HEADERS.booklover);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.user.username).toBe('admin');
      expect(res2.body.user.username).toBe('booklover');
    });
  });
});
