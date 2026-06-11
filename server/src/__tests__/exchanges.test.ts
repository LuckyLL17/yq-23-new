import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import request from 'supertest';
import db from '../database';
import exchangeRoutes from '../routes/exchanges';
import { AUTH_HEADERS } from './setup';

dotenv.config();

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/exchanges', exchangeRoutes);
  return app;
}

const app = createApp();

describe('Exchanges API', () => {
  describe('POST /api/exchanges', () => {
    it('should create an exchange request successfully', async () => {
      const res = await request(app)
        .post('/api/exchanges')
        .set(AUTH_HEADERS.reader123)
        .send({
          book_id: 1,
          message: '想借这本书看看',
          borrow_days: 14,
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.book_id).toBe(1);
      expect(res.body.data.requester_id).toBe(3);
      expect(res.body.data.owner_id).toBe(2);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.message).toBe('想借这本书看看');
      expect(res.body.data.borrow_days).toBe(14);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/exchanges')
        .send({ book_id: 1 });

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .post('/api/exchanges')
        .set(AUTH_HEADERS.booklover)
        .send({ book_id: 9999 });

      expect(res.status).toBe(404);
    });

    it('should return 400 if user already has the book', async () => {
      const res = await request(app)
        .post('/api/exchanges')
        .set(AUTH_HEADERS.booklover)
        .send({ book_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 400 for insufficient points', async () => {
      await db.read();
      const user = db.data.users.find(u => u.id === 3);
      if (user) {
        user.points = 5;
        await db.write();
      }

      const res = await request(app)
        .post('/api/exchanges')
        .set(AUTH_HEADERS.reader123)
        .send({ book_id: 2 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);

      await db.read();
      const restoreUser = db.data.users.find(u => u.id === 3);
      if (restoreUser) {
        restoreUser.points = 80;
        await db.write();
      }
    });
  });

  describe('GET /api/exchanges', () => {
    it('should list user exchanges', async () => {
      const res = await request(app)
        .get('/api/exchanges')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/exchanges');

      expect(res.status).toBe(401);
    });

    it('should include enriched book and user info', async () => {
      const res = await request(app)
        .get('/api/exchanges')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const exchange = res.body.data[0];
        expect(exchange).toHaveProperty('title');
        expect(exchange).toHaveProperty('requester_name');
        expect(exchange).toHaveProperty('owner_name');
      }
    });
  });

  describe('GET /api/exchanges/:id', () => {
    let exchangeId: number;

    beforeAll(async () => {
      await db.read();
      const newId = Math.max(0, ...db.data.exchanges.map(e => e.id)) + 1;
      const exchange = {
        id: newId,
        book_id: 2,
        requester_id: 2,
        owner_id: 3,
        status: 'pending' as const,
        message: '测试exchange',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        borrow_days: 30,
        owner_rated: false,
        requester_rated: false,
      };
      db.data.exchanges.push(exchange);
      await db.write();
      exchangeId = newId;
    });

    it('should get exchange detail for participant', async () => {
      const res = await request(app)
        .get(`/api/exchanges/${exchangeId}`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(exchangeId);
      expect(res.body.data).toHaveProperty('book');
      expect(res.body.data).toHaveProperty('requester');
      expect(res.body.data).toHaveProperty('owner');
      expect(res.body.data).toHaveProperty('reviews');
    });

    it('should return 403 for non-participant', async () => {
      const res = await request(app)
        .get(`/api/exchanges/${exchangeId}`)
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent exchange', async () => {
      const res = await request(app)
        .get('/api/exchanges/9999')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(404);
    });
  });

  describe('Exchange lifecycle', () => {
    let exchangeId: number;

    beforeEach(async () => {
      await db.read();
      const newId = Math.max(0, ...db.data.exchanges.map(e => e.id)) + 1;
      const exchange = {
        id: newId,
        book_id: 3,
        requester_id: 4,
        owner_id: 2,
        status: 'pending' as const,
        message: '生命周期测试',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        borrow_days: 30,
        owner_rated: false,
        requester_rated: false,
      };
      db.data.exchanges.push(exchange);
      await db.write();
      exchangeId = newId;
    });

    describe('POST /api/exchanges/:id/accept', () => {
      it('should accept exchange as owner', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
        expect(res.body.data.exchange.status).toBe('accepted');
        expect(res.body.data.exchange.accepted_at).toBeDefined();
      });

      it('should return 403 if not owner', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.bibliophile);

        expect(res.status).toBe(403);
      });

      it('should return 400 if exchange not pending', async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(400);
      });

      it('should transfer points on acceptance', async () => {
        await db.read();
        const ownerBefore = db.data.users.find(u => u.id === 2)!.points;
        const requesterBefore = db.data.users.find(u => u.id === 4)!.points;

        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        await db.read();
        const ownerAfter = db.data.users.find(u => u.id === 2)!.points;
        const requesterAfter = db.data.users.find(u => u.id === 4)!.points;
        const book = db.data.books.find(b => b.id === 3)!;

        expect(ownerAfter).toBe(ownerBefore + book.points_required);
        expect(requesterAfter).toBe(requesterBefore - book.points_required);
      });

      it('should update book status and holder on acceptance', async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        await db.read();
        const book = db.data.books.find(b => b.id === 3)!;
        expect(book.status).toBe('borrowed');
        expect(book.current_holder_id).toBe(4);
      });
    });

    describe('POST /api/exchanges/:id/reject', () => {
      it('should reject exchange as owner', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/reject`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
      });

      it('should return 403 if not owner', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/reject`)
          .set(AUTH_HEADERS.bibliophile);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/exchanges/:id/cancel', () => {
      it('should cancel exchange as requester', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/cancel`)
          .set(AUTH_HEADERS.bibliophile);

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
      });

      it('should return 403 if not requester', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/cancel`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/exchanges/:id/start', () => {
      it('should start accepted exchange', async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/start`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
        expect(res.body.data.exchange.status).toBe('in_progress');
      });

      it('should return 400 if exchange not accepted', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/start`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(400);
      });

      it('should return 403 for non-participant', async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);

        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/start`)
          .set(AUTH_HEADERS.reader123);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/exchanges/:id/complete', () => {
      beforeEach(async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);
        await request(app)
          .post(`/api/exchanges/${exchangeId}/start`)
          .set(AUTH_HEADERS.booklover);
      });

      it('should complete in-progress exchange', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/complete`)
          .set(AUTH_HEADERS.booklover);

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
        expect(res.body.data.exchange.status).toBe('completed');
      });

      it('should return 403 for non-participant', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/complete`)
          .set(AUTH_HEADERS.reader123);

        expect(res.status).toBe(403);
      });

      it('should set book back to available', async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/complete`)
          .set(AUTH_HEADERS.booklover);

        await db.read();
        const book = db.data.books.find(b => b.id === 3)!;
        expect(book.status).toBe('available');
      });
    });

    describe('POST /api/exchanges/:id/review', () => {
      beforeEach(async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);
        await request(app)
          .post(`/api/exchanges/${exchangeId}/start`)
          .set(AUTH_HEADERS.booklover);
        await request(app)
          .post(`/api/exchanges/${exchangeId}/complete`)
          .set(AUTH_HEADERS.booklover);
      });

      it('should review completed exchange as owner', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/review`)
          .set(AUTH_HEADERS.booklover)
          .send({ rating: 5, comment: '很棒的交换体验！' });

        expect(res.status).toBe(201);
        expect(res.body.code).toBe(0);
        expect(res.body.data.rating).toBe(5);
        expect(res.body.data.comment).toBe('很棒的交换体验！');
      });

      it('should return 400 if already reviewed', async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/review`)
          .set(AUTH_HEADERS.booklover)
          .send({ rating: 4 });

        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/review`)
          .set(AUTH_HEADERS.booklover)
          .send({ rating: 5 });

        expect(res.status).toBe(400);
      });

      it('should return 400 if exchange not completed', async () => {
        await db.read();
        const newId = Math.max(0, ...db.data.exchanges.map(e => e.id)) + 1;
        const pendingExchange = {
          id: newId,
          book_id: 4,
          requester_id: 4,
          owner_id: 3,
          status: 'pending' as const,
          message: '测试review',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          borrow_days: 30,
          owner_rated: false,
          requester_rated: false,
        };
        db.data.exchanges.push(pendingExchange);
        await db.write();

        const res = await request(app)
          .post(`/api/exchanges/${newId}/review`)
          .set(AUTH_HEADERS.bibliophile)
          .send({ rating: 4 });

        expect(res.status).toBe(400);
      });

      it('should return 403 for non-participant', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/review`)
          .set(AUTH_HEADERS.reader123)
          .send({ rating: 5 });

        expect(res.status).toBe(403);
      });

      it('should return validation error for invalid rating', async () => {
        const res = await request(app)
          .post(`/api/exchanges/${exchangeId}/review`)
          .set(AUTH_HEADERS.booklover)
          .send({ rating: 6 });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/exchanges/:id/reviews', () => {
      beforeEach(async () => {
        await request(app)
          .post(`/api/exchanges/${exchangeId}/accept`)
          .set(AUTH_HEADERS.booklover);
        await request(app)
          .post(`/api/exchanges/${exchangeId}/start`)
          .set(AUTH_HEADERS.booklover);
        await request(app)
          .post(`/api/exchanges/${exchangeId}/complete`)
          .set(AUTH_HEADERS.booklover);
        await request(app)
          .post(`/api/exchanges/${exchangeId}/review`)
          .set(AUTH_HEADERS.booklover)
          .send({ rating: 4, comment: '不错' });
      });

      it('should list exchange reviews for participant', async () => {
        const res = await request(app)
          .get(`/api/exchanges/${exchangeId}/reviews`)
          .set(AUTH_HEADERS.bibliophile);

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(0);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      });

      it('should return 403 for non-participant', async () => {
        const res = await request(app)
          .get(`/api/exchanges/${exchangeId}/reviews`)
          .set(AUTH_HEADERS.reader123);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('GET /api/exchanges/user/:userId/reviews', () => {
    beforeAll(async () => {
      await db.read();
      const exchangeId = Math.max(0, ...db.data.exchanges.map(e => e.id)) + 1;
      const reviewId = Math.max(0, ...db.data.exchangeReviews.map(r => r.id)) + 1;
      const exchange = {
        id: exchangeId,
        book_id: 4,
        requester_id: 2,
        owner_id: 3,
        status: 'completed' as const,
        message: '用户review测试',
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        borrow_days: 30,
        owner_rated: true,
        requester_rated: false,
      };
      const review = {
        id: reviewId,
        exchange_id: exchangeId,
        reviewer_id: 3,
        reviewee_id: 2,
        rating: 5,
        comment: '非常好的借书人',
        created_at: new Date().toISOString(),
      };
      db.data.exchanges.push(exchange);
      db.data.exchangeReviews.push(review);
      await db.write();
    });

    it('should get user reviews publicly', async () => {
      const res = await request(app)
        .get('/api/exchanges/user/2/reviews');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('reviews');
      expect(res.body.data).toHaveProperty('average_rating');
      expect(res.body.data).toHaveProperty('review_count');
    });

    it('should return 400 for invalid userId', async () => {
      const res = await request(app)
        .get('/api/exchanges/user/invalid/reviews');

      expect(res.status).toBe(400);
    });

    it('should include book info in reviews', async () => {
      const res = await request(app)
        .get('/api/exchanges/user/2/reviews');

      expect(res.status).toBe(200);
      if (res.body.data.reviews.length > 0) {
        const review = res.body.data.reviews[0];
        expect(review).toHaveProperty('book_title');
        expect(review).toHaveProperty('reviewer_name');
      }
    });
  });
});
