import express from 'express';
import cors from 'cors';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import './setup';

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

import '../database';

const JWT_SECRET = 'book-exchange-secret-key';

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
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
  return app;
}

function generateToken(payload: { id: number; username: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

const ADMIN_TOKEN = generateToken({ id: 1, username: 'admin', email: 'admin@example.com', role: 'admin' });
const BOOKLOVER_TOKEN = generateToken({ id: 2, username: 'booklover', email: 'booklover@example.com', role: 'user' });
const READER_TOKEN = generateToken({ id: 3, username: 'reader123', email: 'reader@example.com', role: 'user' });
const BIBLIOPHILE_TOKEN = generateToken({ id: 4, username: 'bibliophile', email: 'biblio@example.com', role: 'user' });

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const BOOKLOVER_AUTH = { Authorization: `Bearer ${BOOKLOVER_TOKEN}` };
const READER_AUTH = { Authorization: `Bearer ${READER_TOKEN}` };
const BIBLIOPHILE_AUTH = { Authorization: `Bearer ${BIBLIOPHILE_TOKEN}` };

const app = createApp();

describe('Books API', () => {
  describe('GET /api/books', () => {
    it('should return approved books by default', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const book of res.body.data) {
        expect(book.approval_status).toBe('approved');
      }
    });

    it('should include holder_name and holder_avatar for each book', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
      const books = res.body.data;
      expect(books.length).toBeGreaterThan(0);
      for (const book of books) {
        expect(book).toHaveProperty('holder_name');
        expect(book).toHaveProperty('holder_avatar');
      }
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/books?category=文学');
      expect(res.status).toBe(200);
      for (const book of res.body.data) {
        expect(book.category).toBe('文学');
      }
    });

    it('should filter by condition', async () => {
      const res = await request(app).get('/api/books?condition=全新');
      expect(res.status).toBe(200);
      for (const book of res.body.data) {
        expect(book.condition).toBe('全新');
      }
    });

    it('should filter by owner_id', async () => {
      const res = await request(app).get('/api/books?owner_id=2');
      expect(res.status).toBe(200);
      for (const book of res.body.data) {
        expect(book.owner_id).toBe(2);
      }
    });

    it('should filter by min_points', async () => {
      const res = await request(app).get('/api/books?min_points=15');
      expect(res.status).toBe(200);
      for (const book of res.body.data) {
        expect(book.points_required).toBeGreaterThanOrEqual(15);
      }
    });

    it('should filter by max_points', async () => {
      const res = await request(app).get('/api/books?max_points=15');
      expect(res.status).toBe(200);
      for (const book of res.body.data) {
        expect(book.points_required).toBeLessThanOrEqual(15);
      }
    });

    it('should filter by search query', async () => {
      const res = await request(app).get('/api/books?search=三体');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const book of res.body.data) {
        expect(book).toHaveProperty('search_score');
      }
    });

    it('should sort by points ascending', async () => {
      const res = await request(app).get('/api/books?sort_by=points&sort_order=asc');
      expect(res.status).toBe(200);
      const points = res.body.data.map((b: any) => b.points_required);
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeGreaterThanOrEqual(points[i - 1]);
      }
    });

    it('should sort by points descending', async () => {
      const res = await request(app).get('/api/books?sort_by=points&sort_order=desc');
      expect(res.status).toBe(200);
      const points = res.body.data.map((b: any) => b.points_required);
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeLessThanOrEqual(points[i - 1]);
      }
    });

    it('should sort by title', async () => {
      const res = await request(app).get('/api/books?sort_by=title&sort_order=asc');
      expect(res.status).toBe(200);
      const titles = res.body.data.map((b: any) => b.title);
      for (let i = 1; i < titles.length; i++) {
        expect(titles[i].localeCompare(titles[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by date descending by default', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
      const dates = res.body.data.map((b: any) => new Date(b.created_at).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('should combine multiple filters', async () => {
      const res = await request(app).get('/api/books?category=文学&condition=九成新&min_points=10&max_points=15');
      expect(res.status).toBe(200);
      for (const book of res.body.data) {
        expect(book.category).toBe('文学');
        expect(book.condition).toBe('九成新');
        expect(book.points_required).toBeGreaterThanOrEqual(10);
        expect(book.points_required).toBeLessThanOrEqual(15);
      }
    });

    it('should work with optional auth', async () => {
      const res = await request(app)
        .get('/api/books')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('GET /api/books/categories', () => {
    it('should return a list of categories', async () => {
      const res = await request(app).get('/api/books/categories');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data).toContain('文学');
      expect(res.body.data).toContain('科幻');
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return a book detail with owner info', async () => {
      const res = await request(app).get('/api/books/1');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toMatchObject({
        id: 1,
        title: '百年孤独',
        owner_name: 'booklover',
      });
      expect(res.body.data).toHaveProperty('owner_avatar');
      expect(res.body.data).toHaveProperty('holder_name');
      expect(res.body.data).toHaveProperty('holder_avatar');
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app).get('/api/books/9999');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 403 for non-approved book when not owner/admin', async () => {
      const createRes = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'Pending Book', author: 'Test Author', condition: '全新' });
      const pendingBookId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/books/${pendingBookId}`)
        .set(READER_AUTH);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40300);
    });

    it('should allow owner to view their own non-approved book', async () => {
      const createRes = await request(app)
        .post('/api/books')
        .set(READER_AUTH)
        .send({ title: 'My Pending Book', author: 'Test Author', condition: '全新' });
      const pendingBookId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/books/${pendingBookId}`)
        .set(READER_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.approval_status).toBe('pending');
    });

    it('should allow admin to view non-approved book', async () => {
      const createRes = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'Admin Visible Pending', author: 'Test Author', condition: '全新' });
      const pendingBookId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/books/${pendingBookId}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.data.approval_status).toBe('pending');
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/books/abc');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('POST /api/books', () => {
    it('should create a new book with required fields', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'New Book', author: 'New Author', condition: '全新' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toMatchObject({
        title: 'New Book',
        author: 'New Author',
        condition: '全新',
        owner_id: 2,
        current_holder_id: 2,
        status: 'available',
        approval_status: 'pending',
        points_required: 10,
      });
    });

    it('should create a book with all optional fields', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(READER_AUTH)
        .send({
          title: 'Full Book',
          author: 'Full Author',
          condition: '九成新',
          cover: 'https://example.com/cover.jpg',
          description: 'A test description',
          isbn: '978-7-000-00000-0',
          category: '科幻',
          points_required: 25,
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: 'Full Book',
        author: 'Full Author',
        condition: '九成新',
        cover: 'https://example.com/cover.jpg',
        description: 'A test description',
        isbn: '978-7-000-00000-0',
        category: '科幻',
        points_required: 25,
        approval_status: 'pending',
      });
    });

    it('should default points_required to 10 when not provided', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(BIBLIOPHILE_AUTH)
        .send({ title: 'Default Points', author: 'Author', condition: '八成新' });
      expect(res.status).toBe(201);
      expect(res.body.data.points_required).toBe(10);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/books')
        .send({ title: 'No Auth', author: 'Author', condition: '全新' });
      expect(res.status).toBe(401);
    });

    it('should return validation error when title is missing', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ author: 'Author', condition: '全新' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when author is missing', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'No Author', condition: '全新' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when condition is missing', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'No Condition', author: 'Author' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when title exceeds max length', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'x'.repeat(201), author: 'Author', condition: '全新' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should update a book owned by the user', async () => {
      const createRes = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'To Update', author: 'Author', condition: '全新' });
      const bookId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/books/${bookId}`)
        .set(BOOKLOVER_AUTH)
        .send({ title: 'Updated Title', condition: '八成新', points_required: 30 });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.condition).toBe('八成新');
      expect(res.body.data.points_required).toBe(30);
    });

    it('should return 403 when updating another user book', async () => {
      const res = await request(app)
        .put('/api/books/1')
        .set(READER_AUTH)
        .send({ title: 'Hacked' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40300);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .put('/api/books/9999')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'Ghost' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .put('/api/books/1')
        .send({ title: 'No Auth' });
      expect(res.status).toBe(401);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app)
        .put('/api/books/abc')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'Bad Id' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should delete a book owned by the user', async () => {
      const createRes = await request(app)
        .post('/api/books')
        .set(BOOKLOVER_AUTH)
        .send({ title: 'To Delete', author: 'Author', condition: '全新' });
      const bookId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/books/${bookId}`)
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);

      const getRes = await request(app)
        .get(`/api/books/${bookId}`)
        .set(BOOKLOVER_AUTH);
      expect(getRes.status).toBe(404);
    });

    it('should return 403 when deleting another user book', async () => {
      const res = await request(app)
        .delete('/api/books/1')
        .set(READER_AUTH);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40300);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .delete('/api/books/9999')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/books/1');
      expect(res.status).toBe(401);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app)
        .delete('/api/books/abc')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('POST /api/books/batch', () => {
    it('should batch create multiple books', async () => {
      const res = await request(app)
        .post('/api/books/batch')
        .set(BOOKLOVER_AUTH)
        .send({
          books: [
            { title: 'Batch Book 1', author: 'Author 1', condition: '全新' },
            { title: 'Batch Book 2', author: 'Author 2', condition: '九成新', category: '科幻', points_required: 15 },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.created).toBe(2);
      expect(res.body.data.books).toHaveLength(2);
      expect(res.body.data.total_points_pending).toBe(25);
      expect(res.body.data.books[0].approval_status).toBe('pending');
      expect(res.body.data.books[0].owner_id).toBe(2);
    });

    it('should skip books with missing required fields in batch', async () => {
      const res = await request(app)
        .post('/api/books/batch')
        .set(READER_AUTH)
        .send({
          books: [
            { title: 'Valid Batch', author: 'Author', condition: '全新' },
            { title: 'Missing condition', author: 'Author' },
            { author: 'No title', condition: '全新' },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(1);
      expect(res.body.data.books).toHaveLength(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/books/batch')
        .send({ books: [{ title: 'T', author: 'A', condition: '全新' }] });
      expect(res.status).toBe(401);
    });

    it('should return validation error when books array is empty', async () => {
      const res = await request(app)
        .post('/api/books/batch')
        .set(BOOKLOVER_AUTH)
        .send({ books: [] });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when books is missing', async () => {
      const res = await request(app)
        .post('/api/books/batch')
        .set(BOOKLOVER_AUTH)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('PUT /api/books/batch/update', () => {
    let bookIds: number[];

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/books/batch')
        .set(BIBLIOPHILE_AUTH)
        .send({
          books: [
            { title: 'Batch Up 1', author: 'Author', condition: '全新' },
            { title: 'Batch Up 2', author: 'Author', condition: '九成新' },
          ],
        });
      bookIds = createRes.body.data.books.map((b: any) => b.id);
    });

    it('should batch update books owned by the user', async () => {
      const res = await request(app)
        .put('/api/books/batch/update')
        .set(BIBLIOPHILE_AUTH)
        .send({
          book_ids: bookIds,
          updates: { condition: '八成新', points_required: 20 },
        });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.updated).toBe(2);
      expect(res.body.data.books).toHaveLength(2);
      for (const book of res.body.data.books) {
        expect(book.condition).toBe('八成新');
        expect(book.points_required).toBe(20);
      }
    });

    it('should only update books owned by the user', async () => {
      const res = await request(app)
        .put('/api/books/batch/update')
        .set(READER_AUTH)
        .send({
          book_ids: bookIds,
          updates: { condition: '全新' },
        });
      expect(res.status).toBe(200);
      expect(res.body.data.updated).toBe(0);
      expect(res.body.data.books).toHaveLength(0);
    });

    it('should return validation error when book_ids is empty', async () => {
      const res = await request(app)
        .put('/api/books/batch/update')
        .set(BIBLIOPHILE_AUTH)
        .send({ book_ids: [], updates: { condition: '全新' } });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when updates has no allowed fields', async () => {
      const res = await request(app)
        .put('/api/books/batch/update')
        .set(BIBLIOPHILE_AUTH)
        .send({ book_ids: [1], updates: { title: 'New Title' } });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .put('/api/books/batch/update')
        .send({ book_ids: [1], updates: { condition: '全新' } });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/books/export', () => {
    it('should export user books as JSON by default', async () => {
      const res = await request(app)
        .get('/api/books/export')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(Array.isArray(res.body)).toBe(true);
      for (const book of res.body) {
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('title');
        expect(book).toHaveProperty('author');
      }
    });

    it('should export user books as CSV', async () => {
      const res = await request(app)
        .get('/api/books/export?format=csv')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(typeof res.text).toBe('string');
      expect(res.text).toContain('ID');
      expect(res.text).toContain('书名');
    });

    it('should filter export by book_ids', async () => {
      const res = await request(app)
        .get('/api/books/export?book_ids=1,3')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((b: any) => b.id);
      expect(ids).toEqual(expect.arrayContaining([1, 3]));
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/books/export');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/books/search-history', () => {
    it('should return search history for authenticated user', async () => {
      await request(app)
        .post('/api/books/search-history')
        .set(BOOKLOVER_AUTH)
        .send({ keyword: 'test history' });

      const res = await request(app)
        .get('/api/books/search-history')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .get('/api/books/search-history');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/books/search-history', () => {
    it('should add a search history entry', async () => {
      const res = await request(app)
        .post('/api/books/search-history')
        .set(READER_AUTH)
        .send({ keyword: '科幻小说' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.keyword).toBe('科幻小说');
      expect(res.body.data.user_id).toBe(3);
    });

    it('should deduplicate existing keyword and move to top', async () => {
      await request(app)
        .post('/api/books/search-history')
        .set(READER_AUTH)
        .send({ keyword: 'dedup test' });

      const res = await request(app)
        .post('/api/books/search-history')
        .set(READER_AUTH)
        .send({ keyword: 'dedup test' });
      expect(res.status).toBe(201);
      expect(res.body.data.keyword).toBe('dedup test');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/books/search-history')
        .send({ keyword: 'test' });
      expect(res.status).toBe(401);
    });

    it('should return validation error when keyword is missing', async () => {
      const res = await request(app)
        .post('/api/books/search-history')
        .set(BOOKLOVER_AUTH)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });

    it('should return validation error when keyword is too long', async () => {
      const res = await request(app)
        .post('/api/books/search-history')
        .set(BOOKLOVER_AUTH)
        .send({ keyword: 'x'.repeat(101) });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('DELETE /api/books/search-history', () => {
    it('should clear all search history for the user', async () => {
      await request(app)
        .post('/api/books/search-history')
        .set(BIBLIOPHILE_AUTH)
        .send({ keyword: 'to be cleared' });

      const res = await request(app)
        .delete('/api/books/search-history')
        .set(BIBLIOPHILE_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);

      const historyRes = await request(app)
        .get('/api/books/search-history')
        .set(BIBLIOPHILE_AUTH);
      const ownHistory = historyRes.body.data.filter((h: any) => h.keyword === 'to be cleared');
      expect(ownHistory).toHaveLength(0);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/books/search-history');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/books/search-history/:id', () => {
    it('should delete a single search history entry', async () => {
      const addRes = await request(app)
        .post('/api/books/search-history')
        .set(BOOKLOVER_AUTH)
        .send({ keyword: 'single delete test' });
      const historyId = addRes.body.data.id;

      const res = await request(app)
        .delete(`/api/books/search-history/${historyId}`)
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('should return 404 for non-existent history entry', async () => {
      const res = await request(app)
        .delete('/api/books/search-history/9999')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/books/search-history/1');
      expect(res.status).toBe(401);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app)
        .delete('/api/books/search-history/abc')
        .set(BOOKLOVER_AUTH);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('GET /api/books/:id/drift-records', () => {
    it('should return drift records for a book', async () => {
      const res = await request(app).get('/api/books/1/drift-records');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const record of res.body.data) {
        expect(record.book_id).toBe(1);
        expect(record).toHaveProperty('username');
        expect(record).toHaveProperty('avatar');
      }
    });

    it('should return empty array for book with no records', async () => {
      const createRes = await request(app)
        .post('/api/books')
        .set(READER_AUTH)
        .send({ title: 'No Records Book', author: 'Author', condition: '全新' });
      const bookId = createRes.body.data.id;

      const res = await request(app).get(`/api/books/${bookId}/drift-records`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return validation error for invalid id', async () => {
      const res = await request(app).get('/api/books/abc/drift-records');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });

  describe('POST /api/books/:id/drift-records', () => {
    it('should add a drift record with notes', async () => {
      const res = await request(app)
        .post('/api/books/1/drift-records')
        .set(BOOKLOVER_AUTH)
        .send({ notes: 'Great book!' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toMatchObject({
        book_id: 1,
        user_id: 2,
        notes: 'Great book!',
      });
    });

    it('should add a drift record with rating', async () => {
      const res = await request(app)
        .post('/api/books/2/drift-records')
        .set(READER_AUTH)
        .send({ rating: 5, read_date: '2024-05-01' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.read_date).toBe('2024-05-01');
    });

    it('should add a drift record with both notes and rating', async () => {
      const res = await request(app)
        .post('/api/books/3/drift-records')
        .set(BOOKLOVER_AUTH)
        .send({ notes: 'Amazing story', rating: 4, read_date: '2024-06-01' });
      expect(res.status).toBe(201);
      expect(res.body.data.notes).toBe('Amazing story');
      expect(res.body.data.rating).toBe(4);
    });

    it('should return 400 when neither notes nor rating is provided', async () => {
      const res = await request(app)
        .post('/api/books/1/drift-records')
        .set(BOOKLOVER_AUTH)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/books/1/drift-records')
        .send({ notes: 'No auth' });
      expect(res.status).toBe(401);
    });

    it('should return validation error for invalid book id', async () => {
      const res = await request(app)
        .post('/api/books/abc/drift-records')
        .set(BOOKLOVER_AUTH)
        .send({ notes: 'Bad id' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
    });
  });
});
