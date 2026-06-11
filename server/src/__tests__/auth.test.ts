import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import db from '../database';
import authRoutes from '../routes/auth';
import { AUTH_HEADERS, JWT_SECRET } from './setup';

dotenv.config();

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

const app = createApp();

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.username).toBe('newuser');
      expect(res.body.data.user.email).toBe('newuser@test.com');
    });

    it('should return 400 for duplicate username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'booklover',
          email: 'brand-new@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 400 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'brand-new-user',
          email: 'booklover@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return validation error for short password (<6)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'shortpwuser',
          email: 'shortpw@test.com',
          password: '12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'booklover@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('booklover@example.com');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'booklover@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(40100);
    });

    it('should return 403 for banned user', async () => {
      await db.read();
      const user = db.data.users.find(u => u.email === 'booklover@example.com')!;
      user.status = 'banned';
      await db.write();

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'booklover@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(40300);

      await db.read();
      const userToRestore = db.data.users.find(u => u.email === 'booklover@example.com')!;
      userToRestore.status = 'active';
      await db.write();
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(42200);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set(AUTH_HEADERS.booklover);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('username', 'booklover');
      expect(res.body.data).toHaveProperty('email', 'booklover@example.com');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('points');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with token signed by wrong secret', async () => {
      const fakeToken = jwt.sign(
        { id: 2, username: 'booklover', email: 'booklover@example.com', role: 'user' },
        'wrong-secret'
      );
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should accept a manually signed token using JWT_SECRET', async () => {
      const token = jwt.sign(
        { id: 2, username: 'booklover', email: 'booklover@example.com', role: 'user' },
        JWT_SECRET
      );
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.username).toBe('booklover');
    });
  });
});
