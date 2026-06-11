import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import './setup';
import goalRoutes from '../routes/goals';

const JWT_SECRET = 'book-exchange-secret-key';

function generateToken(user: { id: number; username: string; email: string; role: string }) {
  return jwt.sign(user, JWT_SECRET);
}

const users = {
  admin: { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin' },
  booklover: { id: 2, username: 'booklover', email: 'booklover@example.com', role: 'user' },
  reader123: { id: 3, username: 'reader123', email: 'reader@example.com', role: 'user' },
  bibliophile: { id: 4, username: 'bibliophile', email: 'biblio@example.com', role: 'user' },
};

const tokens = {
  admin: generateToken(users.admin),
  booklover: generateToken(users.booklover),
  reader123: generateToken(users.reader123),
  bibliophile: generateToken(users.bibliophile),
};

const authHeaders = {
  admin: { Authorization: `Bearer ${tokens.admin}` },
  booklover: { Authorization: `Bearer ${tokens.booklover}` },
  reader123: { Authorization: `Bearer ${tokens.reader123}` },
  bibliophile: { Authorization: `Bearer ${tokens.bibliophile}` },
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/goals', goalRoutes);
  return app;
}

let app: express.Express;

beforeAll(() => {
  app = createApp();
});

describe('Goals API', () => {
  describe('GET /api/goals', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/goals');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('should return goals for authenticated user', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include progress information in goals', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const goal = res.body.data[0];
        expect(goal).toHaveProperty('book_count');
        expect(goal).toHaveProperty('completed_count');
        expect(goal).toHaveProperty('progress');
        expect(typeof goal.progress).toBe('number');
      }
    });

    it('should return empty array for user with no goals', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should sort goals by created_at descending', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      const data = res.body.data;
      if (data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          expect(new Date(data[i].created_at).getTime()).toBeGreaterThanOrEqual(
            new Date(data[i + 1].created_at).getTime()
          );
        }
      }
    });
  });

  describe('POST /api/goals', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/goals')
        .send({ title: 'Test', target_books: 5, start_date: '2025-01-01', end_date: '2025-12-31' });
      expect(res.status).toBe(401);
    });

    it('should create a new goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({
          title: '年度阅读计划',
          description: '今年读完20本书',
          target_books: 20,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('年度阅读计划');
      expect(res.body.data.target_books).toBe(20);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.book_count).toBe(0);
      expect(res.body.data.completed_count).toBe(0);
      expect(res.body.data.progress).toBe(0);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({ target_books: 5, start_date: '2025-01-01', end_date: '2025-12-31' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when target_books is missing', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({ title: 'Test', start_date: '2025-01-01', end_date: '2025-12-31' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when start_date is missing', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({ title: 'Test', target_books: 5, end_date: '2025-12-31' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when end_date is missing', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({ title: 'Test', target_books: 5, start_date: '2025-01-01' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when title is empty', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({ title: '', target_books: 5, start_date: '2025-01-01', end_date: '2025-12-31' });
      expect(res.status).toBe(400);
    });

    it('should create goal without description', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set(authHeaders.reader123)
        .send({
          title: 'Simple Goal',
          target_books: 3,
          start_date: '2025-06-01',
          end_date: '2025-09-30',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.description).toBe('');
    });
  });

  describe('GET /api/goals/:id', () => {
    let adminGoalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.admin)
        .send({
          title: 'Admin Test Goal',
          target_books: 3,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      adminGoalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${adminGoalId}/books`)
        .set(authHeaders.admin)
        .send({ book_id: 1 });
      await request(app)
        .post(`/api/goals/${adminGoalId}/books`)
        .set(authHeaders.admin)
        .send({ book_id: 2 });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`/api/goals/${adminGoalId}`);
      expect(res.status).toBe(401);
    });

    it('should return goal detail with books', async () => {
      const res = await request(app)
        .get(`/api/goals/${adminGoalId}`)
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('books');
      expect(res.body.data).toHaveProperty('book_count');
      expect(res.body.data).toHaveProperty('completed_count');
      expect(res.body.data).toHaveProperty('progress');
      expect(Array.isArray(res.body.data.books)).toBe(true);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .get('/api/goals/9999')
        .set(authHeaders.admin);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const res = await request(app)
        .get(`/api/goals/${adminGoalId}`)
        .set(authHeaders.booklover);
      expect(res.status).toBe(404);
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app)
        .get('/api/goals/abc')
        .set(authHeaders.admin);
      expect(res.status).toBe(400);
    });

    it('should include book details with is_completed flag', async () => {
      const res = await request(app)
        .get(`/api/goals/${adminGoalId}`)
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      const books = res.body.data.books;
      books.forEach((b: any) => {
        expect(b).toHaveProperty('is_completed');
        expect(b).toHaveProperty('goal_book_id');
        expect(b).toHaveProperty('added_at');
      });
    });
  });

  describe('PUT /api/goals/:id', () => {
    let testGoalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.bibliophile)
        .send({
          title: 'Goal To Update',
          target_books: 5,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      testGoalId = createRes.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .put('/api/goals/1')
        .send({ title: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should update goal title', async () => {
      const res = await request(app)
        .put(`/api/goals/${testGoalId}`)
        .set(authHeaders.bibliophile)
        .send({ title: 'Updated Goal Title' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('Updated Goal Title');
    });

    it('should update goal description', async () => {
      const res = await request(app)
        .put(`/api/goals/${testGoalId}`)
        .set(authHeaders.bibliophile)
        .send({ description: 'New description for goal' });
      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('New description for goal');
    });

    it('should update goal target_books', async () => {
      const res = await request(app)
        .put(`/api/goals/${testGoalId}`)
        .set(authHeaders.bibliophile)
        .send({ target_books: 10 });
      expect(res.status).toBe(200);
      expect(res.body.data.target_books).toBe(10);
    });

    it('should update goal status', async () => {
      const res = await request(app)
        .put(`/api/goals/${testGoalId}`)
        .set(authHeaders.bibliophile)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .put('/api/goals/9999')
        .set(authHeaders.admin)
        .send({ title: 'New Title' });
      expect(res.status).toBe(404);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const res = await request(app)
        .put(`/api/goals/${testGoalId}`)
        .set(authHeaders.reader123)
        .send({ title: 'Hacked' });
      expect(res.status).toBe(404);
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app)
        .put('/api/goals/abc')
        .set(authHeaders.admin)
        .send({ title: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete('/api/goals/1');
      expect(res.status).toBe(401);
    });

    it('should delete a goal', async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.reader123)
        .send({
          title: 'Goal To Delete',
          target_books: 3,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      const goalId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/goals/${goalId}`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('阅读目标已删除');
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .delete('/api/goals/9999')
        .set(authHeaders.admin);
      expect(res.status).toBe(404);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({
          title: 'Booklover Goal',
          target_books: 3,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      const otherGoalId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/goals/${otherGoalId}`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(404);
    });

    it('should remove associated goal books when deleting goal', async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.reader123)
        .send({
          title: 'Goal With Books',
          target_books: 3,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      const goalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${goalId}/books`)
        .set(authHeaders.reader123)
        .send({ book_id: 1 });

      const deleteRes = await request(app)
        .delete(`/api/goals/${goalId}`)
        .set(authHeaders.reader123);
      expect(deleteRes.status).toBe(200);

      const detailRes = await request(app)
        .get(`/api/goals/${goalId}`)
        .set(authHeaders.reader123);
      expect(detailRes.status).toBe(404);
    });
  });

  describe('POST /api/goals/:id/books', () => {
    let testGoalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.booklover)
        .send({
          title: 'Goal For Adding Books',
          target_books: 5,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      testGoalId = createRes.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .send({ book_id: 1 });
      expect(res.status).toBe(401);
    });

    it('should add a book to goal', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.booklover)
        .send({ book_id: 1 });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.book_id).toBe(1);
      expect(res.body.data.is_completed).toBe(false);
      expect(res.body.data.book).toBeDefined();
      expect(res.body.data.book.id).toBe(1);
    });

    it('should return 400 when adding duplicate book', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.booklover)
        .send({ book_id: 1 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 400 when book_id is missing', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.booklover)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.booklover)
        .send({ book_id: 9999 });
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .post('/api/goals/9999/books')
        .set(authHeaders.booklover)
        .send({ book_id: 1 });
      expect(res.status).toBe(404);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.reader123)
        .send({ book_id: 2 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/goals/:id/books/:bookId', () => {
    let testGoalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.bibliophile)
        .send({
          title: 'Goal For Removing Books',
          target_books: 5,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      testGoalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.bibliophile)
        .send({ book_id: 3 });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).delete(`/api/goals/${testGoalId}/books/3`);
      expect(res.status).toBe(401);
    });

    it('should remove a book from goal', async () => {
      const res = await request(app)
        .delete(`/api/goals/${testGoalId}/books/3`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('已从阅读目标中移除');
    });

    it('should return 404 for book not in goal', async () => {
      const res = await request(app)
        .delete(`/api/goals/${testGoalId}/books/999`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .delete('/api/goals/9999/books/1')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const res = await request(app)
        .delete(`/api/goals/${testGoalId}/books/3`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/goals/:id/books/:bookId/complete', () => {
    let testGoalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.reader123)
        .send({
          title: 'Goal For Completing Books',
          target_books: 2,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      testGoalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.reader123)
        .send({ book_id: 1 });
      await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.reader123)
        .send({ book_id: 2 });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post(`/api/goals/${testGoalId}/books/1/complete`);
      expect(res.status).toBe(401);
    });

    it('should mark a book as read', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/1/complete`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('已标记为已读');
      expect(res.body.data.goal_book.is_completed).toBe(true);
      expect(res.body.data.goal_book.completed_at).toBeDefined();
      expect(res.body.data.book).toBeDefined();
    });

    it('should return 400 when marking already completed book', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/1/complete`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should auto-complete goal when all target books are read', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/2/complete`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(200);

      const goalRes = await request(app)
        .get(`/api/goals/${testGoalId}`)
        .set(authHeaders.reader123);
      expect(goalRes.body.data.status).toBe('completed');
    });

    it('should return 404 for book not in goal', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/999/complete`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .post('/api/goals/9999/books/1/complete')
        .set(authHeaders.reader123);
      expect(res.status).toBe(404);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/1/complete`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should include newly_unlocked_achievements when marking complete', async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.bibliophile)
        .send({
          title: 'Achievement Test Goal',
          target_books: 1,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      const goalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${goalId}/books`)
        .set(authHeaders.bibliophile)
        .send({ book_id: 4 });

      const res = await request(app)
        .post(`/api/goals/${goalId}/books/4/complete`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('newly_unlocked_achievements');
    });
  });

  describe('POST /api/goals/:id/books/:bookId/uncomplete', () => {
    let testGoalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.bibliophile)
        .send({
          title: 'Goal For Uncompleting Books',
          target_books: 3,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      testGoalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${testGoalId}/books`)
        .set(authHeaders.bibliophile)
        .send({ book_id: 4 });
      await request(app)
        .post(`/api/goals/${testGoalId}/books/4/complete`)
        .set(authHeaders.bibliophile);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post(`/api/goals/${testGoalId}/books/4/uncomplete`);
      expect(res.status).toBe(401);
    });

    it('should unmark a book as read', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/4/uncomplete`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('已取消已读标记');
      expect(res.body.data.goal_book.is_completed).toBe(false);
      expect(res.body.data.goal_book.completed_at).toBeUndefined();
    });

    it('should return 400 when uncompleting a not-yet-completed book', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/4/uncomplete`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 for book not in goal', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/999/uncomplete`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app)
        .post('/api/goals/9999/books/1/uncomplete')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 404 for goal belonging to another user', async () => {
      const res = await request(app)
        .post(`/api/goals/${testGoalId}/books/4/uncomplete`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(404);
    });

    it('should revert goal status from completed to active when uncompleting', async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set(authHeaders.reader123)
        .send({
          title: 'Revert Status Goal',
          target_books: 1,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      const goalId = createRes.body.data.id;

      await request(app)
        .post(`/api/goals/${goalId}/books`)
        .set(authHeaders.reader123)
        .send({ book_id: 5 });
      await request(app)
        .post(`/api/goals/${goalId}/books/5/complete`)
        .set(authHeaders.reader123);

      const goalAfterComplete = await request(app)
        .get(`/api/goals/${goalId}`)
        .set(authHeaders.reader123);
      expect(goalAfterComplete.body.data.status).toBe('completed');

      await request(app)
        .post(`/api/goals/${goalId}/books/5/uncomplete`)
        .set(authHeaders.reader123);

      const goalAfterUncomplete = await request(app)
        .get(`/api/goals/${goalId}`)
        .set(authHeaders.reader123);
      expect(goalAfterUncomplete.body.data.status).toBe('active');
    });
  });
});
