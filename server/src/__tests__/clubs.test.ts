import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import './setup';
import readingClubRoutes from '../routes/reading-clubs';

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
  app.use('/api/reading-clubs', readingClubRoutes);
  return app;
}

let app: express.Express;

beforeAll(async () => {
  app = createApp();

  await request(app)
    .post('/api/reading-clubs')
    .set(authHeaders.admin)
    .send({
      title: '《百年孤独》深度共读会',
      description: '一起深度研读马尔克斯的魔幻现实主义经典',
      location: '城市书房·南京路店',
      start_time: '2025-12-20T10:00:00Z',
      end_time: '2025-12-20T13:00:00Z',
      max_participants: 20,
      book_title: '百年孤独',
      book_id: 1,
    });

  await request(app)
    .post('/api/reading-clubs')
    .set(authHeaders.booklover)
    .send({
      title: '科幻迷的聚会：《三体》主题读书会',
      description: '一起讨论刘慈欣的《三体》三部曲',
      location: '时光咖啡馆·大学路店',
      start_time: '2025-12-15T14:00:00Z',
      end_time: '2025-12-15T16:30:00Z',
      max_participants: 15,
      book_title: '三体',
      book_id: 2,
    });

  await request(app)
    .post('/api/reading-clubs')
    .set(authHeaders.reader123)
    .send({
      title: '文学经典：《活着》读书分享会',
      description: '余华代表作《活着》深度分享',
      location: '静安区图书馆·多功能厅',
      start_time: '2025-06-01T10:00:00Z',
      end_time: '2025-06-01T12:00:00Z',
      max_participants: 30,
      book_title: '活着',
      book_id: 4,
    });

  const listRes = await request(app)
    .get('/api/reading-clubs')
    .set(authHeaders.admin);
  const firstClubId = listRes.body.data.clubs[0]?.id;
  if (firstClubId) {
    await request(app)
      .post(`/api/reading-clubs/${firstClubId}/register`)
      .set(authHeaders.booklover);
    await request(app)
      .post(`/api/reading-clubs/${firstClubId}/register`)
      .set(authHeaders.reader123);
  }

  const secondClubId = listRes.body.data.clubs[1]?.id;
  if (secondClubId) {
    await request(app)
      .post(`/api/reading-clubs/${secondClubId}/register`)
      .set(authHeaders.admin);
  }
});

