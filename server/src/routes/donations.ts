import { Router } from 'express';
import db, { Donation, DonationCertificate, User } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, created, badRequest, unauthorized, notFound } from '../utils/response';
import { validate, validateIdParam, validatePagination } from '../middleware/validate';

const router = Router();

interface CreateDonationBody {
  book_id?: number;
  book_title: string;
  book_author: string;
  book_cover?: string;
  book_category?: string;
  book_condition: string;
  quantity?: number;
  message?: string;
}

interface DonationWithCertificate extends Donation {
  certificate_no?: string;
  certificate_issued_at?: string;
}

interface DonationWithUser extends Donation {
  username?: string;
  user_avatar?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface DonationListResponse {
  donations: DonationWithCertificate[] | DonationWithUser[];
  pagination: PaginationInfo;
}

interface MyDonationListResponse {
  donations: DonationWithCertificate[];
  pagination: PaginationInfo;
}

interface RankingItem {
  user_id: number;
  total_books: number;
  total_donations: number;
  username?: string;
  user_avatar?: string;
}

interface RankingResponse {
  rankings: RankingItem[];
  period: string;
  type: string;
  total_users: number;
}

interface DonationStatsResponse {
  total_books: number;
  total_donations: number;
  total_certificates: number;
  global_total_books: number;
  my_rank: number;
  total_donors: number;
}

interface DonationDetailResponse extends Donation {
  username?: string;
  user_avatar?: string;
  certificate_no?: string;
  certificate_issued_at?: string;
}

interface CertificateDonationInfo {
  id: number;
  book_title: string;
  book_author: string;
  book_category?: string;
  book_condition: string;
  quantity: number;
  message?: string;
  donated_at: string;
}

interface CertificateUserInfo {
  id?: number;
  username?: string;
}

interface CertificateResponse {
  certificate_no: string;
  issued_at: string;
  donation: CertificateDonationInfo;
  user: CertificateUserInfo;
}

function generateCertificateNo(userId: number, donationId: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DON-${year}${month}${day}-${userId}-${donationId}-${random}`;
}

const createDonationSchema = {
  body: {
    book_title: { type: 'string' as const, required: true, min: 1 },
    book_author: { type: 'string' as const, required: true, min: 1 },
    book_condition: { type: 'string' as const, required: true, min: 1 },
    book_id: { type: 'number' as const },
    book_cover: { type: 'string' as const },
    book_category: { type: 'string' as const },
    quantity: { type: 'number' as const, min: 1, max: 100 },
    message: { type: 'string' as const }
  }
};

router.post('/', authMiddleware, validate(createDonationSchema), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { book_id, book_title, book_author, book_cover, book_category, book_condition, quantity, message } = req.body as CreateDonationBody;

  if (!book_title || !book_author || !book_condition) {
    return badRequest(res, '书名、作者和书籍状况是必填项');
  }

  if (quantity && (quantity < 1 || quantity > 100)) {
    return badRequest(res, '捐赠数量必须在1-100之间');
  }

  await db.read();

  const newId = Math.max(0, ...db.data.donations.map(d => d.id)) + 1;

  const donation: Donation = {
    id: newId,
    user_id: req.user.id,
    book_id: book_id || null,
    book_title: book_title.trim(),
    book_author: book_author.trim(),
    book_cover: book_cover || '',
    book_category: book_category || '',
    book_condition: book_condition,
    quantity: quantity || 1,
    message: message || '',
    status: 'approved',
    donated_at: new Date().toISOString(),
    certificate_issued: true
  };

  db.data.donations.push(donation);

  const certId = Math.max(0, ...db.data.donationCertificates.map(c => c.id)) + 1;
  const certificate: DonationCertificate = {
    id: certId,
    donation_id: newId,
    user_id: req.user.id,
    certificate_no: generateCertificateNo(req.user.id, newId),
    issued_at: new Date().toISOString()
  };

  db.data.donationCertificates.push(certificate);

  const user = db.data.users.find(u => u.id === req.user!.id);
  if (user) {
    user.points += 20 * (quantity || 1);
  }

  await db.write();

  const response = {
    donation,
    certificate,
    points_earned: 20 * (quantity || 1)
  };

  created(res, response);
});

router.get('/mine', authMiddleware, validatePagination(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { status, page = 1, limit = 10, sort_by = 'date', sort_order = 'desc' } = req.query;

  await db.read();

  let donations = db.data.donations.filter(d => d.user_id === req.user!.id);

  if (status) {
    donations = donations.filter(d => d.status === status);
  }

  const sortField = sort_by as string;
  const sortDir = (sort_order as string) === 'asc' ? 1 : -1;

  if (sortField === 'date') {
    donations.sort((a, b) => (new Date(a.donated_at).getTime() - new Date(b.donated_at).getTime()) * sortDir);
  } else if (sortField === 'quantity') {
    donations.sort((a, b) => (a.quantity - b.quantity) * sortDir);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = donations.length;
  const totalPages = Math.ceil(total / limitNum);
  const start = (pageNum - 1) * limitNum;
  const paginatedDonations = donations.slice(start, start + limitNum);

  const donationsWithCert: DonationWithCertificate[] = paginatedDonations.map(donation => {
    const cert = db.data.donationCertificates.find(c => c.donation_id === donation.id);
    return {
      ...donation,
      certificate_no: cert?.certificate_no,
      certificate_issued_at: cert?.issued_at
    };
  });

  const response: MyDonationListResponse = {
    donations: donationsWithCert,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: totalPages
    }
  };

  success(res, response);
});

router.get('/', validatePagination(), async (req, res) => {
  const { user_id, status, page = 1, limit = 10, sort_by = 'date', sort_order = 'desc' } = req.query;

  await db.read();

  let donations = [...db.data.donations];

  if (user_id) {
    donations = donations.filter(d => d.user_id === parseInt(user_id as string));
  }

  if (status) {
    donations = donations.filter(d => d.status === status);
  }

  donations = donations.filter(d => d.status === 'approved');

  const sortField = sort_by as string;
  const sortDir = (sort_order as string) === 'asc' ? 1 : -1;

  if (sortField === 'date') {
    donations.sort((a, b) => (new Date(a.donated_at).getTime() - new Date(b.donated_at).getTime()) * sortDir);
  } else if (sortField === 'quantity') {
    donations.sort((a, b) => (a.quantity - b.quantity) * sortDir);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const total = donations.length;
  const totalPages = Math.ceil(total / limitNum);
  const start = (pageNum - 1) * limitNum;
  const paginatedDonations = donations.slice(start, start + limitNum);

  const donationsWithUser: DonationWithUser[] = paginatedDonations.map(donation => {
    const user = db.data.users.find(u => u.id === donation.user_id);
    return {
      ...donation,
      username: user?.username,
      user_avatar: user?.avatar
    };
  });

  const response: DonationListResponse = {
    donations: donationsWithUser,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: totalPages
    }
  };

  success(res, response);
});

router.get('/ranking', async (req, res) => {
  const { type = 'total', period = 'all', limit = 10 } = req.query;

  await db.read();

  const approvedDonations = db.data.donations.filter(d => d.status === 'approved');

  let filteredDonations = [...approvedDonations];

  const periodStr = period as string;
  const now = new Date();

  if (periodStr === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredDonations = filteredDonations.filter(d => new Date(d.donated_at) >= startOfMonth);
  } else if (periodStr === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    filteredDonations = filteredDonations.filter(d => new Date(d.donated_at) >= startOfWeek);
  }

  const userDonationMap = new Map<number, { user_id: number; total_books: number; total_donations: number }>();

  for (const donation of filteredDonations) {
    const existing = userDonationMap.get(donation.user_id);
    if (existing) {
      existing.total_books += donation.quantity;
      existing.total_donations += 1;
    } else {
      userDonationMap.set(donation.user_id, {
        user_id: donation.user_id,
        total_books: donation.quantity,
        total_donations: 1
      });
    }
  }

  const rankings: RankingItem[] = Array.from(userDonationMap.values())
    .map(item => {
      const user = db.data.users.find(u => u.id === item.user_id);
      return {
        ...item,
        username: user?.username,
        user_avatar: user?.avatar
      };
    })
    .sort((a, b) => {
      if (type === 'total') {
        return b.total_books - a.total_books;
      } else if (type === 'count') {
        return b.total_donations - a.total_donations;
      }
      return b.total_books - a.total_books;
    })
    .slice(0, parseInt(limit as string));

  const response: RankingResponse = {
    rankings,
    period: periodStr,
    type: type as string,
    total_users: userDonationMap.size
  };

  success(res, response);
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  await db.read();

  const myDonations = db.data.donations.filter(d => d.user_id === req.user!.id && d.status === 'approved');
  const totalBooks = myDonations.reduce((sum, d) => sum + d.quantity, 0);
  const totalDonations = myDonations.length;
  const totalCertificates = db.data.donationCertificates.filter(c => c.user_id === req.user!.id).length;

  const allApproved = db.data.donations.filter(d => d.status === 'approved');
  const allTotalBooks = allApproved.reduce((sum, d) => sum + d.quantity, 0);

  let rank = 0;
  const userBookMap = new Map<number, number>();
  for (const d of allApproved) {
    const current = userBookMap.get(d.user_id) || 0;
    userBookMap.set(d.user_id, current + d.quantity);
  }
  const sortedUsers = Array.from(userBookMap.entries()).sort((a, b) => b[1] - a[1]);
  const myRankIndex = sortedUsers.findIndex(([userId]) => userId === req.user!.id);
  rank = myRankIndex >= 0 ? myRankIndex + 1 : 0;

  const response: DonationStatsResponse = {
    total_books: totalBooks,
    total_donations: totalDonations,
    total_certificates: totalCertificates,
    global_total_books: allTotalBooks,
    my_rank: rank,
    total_donors: userBookMap.size
  };

  success(res, response);
});

router.get('/:id', validateIdParam(), async (req, res) => {
  const { id } = req.params;

  await db.read();

  const donation = db.data.donations.find(d => d.id === parseInt(id));

  if (!donation) {
    return notFound(res, '捐赠记录不存在');
  }

  const user = db.data.users.find(u => u.id === donation.user_id);
  const certificate = db.data.donationCertificates.find(c => c.donation_id === donation.id);

  const response: DonationDetailResponse = {
    ...donation,
    username: user?.username,
    user_avatar: user?.avatar,
    certificate_no: certificate?.certificate_no,
    certificate_issued_at: certificate?.issued_at
  };

  success(res, response);
});

router.get('/:id/certificate', validateIdParam(), async (req, res) => {
  const { id } = req.params;

  await db.read();

  const donation = db.data.donations.find(d => d.id === parseInt(id));

  if (!donation) {
    return notFound(res, '捐赠记录不存在');
  }

  const certificate = db.data.donationCertificates.find(c => c.donation_id === donation.id);

  if (!certificate) {
    return notFound(res, '捐赠证书未生成');
  }

  const user = db.data.users.find(u => u.id === donation.user_id);

  const response: CertificateResponse = {
    certificate_no: certificate.certificate_no,
    issued_at: certificate.issued_at,
    donation: {
      id: donation.id,
      book_title: donation.book_title,
      book_author: donation.book_author,
      book_category: donation.book_category,
      book_condition: donation.book_condition,
      quantity: donation.quantity,
      message: donation.message,
      donated_at: donation.donated_at
    },
    user: {
      id: user?.id,
      username: user?.username
    }
  };

  success(res, response);
});

export default router;
