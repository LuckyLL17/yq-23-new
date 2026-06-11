import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import request from 'supertest';
import db from '../database';
import authRoutes from '../routes/auth';
import bookRoutes from '../routes/books';
import exchangeRoutes from '../routes/exchanges';
import userRoutes from '../routes/users';
import topicRoutes from '../routes/topics';
import wishlistRoutes from '../routes/wishlists';
import goalRoutes from '../routes/goals';
import achievementRoutes from '../routes/achievements';
import clubRoutes from '../routes/reading-clubs';
import donationRoutes from '../routes/donations';
import adminRoutes from '../routes/admin';
import statsRoutes from '../routes/stats';
import { AUTH_HEADERS } from './setup';

dotenv.config();

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/exchanges', exchangeRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/topics', topicRoutes);
  app.use('/api/wishlists', wishlistRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/reading-clubs', clubRoutes);
  app.use('/api/donations', donationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/stats', statsRoutes);
  return app;
}

const app = createApp();

describe('Integration Tests - Cross-module workflows', () => {
  describe('Complete Book Exchange Flow (Books + Exchanges + Users)', () => {
    let bookId: number;
    let exchangeId: number;
    let ownerBeforePoints: number;
    let requesterBeforePoints: number;

    it('Step 1: booklover adds a new book (pending approval)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(AUTH_HEADERS.booklover)
        .send({
          title: '集成测试专用书籍',
          author: '测试作者',
          condition: '全新',
          category: '文学',
          description: '这是一本用于集成测试的书籍',
          points_required: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.approval_status).toBe('pending');
      bookId = res.body.data.id;
    });

    it('Step 2: admin approves the book and owner gets points', async () => {
      await db.read();
      ownerBeforePoints = db.data.users.find(u => u.id === 2)!.points;

      const res = await request(app)
        .post(`/api/admin/books/${bookId}/approve`)
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.book.approval_status).toBe('approved');

      await db.read();
      const ownerAfterPoints = db.data.users.find(u => u.id === 2)!.points;
      expect(ownerAfterPoints).toBeGreaterThan(ownerBeforePoints);
      ownerBeforePoints = ownerAfterPoints;
    });

    it('Step 3: book appears in public book list', async () => {
      const res = await request(app)
        .get('/api/books?search=集成测试专用书籍');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      const found = res.body.data.find((b: any) => b.title === '集成测试专用书籍');
      expect(found).toBeDefined();
      expect(found.status).toBe('available');
    });

    it('Step 4: reader123 creates an exchange request', async () => {
      await db.read();
      requesterBeforePoints = db.data.users.find(u => u.id === 3)!.points;

      const res = await request(app)
        .post('/api/exchanges')
        .set(AUTH_HEADERS.reader123)
        .send({
          book_id: bookId,
          message: '想借这本测试书',
          borrow_days: 14,
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.requester_id).toBe(3);
      exchangeId = res.body.data.id;
    });

    it('Step 5: booklover accepts the exchange, points transferred', async () => {
      const res = await request(app)
        .post(`/api/exchanges/${exchangeId}/accept`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.exchange.status).toBe('accepted');

      await db.read();
      const requesterAfter = db.data.users.find(u => u.id === 3)!.points;
      const ownerAfter = db.data.users.find(u => u.id === 2)!.points;
      const book = db.data.books.find(b => b.id === bookId)!;

      expect(requesterAfter).toBe(requesterBeforePoints - book.points_required);
    });

    it('Step 6: book status changes to borrowed, holder updates', async () => {
      const res = await request(app)
        .get(`/api/books/${bookId}`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('borrowed');
      expect(res.body.data.current_holder_id).toBe(3);
    });

    it('Step 7: booklover starts the exchange', async () => {
      const res = await request(app)
        .post(`/api/exchanges/${exchangeId}/start`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.exchange.status).toBe('in_progress');
    });

    it('Step 8: reader123 completes the exchange', async () => {
      const res = await request(app)
        .post(`/api/exchanges/${exchangeId}/complete`)
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.exchange.status).toBe('completed');
    });

    it('Step 9: book becomes available again', async () => {
      const res = await request(app)
        .get(`/api/books/${bookId}`)
        .set(AUTH_HEADERS.reader123);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('available');
    });

    it('Step 10: both users review the exchange', async () => {
      const ownerReview = await request(app)
        .post(`/api/exchanges/${exchangeId}/review`)
        .set(AUTH_HEADERS.booklover)
        .send({ rating: 5, comment: '很棒的借书人！' });

      expect(ownerReview.status).toBe(201);
      expect(ownerReview.body.code).toBe(0);

      const requesterReview = await request(app)
        .post(`/api/exchanges/${exchangeId}/review`)
        .set(AUTH_HEADERS.reader123)
        .send({ rating: 4, comment: '书况不错' });

      expect(requesterReview.status).toBe(201);
      expect(requesterReview.body.code).toBe(0);
    });

    it('Step 11: reader123 user profile shows review stats', async () => {
      const res = await request(app)
        .get('/api/exchanges/user/3/reviews');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.review_count).toBeGreaterThan(0);
      expect(res.body.data.average_rating).toBeGreaterThan(0);
    });
  });

  describe('Donation + Points + Certificate Flow (Donations + Users)', () => {
    let donationId: number;
    let userBeforePoints: number;

    it('Step 1: bibliophile donates a book, auto-approved with certificate', async () => {
      await db.read();
      userBeforePoints = db.data.users.find(u => u.id === 4)!.points;

      const res = await request(app)
        .post('/api/donations')
        .set(AUTH_HEADERS.bibliophile)
        .send({
          book_title: '集成测试捐赠书籍',
          book_author: '捐赠作者',
          book_condition: '九成新',
          quantity: 2,
          message: '希望这些书能帮助到更多人',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.donation.status).toBe('approved');
      expect(res.body.data.donation.quantity).toBe(2);
      expect(res.body.data.certificate).toBeDefined();
      expect(res.body.data.certificate.certificate_no).toBeDefined();
      donationId = res.body.data.donation.id;
    });

    it('Step 2: user receives points for donation (20pts * quantity)', async () => {
      await db.read();
      const userAfter = db.data.users.find(u => u.id === 4)!.points;
      expect(userAfter).toBe(userBeforePoints + 40);
    });

    it('Step 3: donation appears in user donation list', async () => {
      const res = await request(app)
        .get('/api/donations/mine')
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.donations.length).toBeGreaterThan(0);
      const myDonation = res.body.data.donations.find((d: any) => d.id === donationId);
      expect(myDonation).toBeDefined();
      expect(myDonation.book_title).toBe('集成测试捐赠书籍');
    });

    it('Step 4: donation appears in public ranking', async () => {
      const res = await request(app)
        .get('/api/donations/ranking?type=count');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('rankings');
      expect(Array.isArray(res.body.data.rankings)).toBe(true);
    });

    it('Step 5: user donation stats reflect new donation', async () => {
      const res = await request(app)
        .get('/api/donations/stats')
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.total_books).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total_donations).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total_certificates).toBeGreaterThanOrEqual(1);
    });

    it('Step 6: certificate can be retrieved', async () => {
      const res = await request(app)
        .get(`/api/donations/${donationId}/certificate`)
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('certificate_no');
      expect(res.body.data).toHaveProperty('donation');
      expect(res.body.data.donation.book_title).toBe('集成测试捐赠书籍');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.username).toBe('bibliophile');
    });
  });

  describe('Reading Goal → Achievement Flow (Goals + Books + Achievements)', () => {
    let goalId: number;

    it('Step 1: booklover creates a reading goal', async () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      const res = await request(app)
        .post('/api/goals')
        .set(AUTH_HEADERS.booklover)
        .send({
          title: '月度阅读计划',
          target_books: 3,
          start_date: today.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          description: '本月计划读3本书',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('月度阅读计划');
      expect(res.body.data.target_books).toBe(3);
      goalId = res.body.data.id;
    });

    it('Step 2: add books to the reading goal', async () => {
      const res1 = await request(app)
        .post(`/api/goals/${goalId}/books`)
        .set(AUTH_HEADERS.booklover)
        .send({ book_id: 1 });

      expect(res1.status).toBe(201);
      expect(res1.body.code).toBe(0);

      const res2 = await request(app)
        .post(`/api/goals/${goalId}/books`)
        .set(AUTH_HEADERS.booklover)
        .send({ book_id: 3 });

      expect(res2.status).toBe(201);
    });

    it('Step 3: goal detail shows correct progress', async () => {
      const res = await request(app)
        .get(`/api/goals/${goalId}`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.books.length).toBe(2);
      expect(res.body.data.completed_count).toBe(0);
      expect(res.body.data.progress).toBe(0);
      expect(res.body.data.book_count).toBe(2);
    });

    it('Step 4: mark first book as completed', async () => {
      const res = await request(app)
        .post(`/api/goals/${goalId}/books/1/complete`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('Step 5: progress updates after completing book', async () => {
      const res = await request(app)
        .get(`/api/goals/${goalId}`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.completed_count).toBe(1);
      expect(res.body.data.progress).toBe(33);
    });

    it('Step 6: complete more books to reach target', async () => {
      await request(app)
        .post(`/api/goals/${goalId}/books`)
        .set(AUTH_HEADERS.booklover)
        .send({ book_id: 5 });

      const res1 = await request(app)
        .post(`/api/goals/${goalId}/books/3/complete`)
        .set(AUTH_HEADERS.booklover);
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post(`/api/goals/${goalId}/books/5/complete`)
        .set(AUTH_HEADERS.booklover);
      expect(res2.status).toBe(200);
    });

    it('Step 7: goal progress reaches 100% when target reached', async () => {
      const res = await request(app)
        .get(`/api/goals/${goalId}`)
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.completed_count).toBe(3);
      expect(res.body.data.progress).toBe(100);
    });

    it('Step 8: achievements are available for the user', async () => {
      const res = await request(app)
        .get('/api/achievements')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Step 9: user has unlocked achievements', async () => {
      const res = await request(app)
        .get('/api/achievements/mine')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('User Social Flow (Users + Topics/Posts)', () => {
    let postId: number;

    it('Step 1: bibliophile follows booklover', async () => {
      const res = await request(app)
        .post('/api/users/2/follow')
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('Step 2: follow status shows following=true', async () => {
      const res = await request(app)
        .get('/api/users/2/follow-status')
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_following).toBe(true);
    });

    it('Step 3: booklover follower count increases', async () => {
      const res = await request(app)
        .get('/api/users/2/followers');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Step 4: booklover creates a new post', async () => {
      const res = await request(app)
        .post('/api/topics/posts')
        .set(AUTH_HEADERS.booklover)
        .send({
          title: '分享一本最近在读的好书',
          content: '这本书真的太棒了，强烈推荐给大家！',
          topic_ids: [1],
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('分享一本最近在读的好书');
      postId = res.body.data.id;
    });

    it('Step 5: bibliophile sees booklover post in following feed', async () => {
      const res = await request(app)
        .get('/api/users/feed/following')
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.posts)).toBe(true);
      const feedPost = res.body.data.posts.find((p: any) => p.id === postId);
      expect(feedPost).toBeDefined();
    });

    it('Step 6: bibliophile likes the post', async () => {
      const res = await request(app)
        .post(`/api/topics/posts/${postId}/like`)
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('Step 7: post like count increases', async () => {
      const res = await request(app)
        .get(`/api/topics/posts/${postId}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.like_count).toBeGreaterThanOrEqual(1);
    });

    it('Step 8: bibliophile comments on the post', async () => {
      const res = await request(app)
        .post(`/api/topics/posts/${postId}/comments`)
        .set(AUTH_HEADERS.bibliophile)
        .send({ content: '确实很棒，我也在读！' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.content).toBe('确实很棒，我也在读！');
    });

    it('Step 9: post comment count updates', async () => {
      const res = await request(app)
        .get(`/api/topics/posts/${postId}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.comment_count).toBeGreaterThanOrEqual(1);
    });

    it('Step 10: comment tree includes the new comment', async () => {
      const res = await request(app)
        .get(`/api/topics/posts/${postId}/comments`)
        .set(AUTH_HEADERS.bibliophile);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const comments = res.body.data;
      const myComment = comments.find((c: any) => c.author_id === 4);
      expect(myComment).toBeDefined();
      expect(myComment.author_name).toBe('bibliophile');
    });
  });

  describe('Admin Book Management Flow (Admin + Books)', () => {
    let bookId: number;

    it('Step 1: reader123 adds a new book (pending)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set(AUTH_HEADERS.reader123)
        .send({
          title: '管理员审批测试书',
          author: '测试作家',
          condition: '九成新',
          category: '历史',
          points_required: 12,
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.approval_status).toBe('pending');
      bookId = res.body.data.id;
    });

    it('Step 2: book does NOT appear in public list yet', async () => {
      const res = await request(app)
        .get('/api/books?search=管理员审批测试书');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      const found = res.body.data.find((b: any) => b.id === bookId);
      expect(found).toBeUndefined();
    });

    it('Step 3: admin sees pending book in admin panel', async () => {
      const res = await request(app)
        .get('/api/admin/books?approval_status=pending')
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      const pending = res.body.data.books.find((b: any) => b.id === bookId);
      expect(pending).toBeDefined();
      expect(pending.approval_status).toBe('pending');
    });

    it('Step 4: admin approves the book', async () => {
      const res = await request(app)
        .post(`/api/admin/books/${bookId}/approve`)
        .set(AUTH_HEADERS.admin);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.book.approval_status).toBe('approved');
    });

    it('Step 5: book appears in public list after approval', async () => {
      const res = await request(app)
        .get('/api/books?search=管理员审批测试书');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      const found = res.body.data.find((b: any) => b.id === bookId);
      expect(found).toBeDefined();
      expect(found.status).toBe('available');
    });

    it('Step 6: book owner receives approval points', async () => {
      const res = await request(app)
        .get('/api/users/3');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.points).toBeGreaterThan(0);
    });
  });
});
