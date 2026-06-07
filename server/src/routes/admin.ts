import { Router } from 'express';
import db from '../database';
import { adminMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', adminMiddleware, async (_req, res) => {
  await db.read();

  const stats = {
    totalUsers: db.data.users.length,
    totalBooks: db.data.books.length,
    totalExchanges: db.data.exchanges.length,
    totalPosts: db.data.posts.length,
    pendingBooks: db.data.books.filter(b => b.approval_status === 'pending').length,
    pendingDonations: db.data.donations.filter(d => d.status === 'pending').length,
    activeUsers: db.data.users.filter(u => u.status === 'active').length,
    bannedUsers: db.data.users.filter(u => u.status === 'banned').length,
    booksByCategory: {} as Record<string, number>,
    exchangesByStatus: {} as Record<string, number>
  };

  for (const book of db.data.books) {
    const cat = book.category || '未分类';
    stats.booksByCategory[cat] = (stats.booksByCategory[cat] || 0) + 1;
  }

  for (const exchange of db.data.exchanges) {
    stats.exchangesByStatus[exchange.status] = (stats.exchangesByStatus[exchange.status] || 0) + 1;
  }

  res.json(stats);
});

router.get('/books', adminMiddleware, async (req: AuthRequest, res) => {
  const { approval_status, search, sort_by, sort_order, page = 1, page_size = 20 } = req.query;

  await db.read();

  let books = [...db.data.books];

  if (approval_status) {
    books = books.filter(b => b.approval_status === approval_status);
  }

  if (search) {
    const searchStr = search as string;
    books = books.filter(b =>
      b.title.toLowerCase().includes(searchStr.toLowerCase()) ||
      b.author.toLowerCase().includes(searchStr.toLowerCase())
    );
  }

  const sortField = sort_by as string;
  const sortDir = (sort_order as string) === 'asc' ? 1 : -1;

  if (sortField === 'created_at') {
    books.sort((a, b) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * sortDir);
  } else {
    books.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = books.length;
  const pageNum = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const start = (pageNum - 1) * pageSize;
  const paginatedBooks = books.slice(start, start + pageSize);

  const booksWithOwner = paginatedBooks.map(book => {
    const owner = db.data.users.find(u => u.id === book.owner_id);
    return {
      ...book,
      owner_name: owner?.username,
      owner_email: owner?.email
    };
  });

  res.json({
    books: booksWithOwner,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.post('/books/:id/approve', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (book.approval_status === 'approved') {
    return res.status(400).json({ error: 'Book already approved' });
  }

  const previousStatus = book.approval_status;
  book.approval_status = 'approved';
  book.reviewed_by = req.user!.id;
  book.reviewed_at = new Date().toISOString();
  book.rejection_reason = undefined;

  if (previousStatus !== 'approved') {
    const user = db.data.users.find(u => u.id === book.owner_id);
    if (user) {
      user.points += book.points_required;
    }
  }

  await db.write();

  res.json({ message: 'Book approved successfully', book });
});

router.post('/books/:id/reject', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  book.approval_status = 'rejected';
  book.rejection_reason = reason;
  book.reviewed_by = req.user!.id;
  book.reviewed_at = new Date().toISOString();

  await db.write();

  res.json({ message: 'Book rejected successfully', book });
});

router.delete('/books/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const bookIndex = db.data.books.findIndex(b => b.id === parseInt(id));

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  db.data.books.splice(bookIndex, 1);
  await db.write();

  res.json({ message: 'Book deleted successfully' });
});

router.put('/books/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, author, cover, description, isbn, category, condition, points_required, status } = req.body;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (cover !== undefined) book.cover = cover;
  if (description !== undefined) book.description = description;
  if (isbn !== undefined) book.isbn = isbn;
  if (category !== undefined) book.category = category;
  if (condition !== undefined) book.condition = condition;
  if (points_required !== undefined) book.points_required = points_required;
  if (status !== undefined) book.status = status;

  await db.write();

  res.json(book);
});

router.get('/users', adminMiddleware, async (req: AuthRequest, res) => {
  const { search, status, role, sort_by, sort_order, page = 1, page_size = 20 } = req.query;

  await db.read();

  let users = [...db.data.users];

  if (search) {
    const searchStr = search as string;
    users = users.filter(u =>
      u.username.toLowerCase().includes(searchStr.toLowerCase()) ||
      u.email.toLowerCase().includes(searchStr.toLowerCase())
    );
  }

  if (status) {
    users = users.filter(u => u.status === status);
  }

  if (role) {
    users = users.filter(u => u.role === role);
  }

  const sortField = sort_by as string;
  const sortDir = (sort_order as string) === 'asc' ? 1 : -1;

  if (sortField === 'username') {
    users.sort((a, b) => a.username.localeCompare(b.username) * sortDir);
  } else if (sortField === 'points') {
    users.sort((a, b) => (a.points - b.points) * sortDir);
  } else {
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = users.length;
  const pageNum = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const start = (pageNum - 1) * pageSize;
  const paginatedUsers = users.slice(start, start + pageSize);

  const usersWithStats = paginatedUsers.map(user => {
    const bookCount = db.data.books.filter(b => b.owner_id === user.id).length;
    const exchangeCount = db.data.exchanges.filter(
      e => e.requester_id === user.id || e.owner_id === user.id
    ).length;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      points: user.points,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      bio: user.bio,
      created_at: user.created_at,
      book_count: bookCount,
      exchange_count: exchangeCount
    };
  });

  res.json({
    users: usersWithStats,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.put('/users/:id/ban', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot ban an admin user' });
  }

  user.status = 'banned';
  await db.write();

  res.json({ message: 'User banned successfully' });
});

router.put('/users/:id/unban', adminMiddleware, async (_req, res) => {
  const { id } = req.params;

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.status = 'active';
  await db.write();

  res.json({ message: 'User unbanned successfully' });
});

router.put('/users/:id/role', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.role = role;
  await db.write();

  res.json({ message: 'User role updated successfully' });
});

router.put('/users/:id/points', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { points, reason } = req.body;

  if (points === undefined || isNaN(points)) {
    return res.status(400).json({ error: 'Points value is required' });
  }

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.points = parseInt(points);
  await db.write();

  res.json({ message: 'User points updated successfully', points: user.points });
});

router.get('/exchanges', adminMiddleware, async (req: AuthRequest, res) => {
  const { status, search, sort_by, sort_order, page = 1, page_size = 20 } = req.query;

  await db.read();

  let exchanges = [...db.data.exchanges];

  if (status) {
    exchanges = exchanges.filter(e => e.status === status);
  }

  const total = exchanges.length;
  const pageNum = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const start = (pageNum - 1) * pageSize;
  const paginatedExchanges = exchanges.slice(start, start + pageSize);

  const exchangesWithDetails = paginatedExchanges.map(exchange => {
    const book = db.data.books.find(b => b.id === exchange.book_id);
    const requester = db.data.users.find(u => u.id === exchange.requester_id);
    const owner = db.data.users.find(u => u.id === exchange.owner_id);

    return {
      ...exchange,
      book_title: book?.title,
      book_cover: book?.cover,
      requester_name: requester?.username,
      owner_name: owner?.username
    };
  });

  res.json({
    exchanges: exchangesWithDetails,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.get('/posts', adminMiddleware, async (req: AuthRequest, res) => {
  const { search, sort_by, sort_order, page = 1, page_size = 20 } = req.query;

  await db.read();

  let posts = [...db.data.posts];

  if (search) {
    const searchStr = search as string;
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(searchStr.toLowerCase()) ||
      p.content.toLowerCase().includes(searchStr.toLowerCase())
    );
  }

  const total = posts.length;
  const pageNum = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const start = (pageNum - 1) * pageSize;
  const paginatedPosts = posts.slice(start, start + pageSize);

  const postsWithAuthor = paginatedPosts.map(post => {
    const author = db.data.users.find(u => u.id === post.author_id);
    return {
      ...post,
      author_name: author?.username
    };
  });

  res.json({
    posts: postsWithAuthor,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.delete('/posts/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const postIndex = db.data.posts.findIndex(p => p.id === parseInt(id));

  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const post = db.data.posts[postIndex];
  db.data.posts.splice(postIndex, 1);

  db.data.comments = db.data.comments.filter(c => c.post_id !== post.id);
  db.data.postLikes = db.data.postLikes.filter(l => l.post_id !== post.id);

  for (const topicId of post.topic_ids) {
    const topic = db.data.topics.find(t => t.id === topicId);
    if (topic) {
      topic.post_count = Math.max(0, topic.post_count - 1);
    }
  }

  await db.write();

  res.json({ message: 'Post deleted successfully' });
});

router.get('/donations', adminMiddleware, async (req: AuthRequest, res) => {
  const { status, page = 1, page_size = 20 } = req.query;

  await db.read();

  let donations = [...db.data.donations];

  if (status) {
    donations = donations.filter(d => d.status === status);
  }

  donations.sort((a, b) => new Date(b.donated_at).getTime() - new Date(a.donated_at).getTime());

  const total = donations.length;
  const pageNum = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const start = (pageNum - 1) * pageSize;
  const paginatedDonations = donations.slice(start, start + pageSize);

  const donationsWithUser = paginatedDonations.map(donation => {
    const user = db.data.users.find(u => u.id === donation.user_id);
    return {
      ...donation,
      username: user?.username,
      user_email: user?.email
    };
  });

  res.json({
    donations: donationsWithUser,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.post('/donations/:id/approve', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const donation = db.data.donations.find(d => d.id === parseInt(id));

  if (!donation) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  donation.status = 'approved';
  donation.reviewed_at = new Date().toISOString();
  donation.reviewed_by = req.user!.id;

  await db.write();

  res.json({ message: 'Donation approved successfully' });
});

router.post('/donations/:id/reject', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await db.read();
  const donation = db.data.donations.find(d => d.id === parseInt(id));

  if (!donation) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  donation.status = 'rejected';
  donation.reviewed_at = new Date().toISOString();
  donation.reviewed_by = req.user!.id;

  await db.write();

  res.json({ message: 'Donation rejected successfully' });
});

router.get('/reading-clubs', adminMiddleware, async (req: AuthRequest, res) => {
  const { status, page = 1, page_size = 20 } = req.query;

  await db.read();

  let clubs = [...db.data.readingClubs];

  if (status) {
    clubs = clubs.filter(c => c.status === status);
  }

  const total = clubs.length;
  const pageNum = parseInt(page as string);
  const pageSize = parseInt(page_size as string);
  const start = (pageNum - 1) * pageSize;
  const paginatedClubs = clubs.slice(start, start + pageSize);

  const clubsWithDetails = paginatedClubs.map(club => {
    const organizer = db.data.users.find(u => u.id === club.organizer_id);
    const participantCount = db.data.readingClubParticipants.filter(
      p => p.club_id === club.id && p.status === 'registered'
    ).length;
    return {
      ...club,
      organizer_name: organizer?.username,
      participant_count: participantCount
    };
  });

  res.json({
    clubs: clubsWithDetails,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.delete('/reading-clubs/:id', adminMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const clubIndex = db.data.readingClubs.findIndex(c => c.id === parseInt(id));

  if (clubIndex === -1) {
    return res.status(404).json({ error: 'Reading club not found' });
  }

  db.data.readingClubs.splice(clubIndex, 1);
  db.data.readingClubParticipants = db.data.readingClubParticipants.filter(p => p.club_id !== parseInt(id));

  await db.write();

  res.json({ message: 'Reading club deleted successfully' });
});

export default router;
