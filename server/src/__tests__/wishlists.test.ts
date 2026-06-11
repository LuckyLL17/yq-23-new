import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import './setup';
import wishlistRoutes from '../routes/wishlists';

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
  app.use('/api/wishlists', wishlistRoutes);
  return app;
}

let app: express.Express;

beforeAll(() => {
  app = createApp();
});

describe('Wishlist API', () => {
  describe('GET /api/wishlists', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/wishlists');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/wishlists')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('should return wishlists for authenticated user', async () => {
      const res = await request(app)
        .get('/api/wishlists')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create default wishlist if user has none', async () => {
      const res = await request(app)
        .get('/api/wishlists')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const defaultWl = res.body.data.find((w: any) => w.is_default);
      expect(defaultWl).toBeDefined();
      expect(defaultWl.name).toBe('默认心愿单');
    });

    it('should include book_count in each wishlist', async () => {
      const res = await request(app)
        .get('/api/wishlists')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      res.body.data.forEach((w: any) => {
        expect(w).toHaveProperty('book_count');
        expect(typeof w.book_count).toBe('number');
      });
    });

    it('should sort default wishlist first', async () => {
      const res = await request(app)
        .get('/api/wishlists')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      if (res.body.data.length > 1) {
        expect(res.body.data[0].is_default).toBe(true);
      }
    });
  });

  describe('POST /api/wishlists', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/wishlists').send({ name: 'Test' });
      expect(res.status).toBe(401);
    });

    it('should create a new wishlist', async () => {
      const res = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.booklover)
        .send({ name: '科幻书单', description: '我喜欢的科幻书' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.name).toBe('科幻书单');
      expect(res.body.data.description).toBe('我喜欢的科幻书');
      expect(res.body.data.is_default).toBe(false);
      expect(res.body.data.book_count).toBe(0);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.booklover)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 when name is empty string', async () => {
      const res = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.booklover)
        .send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when wishlist name already exists', async () => {
      await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Duplicate Name' });
      const res = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Duplicate Name' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should create wishlist without description', async () => {
      const res = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'No Desc Wishlist' });
      expect(res.status).toBe(201);
      expect(res.body.data.description).toBe('');
    });
  });

  describe('GET /api/wishlists/check/:bookId', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/wishlists/check/1');
      expect(res.status).toBe(401);
    });

    it('should return is_in_wishlist false for book not in wishlist', async () => {
      const res = await request(app)
        .get('/api/wishlists/check/5')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.is_in_wishlist).toBe(false);
    });

    it('should return is_in_wishlist true for book in wishlist', async () => {
      const res = await request(app)
        .get('/api/wishlists/check/2')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.data.is_in_wishlist).toBe(true);
    });

    it('should return wishlists containing the book', async () => {
      const res = await request(app)
        .get('/api/wishlists/check/2')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.wishlists)).toBe(true);
    });

    it('should return 422 for invalid bookId', async () => {
      const res = await request(app)
        .get('/api/wishlists/check/abc')
        .set(authHeaders.admin);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/wishlists/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/wishlists/1');
      expect(res.status).toBe(401);
    });

    it('should return wishlist detail with books', async () => {
      const res = await request(app)
        .get('/api/wishlists/1')
        .set(authHeaders.admin);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('books');
      expect(res.body.data).toHaveProperty('book_count');
      expect(Array.isArray(res.body.data.books)).toBe(true);
    });

    it('should return 404 for non-existent wishlist', async () => {
      const res = await request(app)
        .get('/api/wishlists/9999')
        .set(authHeaders.admin);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40400);
    });

    it('should return 404 for wishlist belonging to another user', async () => {
      const res = await request(app)
        .get('/api/wishlists/1')
        .set(authHeaders.booklover);
      expect(res.status).toBe(404);
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app)
        .get('/api/wishlists/abc')
        .set(authHeaders.admin);
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/wishlists/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).put('/api/wishlists/1').send({ name: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should update wishlist name', async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.bibliophile)
        .send({ name: 'To Update Wishlist' });
      const wishlistId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/wishlists/${wishlistId}`)
        .set(authHeaders.bibliophile)
        .send({ name: 'Updated Wishlist Name' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.name).toBe('Updated Wishlist Name');
    });

    it('should update wishlist description', async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.bibliophile)
        .send({ name: 'Desc Update Test' });
      const wishlistId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/wishlists/${wishlistId}`)
        .set(authHeaders.bibliophile)
        .send({ description: 'New description' });
      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('New description');
    });

    it('should return 404 for non-existent wishlist', async () => {
      const res = await request(app)
        .put('/api/wishlists/9999')
        .set(authHeaders.admin)
        .send({ name: 'New Name' });
      expect(res.status).toBe(404);
    });

    it('should return 404 for wishlist belonging to another user', async () => {
      const res = await request(app)
        .put('/api/wishlists/1')
        .set(authHeaders.booklover)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(404);
    });

    it('should return 400 when updating name to a duplicate', async () => {
      await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Unique Name A' });
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Unique Name B' });
      const wishlistId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/wishlists/${wishlistId}`)
        .set(authHeaders.reader123)
        .send({ name: 'Unique Name A' });
      expect(res.status).toBe(400);
    });

    it('should return 422 for invalid id param', async () => {
      const res = await request(app)
        .put('/api/wishlists/abc')
        .set(authHeaders.admin)
        .send({ name: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/wishlists/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete('/api/wishlists/1');
      expect(res.status).toBe(401);
    });

    it('should delete a non-default wishlist', async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.bibliophile)
        .send({ name: 'ToDelete Wishlist' });
      const wishlistId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/wishlists/${wishlistId}`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('心愿单已删除');
    });

    it('should return 400 when deleting default wishlist', async () => {
      const listRes = await request(app)
        .get('/api/wishlists')
        .set(authHeaders.admin);
      const defaultWl = listRes.body.data.find((w: any) => w.is_default);
      expect(defaultWl).toBeDefined();

      const res = await request(app)
        .delete(`/api/wishlists/${defaultWl.id}`)
        .set(authHeaders.admin);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 404 for non-existent wishlist', async () => {
      const res = await request(app)
        .delete('/api/wishlists/9999')
        .set(authHeaders.admin);
      expect(res.status).toBe(404);
    });

    it('should return 404 for wishlist belonging to another user', async () => {
      const listRes = await request(app)
        .get('/api/wishlists')
        .set(authHeaders.admin);
      const wl = listRes.body.data[0];

      const res = await request(app)
        .delete(`/api/wishlists/${wl.id}`)
        .set(authHeaders.booklover);
      expect(res.status).toBe(404);
    });

    it('should remove associated items when deleting wishlist', async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Wishlist With Items' });
      const wishlistId = createRes.body.data.id;

      await request(app)
        .post(`/api/wishlists/${wishlistId}/items`)
        .set(authHeaders.reader123)
        .send({ book_id: 1 });

      const deleteRes = await request(app)
        .delete(`/api/wishlists/${wishlistId}`)
        .set(authHeaders.reader123);
      expect(deleteRes.status).toBe(200);

      const detailRes = await request(app)
        .get(`/api/wishlists/${wishlistId}`)
        .set(authHeaders.reader123);
      expect(detailRes.status).toBe(404);
    });
  });

  describe('POST /api/wishlists/:id/items', () => {
    let testWishlistId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Items Test Wishlist' });
      testWishlistId = createRes.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .send({ book_id: 1 });
      expect(res.status).toBe(401);
    });

    it('should add a book to wishlist', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.reader123)
        .send({ book_id: 1 });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.book_id).toBe(1);
      expect(res.body.data.wishlist_id).toBe(testWishlistId);
    });

    it('should return 400 when adding duplicate book', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.reader123)
        .send({ book_id: 1 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(40000);
    });

    it('should return 400 when book_id is missing', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.reader123)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent book', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.reader123)
        .send({ book_id: 9999 });
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent wishlist', async () => {
      const res = await request(app)
        .post('/api/wishlists/9999/items')
        .set(authHeaders.reader123)
        .send({ book_id: 1 });
      expect(res.status).toBe(404);
    });

    it('should return 404 for wishlist belonging to another user', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.bibliophile)
        .send({ book_id: 2 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/wishlists/:id/items/:bookId', () => {
    let testWishlistId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.bibliophile)
        .send({ name: 'Remove Item Test Wishlist' });
      testWishlistId = createRes.body.data.id;

      await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.bibliophile)
        .send({ book_id: 3 });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).delete(`/api/wishlists/${testWishlistId}/items/3`);
      expect(res.status).toBe(401);
    });

    it('should remove a book from wishlist', async () => {
      const res = await request(app)
        .delete(`/api/wishlists/${testWishlistId}/items/3`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('已从心愿单中移除');
    });

    it('should return 404 for book not in wishlist', async () => {
      const res = await request(app)
        .delete(`/api/wishlists/${testWishlistId}/items/999`)
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent wishlist', async () => {
      const res = await request(app)
        .delete('/api/wishlists/9999/items/1')
        .set(authHeaders.bibliophile);
      expect(res.status).toBe(404);
    });

    it('should return 404 for wishlist belonging to another user', async () => {
      const res = await request(app)
        .delete(`/api/wishlists/${testWishlistId}/items/1`)
        .set(authHeaders.reader123);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/wishlists/:id/items/batch-remove', () => {
    let testWishlistId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/wishlists')
        .set(authHeaders.reader123)
        .send({ name: 'Batch Remove Test Wishlist' });
      testWishlistId = createRes.body.data.id;

      await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.reader123)
        .send({ book_id: 2 });
      await request(app)
        .post(`/api/wishlists/${testWishlistId}/items`)
        .set(authHeaders.reader123)
        .send({ book_id: 4 });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items/batch-remove`)
        .send({ book_ids: [2, 4] });
      expect(res.status).toBe(401);
    });

    it('should batch remove books from wishlist', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items/batch-remove`)
        .set(authHeaders.reader123)
        .send({ book_ids: [2, 4] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.message).toBe('批量移除成功');
    });

    it('should return 400 when book_ids is not an array', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items/batch-remove`)
        .set(authHeaders.reader123)
        .send({ book_ids: 'not_array' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when book_ids is missing', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items/batch-remove`)
        .set(authHeaders.reader123)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent wishlist', async () => {
      const res = await request(app)
        .post('/api/wishlists/9999/items/batch-remove')
        .set(authHeaders.reader123)
        .send({ book_ids: [1] });
      expect(res.status).toBe(404);
    });

    it('should return 404 for wishlist belonging to another user', async () => {
      const res = await request(app)
        .post(`/api/wishlists/${testWishlistId}/items/batch-remove`)
        .set(authHeaders.bibliophile)
        .send({ book_ids: [1] });
      expect(res.status).toBe(404);
    });
  });
});