describe('Reading Clubs API', () => {
  describe('GET /api/reading-clubs', () => {
    it('should return clubs without auth token (optional auth)', async () => {
      const res = await request(app).get('/api/reading-clubs');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('clubs');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
      expect(res.body.data).toHaveProperty('total_pages');
    });

    it('should return clubs with auth token', async () => {
      const res = await request(app)
        .get('/api/reading-clubs')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.clubs)).toBe(true);
    });

    it('should include enriched fields in each club', async () => {
      const res = await request(app)
        .get('/api/reading-clubs')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      if (res.body.data.clubs.length > 0) {
        const club = res.body.data.clubs[0];
        expect(club).toHaveProperty('participant_count');
        expect(club).toHaveProperty('is_registered');
        expect(club).toHaveProperty('is_full');
        expect(club).toHaveProperty('organizer_name');
      }
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/reading-clubs?status=upcoming')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      res.body.data.clubs.forEach((club: any) => {
        expect(club.status).toBe('upcoming');
      });
    });

    it('should filter by search keyword', async () => {
      const res = await request(app)
        .get('/api/reading-clubs?search=三体')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      res.body.data.clubs.forEach((club: any) => {
        const keyword = '三体';
        const matches =
          club.title.includes(keyword) ||
          club.description.includes(keyword) ||
          club.location.includes(keyword) ||
          (club.book_title && club.book_title.includes(keyword));
        expect(matches).toBe(true);
      });
    });

    it('should sort by start_time ascending by default', async () => {
      const res = await request(app)
        .get('/api/reading-clubs?sort_by=start_time&sort_order=asc')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      const clubs = res.body.data.clubs;
      if (clubs.length > 1) {
        for (let i = 0; i < clubs.length - 1; i++) {
          expect(new Date(clubs[i].start_time).getTime()).toBeLessThanOrEqual(
            new Date(clubs[i + 1].start_time).getTime()
          );
        }
      }
    });

    it('should sort by created_at', async () => {
      const res = await request(app)
        .get('/api/reading-clubs?sort_by=created_at')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/reading-clubs?page=1&limit=2')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.clubs.length).toBeLessThanOrEqual(2);
    });

    it('should set is_registered correctly for authenticated user', async () => {
      const res = await request(app)
        .get('/api/reading-clubs')
        .set(authHeaders.booklover);
      expect(res.status).toBe(200);
      if (res.body.data.clubs.length > 0) {
        expect(typeof res.body.data.clubs[0].is_registered).toBe('boolean');
      }
    });

    it('should set is_registered false for unauthenticated user', async () => {
      const res = await request(app).get('/api/reading-clubs');
      expect(res.status).toBe(200);
      if (res.body.data.clubs.length > 0) {
        expect(res.body.data.clubs[0].is_registered).toBe(false);
      }
    });
  });

  describe('GET /api/reading-clubs/mine', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/reading-clubs/mine');
      expect(res.status).toBe(401);
    });

    it('should return organized and registered clubs', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/mine')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('organized');
      expect(res.body.data).toHaveProperty('registered');
      expect(Array.isArray(res.body.data.organized)).toBe(true);
      expect(Array.isArray(res.body.data.registered)).toBe(true);
    });

    it('should include clubs organized by user in organized list', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/mine')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      res.body.data.organized.forEach((club: any) => {
        expect(club.organizer_id).toBe(1);
      });
    });

    it('should return empty arrays for user with no clubs', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/mine')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.data.organized).toEqual([]);
      expect(res.body.data.registered).toEqual([]);
    });
  });

  describe('GET /api/reading-clubs/:id', () => {
    let testClubId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.admin)
        .send({
          title: 'Detail Test Club',
          description: 'For detail view testing',
          location: 'Test location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      testClubId = createRes.body.data.id;

      await request(app)
        .post(`/api/reading-clubs/${testClubId}/register`)
        .set(authHeaders.booklover);
    });

    it('should return club detail without auth (optional auth)', async () => {
      const res = await request(app).get(`/api/reading-clubs/${testClubId}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('participants');
      expect(res.body.data).toHaveProperty('participant_count');
      expect(res.body.data).toHaveProperty('is_registered');
      expect(res.body.data).toHaveProperty('is_full');
    });

    it('should return club detail with auth token', async () => {
      const res = await request(app)
        .get(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.participants)).toBe(true);
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app).get('/api/reading-clubs/9999');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app).get('/api/reading-clubs/abc');
      expect(res.status).toBe(400);
    });

    it('should include user details in participants', async () => {
      const res = await request(app)
        .get(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      const participants = res.body.data.participants;
      if (participants.length > 0) {
        expect(participants[0]).toHaveProperty('user_name');
      }
    });
  });

  describe('POST /api/reading-clubs', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .send({
          title: 'Test Club',
          description: 'Test Description',
          location: 'Test Location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      expect(res.status).toBe(401);
    });

    it('should create a new reading club', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.booklover)
        .send({
          title: '新建读书会',
          description: '一起读好书',
          location: '上海市中心图书馆',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 15,
        });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('新建读书会');
      expect(res.body.data.description).toBe('一起读好书');
      expect(res.body.data.location).toBe('上海市中心图书馆');
      expect(res.body.data.organizer_id).toBe(2);
      expect(res.body.data.status).toBe('upcoming');
      expect(res.body.data.participant_count).toBe(0);
      expect(res.body.data.is_full).toBe(false);
    });

    it('should create club with optional book_title and book_id', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.reader123)
        .send({
          title: '三体读书会',
          description: '讨论三体',
          location: '咖啡馆',
          start_time: '2025-11-01T14:00:00Z',
          end_time: '2025-11-01T16:00:00Z',
          max_participants: 10,
          book_title: '三体',
          book_id: 2,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.book_title).toBe('三体');
      expect(res.body.data.book_id).toBe(2);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.booklover)
        .send({
          description: 'Test',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      expect(res.status).toBe(400);
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.booklover)
        .send({
          title: 'Test',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      expect(res.status).toBe(400);
    });

    it('should return 400 when location is missing', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.booklover)
        .send({
          title: 'Test',
          description: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      expect(res.status).toBe(400);
    });

    it('should return 400 when end_time is before start_time', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.booklover)
        .send({
          title: 'Test',
          description: 'Test',
          location: 'Test',
          start_time: '2025-12-01T13:00:00Z',
          end_time: '2025-12-01T10:00:00Z',
          max_participants: 10,
        });
      expect(res.status).toBe(400);
    });

    it('should return 400 when max_participants is less than 1', async () => {
      const res = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.booklover)
        .send({
          title: 'Test',
          description: 'Test',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 0,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/reading-clubs/:id', () => {
    let testClubId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.reader123)
        .send({
          title: 'Club To Update',
          description: 'Original description',
          location: 'Original location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      testClubId = createRes.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .put('/api/reading-clubs/1')
        .send({ title: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should update club as organizer', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.reader123)
        .send({ title: 'Updated Club Title' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.title).toBe('Updated Club Title');
    });

    it('should update club description', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.reader123)
        .send({ description: 'Updated description' });
      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated description');
    });

    it('should update club location', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.reader123)
        .send({ location: 'New Location' });
      expect(res.status).toBe(200);
      expect(res.body.data.location).toBe('New Location');
    });

    it('should return 403 when non-organizer tries to update', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.bibliophile)
        .send({ title: 'Hacked' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40300);
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app)
        .put('/api/reading-clubs/9999')
        .set(authHeaders.admin)
        .send({ title: 'New Title' });
      expect(res.status).toBe(404);
    });

    it('should return 400 when updating end_time before start_time', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.reader123)
        .send({ end_time: '2025-01-01T08:00:00Z' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when updating title to empty', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.reader123)
        .send({ title: '' });
      expect(res.status).toBe(400);
    });

    it('should update club status', async () => {
      const res = await request(app)
        .put(`/api/reading-clubs/${testClubId}`)
        .set(authHeaders.reader123)
        .send({ status: 'ongoing' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ongoing');
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app)
        .put('/api/reading-clubs/abc')
        .set(authHeaders.reader123)
        .send({ title: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/reading-clubs/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete('/api/reading-clubs/1');
      expect(res.status).toBe(401);
    });

    it('should delete club as organizer', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.bibliophile)
        .send({
          title: 'Club To Delete',
          description: 'Will be deleted',
          location: 'Test location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/reading-clubs/${clubId}`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('读书会活动已删除');
    });

    it('should return 403 when non-organizer tries to delete', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.reader123)
        .send({
          title: 'Protected Club',
          description: 'Cannot be deleted by others',
          location: 'Test location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/reading-clubs/${clubId}`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app)
        .delete('/api/reading-clubs/9999')
        .set(authHeaders.admin);
      expect(res.status).toBe(404);
    });

    it('should remove associated participants when deleting club', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.reader123)
        .send({
          title: 'Club With Participants',
          description: 'Has participants',
          location: 'Test location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;

      await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.bibliophile);

      const deleteRes = await request(app)
        .delete(`/api/reading-clubs/${clubId}`)
        .set(authHeaders.reader123);
      expect(deleteRes.status).toBe(200);

      const detailRes = await request(app).get(`/api/reading-clubs/${clubId}`);
      expect(detailRes.status).toBe(404);
    });
  });

  describe('POST /api/reading-clubs/:id/register', () => {
    let testClubId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.reader123)
        .send({
          title: 'Club For Registration',
          description: 'Test registration',
          location: 'Test location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 5,
        });
      testClubId = createRes.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post(`/api/reading-clubs/${testClubId}/register`);
      expect(res.status).toBe(401);
    });

    it('should register a user for a club', async () => {
      const res = await request(app)
        .post(`/api/reading-clubs/${testClubId}/register`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('报名成功');
      expect(res.body.data.participant).toBeDefined();
      expect(res.body.data.participant.user_id).toBe(4);
      expect(res.body.data.participant.status).toBe('registered');
    });

    it('should return 400 when registering as organizer', async () => {
      const res = await request(app)
        .post(`/api/reading-clubs/${testClubId}/register`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(400);
    });

    it('should return 400 when already registered', async () => {
      const res = await request(app)
        .post(`/api/reading-clubs/${testClubId}/register`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app)
        .post('/api/reading-clubs/9999/register')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 400 when club is ended', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.admin)
        .send({
          title: 'Ended Club',
          description: 'Already ended',
          location: 'Test',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;
      await request(app)
        .put(`/api/reading-clubs/${clubId}`)
        .set(authHeaders.admin)
        .send({ status: 'ended' });

      const res = await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(400);
    });

    it('should return 400 when club is full', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.admin)
        .send({
          title: 'Full Club',
          description: 'Only 1 spot',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 1,
        });
      const clubId = createRes.body.data.id;

      await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.booklover);

      const res = await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(400);
    });

    it('should re-register a cancelled participant', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.admin)
        .send({
          title: 'Re-register Club',
          description: 'Test re-registration',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;

      await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.bibliophile);

      await request(app)
        .post(`/api/reading-clubs/${clubId}/cancel`)
        .set(authHeaders.bibliophile);

      const res = await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.data.participant.status).toBe('registered');
    });
  });

  describe('POST /api/reading-clubs/:id/cancel', () => {
    let testClubId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.reader123)
        .send({
          title: 'Club For Cancellation',
          description: 'Test cancellation',
          location: 'Test location',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      testClubId = createRes.body.data.id;

      await request(app)
        .post(`/api/reading-clubs/${testClubId}/register`)
        .set(authHeaders.bibliophile);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post(`/api/reading-clubs/${testClubId}/cancel`);
      expect(res.status).toBe(401);
    });

    it('should cancel registration', async () => {
      const res = await request(app)
        .post(`/api/reading-clubs/${testClubId}/cancel`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('已取消报名');
    });

    it('should return 400 when not registered', async () => {
      const res = await request(app)
        .post(`/api/reading-clubs/${testClubId}/cancel`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app)
        .post('/api/reading-clubs/9999/cancel')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 400 for user who never registered', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.admin)
        .send({
          title: 'Another Club',
          description: 'Test',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/reading-clubs/${clubId}/cancel`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reading-clubs/:id/participants', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/reading-clubs/1/participants');
      expect(res.status).toBe(401);
    });

    it('should return participants list', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/1/participants')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should include user details in participants', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/1/participants')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const participant = res.body.data[0];
        expect(participant).toHaveProperty('user_name');
        expect(participant).toHaveProperty('user_bio');
      }
    });

    it('should return 404 for non-existent club', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/9999/participants')
        .set(authHeaders.admin);
      expect(res.status).toBe(404);
    });

    it('should not include cancelled participants', async () => {
      const createRes = await request(app)
        .post('/api/reading-clubs')
        .set(authHeaders.admin)
        .send({
          title: 'Participants Test Club',
          description: 'Test',
          location: 'Test',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T13:00:00Z',
          max_participants: 10,
        });
      const clubId = createRes.body.data.id;

      await request(app)
        .post(`/api/reading-clubs/${clubId}/register`)
        .set(authHeaders.bibliophile);
      await request(app)
        .post(`/api/reading-clubs/${clubId}/cancel`)
        .set(authHeaders.bibliophile);

      const res = await request(app)
        .get(`/api/reading-clubs/${clubId}/participants`)
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      const cancelledParticipants = res.body.data.filter(
        (p: any) => p.user_id === 4
      );
      expect(cancelledParticipants.length).toBe(0);
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app)
        .get('/api/reading-clubs/abc/participants')
        .set(authHeaders.admin);
      expect(res.status).toBe(400);
    });
  });
});
