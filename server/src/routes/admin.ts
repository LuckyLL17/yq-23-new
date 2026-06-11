import { Router } from 'express';
import db, { User, Book, Exchange, Post, Donation, ReadingClub } from '../database';
import { adminMiddleware, AuthRequest } from '../middleware/auth';
import { success, created, badRequest, unauthorized, forbidden, notFound } from '../utils/response';
import { validate, validateIdParam, validatePagination } from '../middleware/validate';

interface StatsResponse {
  totalUsers: number;
  totalBooks: number;
  totalExchanges: number;
  totalPosts: number;
  pendingBooks: number;
  pendingDonations: number;
  activeUsers: number;
  bannedUsers: number;
  booksByCategory: Record<string, number>;
  exchangesByStatus: Record<string, number>;
}

interface BookWithOwner extends Book {
  owner_name?: string;
  owner_email?: string;
}

interface PaginatedBooksResponse {
  books: BookWithOwner[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface RejectBookBody {
  reason: string;
}

interface UpdateBookBody {
  title?: string;
  author?: string;
  cover?: string;
  description?: string;
  isbn?: string;
  category?: string;
  condition?: string;
  points_required?: number;
  status?: string;
}

interface UserWithStats {
  id: number;
  username: string;
  email: string;
  points: number;
  role: string;
  status: string;
  avatar?: string;
  bio?: string;
  created_at: string;
  book_count: number;
  exchange_count: number;
}

interface PaginatedUsersResponse {
  users: UserWithStats[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface BanUserBody {
  reason?: string;
}

interface UpdateUserRoleBody {
  role: string;
}

interface UpdateUserPointsBody {
  points: number;
  reason?: string;
}

interface ExchangeWithDetails extends Exchange {
  book_title?: string;
  book_cover?: string;
  requester_name?: string;
  owner_name?: string;
}

interface PaginatedExchangesResponse {
  exchanges: ExchangeWithDetails[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface PostWithAuthor extends Post {
  author_name?: string;
}

interface PaginatedPostsResponse {
  posts: PostWithAuthor[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface DonationWithUser extends Donation {
  username?: string;
  user_email?: string;
}

interface PaginatedDonationsResponse {
  donations: DonationWithUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface RejectDonationBody {
  reason?: string;
}

interface ReadingClubWithDetails extends ReadingClub {
  organizer_name?: string;
  participant_count: number;
}

interface PaginatedReadingClubsResponse {
  clubs: ReadingClubWithDetails[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface MessageResponse {
  message: string;
}

interface BookResponse {
  message: string;
  book: Book;
}

interface PointsResponse {
  message: string;
  points: number;
}

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

  success(res, stats);
});

router.get('/books', adminMiddleware, validatePagination(), async (req: AuthRequest, res) => {
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

  success(res, {
    books: booksWithOwner,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.post('/books/:id/approve', adminMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return notFound(res, 'Book not found');
  }

  if (book.approval_status === 'approved') {
    return badRequest(res, 'Book already approved');
  }

  const previousStatus = book.approval_status as Book['approval_status'];
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

  success(res, { message: 'Book approved successfully', book });
});

router.post('/books/:id/reject', adminMiddleware, validateIdParam(), validate({
  body: {
    reason: { type: 'string', required: true }
  }
}), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return notFound(res, 'Book not found');
  }

  book.approval_status = 'rejected';
  book.rejection_reason = reason;
  book.reviewed_by = req.user!.id;
  book.reviewed_at = new Date().toISOString();

  await db.write();

  success(res, { message: 'Book rejected successfully', book });
});

router.delete('/books/:id', adminMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const bookIndex = db.data.books.findIndex(b => b.id === parseInt(id));

  if (bookIndex === -1) {
    return notFound(res, 'Book not found');
  }

  db.data.books.splice(bookIndex, 1);
  await db.write();

  success(res, { message: 'Book deleted successfully' });
});

router.put('/books/:id', adminMiddleware, validateIdParam(), validate({
  body: {
    title: { type: 'string' },
    author: { type: 'string' },
    cover: { type: 'string' },
    description: { type: 'string' },
    isbn: { type: 'string' },
    category: { type: 'string' },
    condition: { type: 'string' },
    points_required: { type: 'number', min: 0 },
    status: { type: 'string' }
  }
}), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, author, cover, description, isbn, category, condition, points_required, status } = req.body;

  await db.read();
  const book = db.data.books.find(b => b.id === parseInt(id));

  if (!book) {
    return notFound(res, 'Book not found');
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

  success(res, book);
});

router.get('/users', adminMiddleware, validatePagination(), async (req: AuthRequest, res) => {
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

  success(res, {
    users: usersWithStats,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.put('/users/:id/ban', adminMiddleware, validateIdParam(), validate({
  body: {
    reason: { type: 'string' }
  }
}), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return notFound(res, 'User not found');
  }

  if (user.role === 'admin') {
    return badRequest(res, 'Cannot ban an admin user');
  }

  user.status = 'banned';
  await db.write();

  success(res, { message: 'User banned successfully' });
});

router.put('/users/:id/unban', adminMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return notFound(res, 'User not found');
  }

  user.status = 'active';
  await db.write();

  success(res, { message: 'User unbanned successfully' });
});

router.put('/users/:id/role', adminMiddleware, validateIdParam(), validate({
  body: {
    role: { type: 'string', required: true, enum: ['user', 'admin'] }
  }
}), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return badRequest(res, 'Invalid role');
  }

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return notFound(res, 'User not found');
  }

  user.role = role;
  await db.write();

  success(res, { message: 'User role updated successfully' });
});

router.put('/users/:id/points', adminMiddleware, validateIdParam(), validate({
  body: {
    points: { type: 'number', required: true },
    reason: { type: 'string' }
  }
}), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { points, reason } = req.body;

  if (points === undefined || isNaN(points)) {
    return badRequest(res, 'Points value is required');
  }

  await db.read();
  const user = db.data.users.find(u => u.id === parseInt(id));

  if (!user) {
    return notFound(res, 'User not found');
  }

  user.points = parseInt(points);
  await db.write();

  success(res, { message: 'User points updated successfully', points: user.points });
});

router.get('/exchanges', adminMiddleware, validatePagination(), async (req: AuthRequest, res) => {
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

  success(res, {
    exchanges: exchangesWithDetails,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.get('/posts', adminMiddleware, validatePagination(), async (req: AuthRequest, res) => {
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

  success(res, {
    posts: postsWithAuthor,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.delete('/posts/:id', adminMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const postIndex = db.data.posts.findIndex(p => p.id === parseInt(id));

  if (postIndex === -1) {
    return notFound(res, 'Post not found');
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

  success(res, { message: 'Post deleted successfully' });
});

router.get('/donations', adminMiddleware, validatePagination(), async (req: AuthRequest, res) => {
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

  success(res, {
    donations: donationsWithUser,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.post('/donations/:id/approve', adminMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const donation = db.data.donations.find(d => d.id === parseInt(id));

  if (!donation) {
    return notFound(res, 'Donation not found');
  }

  donation.status = 'approved';
  donation.reviewed_at = new Date().toISOString();
  donation.reviewed_by = req.user!.id;

  await db.write();

  success(res, { message: 'Donation approved successfully' });
});

router.post('/donations/:id/reject', adminMiddleware, validateIdParam(), validate({
  body: {
    reason: { type: 'string' }
  }
}), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await db.read();
  const donation = db.data.donations.find(d => d.id === parseInt(id));

  if (!donation) {
    return notFound(res, 'Donation not found');
  }

  donation.status = 'rejected';
  donation.reviewed_at = new Date().toISOString();
  donation.reviewed_by = req.user!.id;

  await db.write();

  success(res, { message: 'Donation rejected successfully' });
});

router.get('/reading-clubs', adminMiddleware, validatePagination(), async (req: AuthRequest, res) => {
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

  success(res, {
    clubs: clubsWithDetails,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize)
  });
});

router.delete('/reading-clubs/:id', adminMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.read();
  const clubIndex = db.data.readingClubs.findIndex(c => c.id === parseInt(id));

  if (clubIndex === -1) {
    return notFound(res, 'Reading club not found');
  }

  db.data.readingClubs.splice(clubIndex, 1);
  db.data.readingClubParticipants = db.data.readingClubParticipants.filter(p => p.club_id !== parseInt(id));

  await db.write();

  success(res, { message: 'Reading club deleted successfully' });
});

export default router;
