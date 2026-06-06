import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await db.read();

  let userWishlists = db.data.wishlists.filter(w => w.user_id === req.user!.id);

  if (userWishlists.length === 0) {
    const newId = Math.max(0, ...db.data.wishlists.map(w => w.id)) + 1;
    const defaultWishlist = {
      id: newId,
      user_id: req.user.id,
      name: '默认心愿单',
      description: '我的收藏',
      is_default: true,
      created_at: new Date().toISOString()
    };
    db.data.wishlists.push(defaultWishlist);
    await db.write();
    userWishlists = [defaultWishlist];
  }

  const wishlists = userWishlists
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .map(wishlist => {
      const items = db.data.wishlistItems.filter(i => i.wishlist_id === wishlist.id);
      return {
        ...wishlist,
        book_count: items.length
      };
    });

  res.json(wishlists);
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '心愿单名称不能为空' });
  }

  await db.read();

  const existingWishlist = db.data.wishlists.find(
    w => w.user_id === req.user!.id && w.name === name.trim()
  );
  if (existingWishlist) {
    return res.status(400).json({ error: '心愿单名称已存在' });
  }

  const newId = Math.max(0, ...db.data.wishlists.map(w => w.id)) + 1;

  const newWishlist = {
    id: newId,
    user_id: req.user.id,
    name: name.trim(),
    description: description || '',
    is_default: false,
    created_at: new Date().toISOString()
  };

  db.data.wishlists.push(newWishlist);
  await db.write();

  res.status(201).json({ ...newWishlist, book_count: 0 });
});

router.get('/check/:bookId', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { bookId } = req.params;

  await db.read();

  const userWishlists = db.data.wishlists.filter(w => w.user_id === req.user!.id);
  const userWishlistIds = userWishlists.map(w => w.id);

  const items = db.data.wishlistItems.filter(
    i => userWishlistIds.includes(i.wishlist_id) && i.book_id === parseInt(bookId)
  );

  const wishlistIdsWithBook = items.map(i => i.wishlist_id);
  const wishlistsWithBook = userWishlists.filter(w => wishlistIdsWithBook.includes(w.id));

  res.json({
    is_in_wishlist: items.length > 0,
    wishlists: wishlistsWithBook
  });
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();

  const wishlist = db.data.wishlists.find(
    w => w.id === parseInt(id) && w.user_id === req.user!.id
  );

  if (!wishlist) {
    return res.status(404).json({ error: '心愿单不存在' });
  }

  const items = db.data.wishlistItems
    .filter(i => i.wishlist_id === parseInt(id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const books = items.map(item => {
    const book = db.data.books.find(b => b.id === item.book_id);
    if (!book) return null;

    const holder = db.data.users.find(u => u.id === book.current_holder_id);
    const isAvailable = book.status === 'available' && book.current_holder_id !== req.user!.id;

    return {
      ...book,
      holder_name: holder?.username,
      holder_avatar: holder?.avatar,
      is_looking_for: isAvailable,
      added_at: item.created_at
    };
  }).filter(Boolean);

  res.json({
    ...wishlist,
    books,
    book_count: books.length
  });
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { name, description } = req.body;

  await db.read();

  const wishlistIndex = db.data.wishlists.findIndex(
    w => w.id === parseInt(id) && w.user_id === req.user!.id
  );

  if (wishlistIndex === -1) {
    return res.status(404).json({ error: '心愿单不存在' });
  }

  if (name && name.trim()) {
    const existingWishlist = db.data.wishlists.find(
      w => w.user_id === req.user!.id && w.name === name.trim() && w.id !== parseInt(id)
    );
    if (existingWishlist) {
      return res.status(400).json({ error: '心愿单名称已存在' });
    }
    db.data.wishlists[wishlistIndex].name = name.trim();
  }

  if (description !== undefined) {
    db.data.wishlists[wishlistIndex].description = description;
  }

  await db.write();

  const items = db.data.wishlistItems.filter(i => i.wishlist_id === parseInt(id));

  res.json({
    ...db.data.wishlists[wishlistIndex],
    book_count: items.length
  });
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;

  await db.read();

  const wishlistIndex = db.data.wishlists.findIndex(
    w => w.id === parseInt(id) && w.user_id === req.user!.id
  );

  if (wishlistIndex === -1) {
    return res.status(404).json({ error: '心愿单不存在' });
  }

  if (db.data.wishlists[wishlistIndex].is_default) {
    return res.status(400).json({ error: '默认心愿单不能删除' });
  }

  db.data.wishlistItems = db.data.wishlistItems.filter(i => i.wishlist_id !== parseInt(id));

  db.data.wishlists.splice(wishlistIndex, 1);
  await db.write();

  res.json({ message: '心愿单已删除' });
});

router.post('/:id/items', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { book_id } = req.body;

  if (!book_id) {
    return res.status(400).json({ error: 'book_id is required' });
  }

  await db.read();

  const wishlist = db.data.wishlists.find(
    w => w.id === parseInt(id) && w.user_id === req.user!.id
  );

  if (!wishlist) {
    return res.status(404).json({ error: '心愿单不存在' });
  }

  const book = db.data.books.find(b => b.id === book_id);
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const existingItem = db.data.wishlistItems.find(
    i => i.wishlist_id === parseInt(id) && i.book_id === book_id
  );
  if (existingItem) {
    return res.status(400).json({ error: '该书已在心愿单中' });
  }

  const newId = Math.max(0, ...db.data.wishlistItems.map(i => i.id)) + 1;

  const newItem = {
    id: newId,
    wishlist_id: parseInt(id),
    book_id: book_id,
    created_at: new Date().toISOString()
  };

  db.data.wishlistItems.push(newItem);
  await db.write();

  res.status(201).json(newItem);
});

router.delete('/:id/items/:bookId', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id, bookId } = req.params;

  await db.read();

  const wishlist = db.data.wishlists.find(
    w => w.id === parseInt(id) && w.user_id === req.user!.id
  );

  if (!wishlist) {
    return res.status(404).json({ error: '心愿单不存在' });
  }

  const itemIndex = db.data.wishlistItems.findIndex(
    i => i.wishlist_id === parseInt(id) && i.book_id === parseInt(bookId)
  );

  if (itemIndex === -1) {
    return res.status(404).json({ error: '该书不在心愿单中' });
  }

  db.data.wishlistItems.splice(itemIndex, 1);
  await db.write();

  res.json({ message: '已从心愿单中移除' });
});

router.post('/:id/items/batch-remove', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  const { book_ids } = req.body;

  if (!book_ids || !Array.isArray(book_ids)) {
    return res.status(400).json({ error: 'book_ids must be an array' });
  }

  await db.read();

  const wishlist = db.data.wishlists.find(
    w => w.id === parseInt(id) && w.user_id === req.user!.id
  );

  if (!wishlist) {
    return res.status(404).json({ error: '心愿单不存在' });
  }

  db.data.wishlistItems = db.data.wishlistItems.filter(
    i => !(i.wishlist_id === parseInt(id) && book_ids.includes(i.book_id))
  );

  await db.write();

  res.json({ message: '批量移除成功' });
});

export default router;
