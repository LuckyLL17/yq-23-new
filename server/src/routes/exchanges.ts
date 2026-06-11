import { Router } from 'express';
import db, { Exchange, ExchangeReview, Book, User } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { success, created, badRequest, unauthorized, forbidden, notFound } from '../utils/response';
import { validate, validateIdParam } from '../middleware/validate';

const router = Router();

const PENDING_EXPIRE_DAYS = 7;
const DEFAULT_BORROW_DAYS = 30;

interface CreateExchangeRequest {
  book_id: number;
  message?: string;
  borrow_days?: number;
}

interface ExchangeWithDetails extends Exchange {
  title?: string;
  cover?: string;
  author?: string;
  points_required?: number;
  requester_name?: string;
  requester_avatar?: string;
  owner_name?: string;
  owner_avatar?: string;
  my_review?: ExchangeReview;
  other_review?: ExchangeReview;
}

interface ExchangeDetailResponse extends Exchange {
  book: Book | undefined;
  requester: {
    id: number | undefined;
    username: string | undefined;
    avatar: string | undefined;
  };
  owner: {
    id: number | undefined;
    username: string | undefined;
    avatar: string | undefined;
  };
  reviews: ExchangeReview[];
}

interface ReviewExchangeRequest {
  rating: number;
  comment?: string;
}

interface UserReviewsResponse {
  reviews: (ExchangeReview & {
    reviewer_name?: string;
    reviewer_avatar?: string;
    book_title?: string;
    book_cover?: string;
  })[];
  average_rating: number;
  review_count: number;
}

interface MessageResponse {
  message: string;
  exchange?: Exchange;
}

function checkAndUpdateExpiredExchanges() {
  const now = new Date();
  let hasChanges = false;

  db.data.exchanges.forEach((exchange) => {
    if (exchange.status === 'pending' && exchange.expires_at) {
      const expireDate = new Date(exchange.expires_at);
      if (now >= expireDate) {
        exchange.status = 'expired';
        exchange.expired_at = now.toISOString();
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    db.write();
  }

  return hasChanges;
}

router.post(
  '/',
  authMiddleware,
  validate({
    body: {
      book_id: { type: 'number', required: true },
      message: { type: 'string' },
      borrow_days: { type: 'number', min: 1 },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res, 'Not authenticated');
    }

    const { book_id, message, borrow_days } = req.body as CreateExchangeRequest;

    await db.read();
    checkAndUpdateExpiredExchanges();

    const book = db.data.books.find((b) => b.id === book_id);

    if (!book) {
      return notFound(res, 'Book not found');
    }

    if (book.current_holder_id === req.user.id) {
      return badRequest(res, 'You already have this book');
    }

    if (book.status !== 'available') {
      return badRequest(res, 'Book is not available for exchange');
    }

    const user = db.data.users.find((u) => u.id === req.user!.id);
    if (!user || user.points < book.points_required) {
      return badRequest(res, 'Insufficient points');
    }

    const newId = Math.max(0, ...db.data.exchanges.map((e) => e.id)) + 1;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PENDING_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

    const newExchange: Exchange = {
      id: newId,
      book_id,
      requester_id: req.user.id,
      owner_id: book.current_holder_id,
      status: 'pending',
      message,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      borrow_days: borrow_days || DEFAULT_BORROW_DAYS,
      owner_rated: false,
      requester_rated: false,
    };

    db.data.exchanges.push(newExchange);
    await db.write();

    created(res, newExchange);
  }
);

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchanges: ExchangeWithDetails[] = db.data.exchanges
    .filter((e) => e.requester_id === req.user!.id || e.owner_id === req.user!.id)
    .map((exchange) => {
      const book = db.data.books.find((b) => b.id === exchange.book_id);
      const requester = db.data.users.find((u) => u.id === exchange.requester_id);
      const owner = db.data.users.find((u) => u.id === exchange.owner_id);

      const ownerReview = db.data.exchangeReviews.find(
        (r) => r.exchange_id === exchange.id && r.reviewer_id === exchange.owner_id
      );
      const requesterReview = db.data.exchangeReviews.find(
        (r) => r.exchange_id === exchange.id && r.reviewer_id === exchange.requester_id
      );

      return {
        ...exchange,
        title: book?.title,
        cover: book?.cover,
        author: book?.author,
        points_required: book?.points_required,
        requester_name: requester?.username,
        requester_avatar: requester?.avatar,
        owner_name: owner?.username,
        owner_avatar: owner?.avatar,
        my_review:
          req.user!.id === exchange.owner_id ? ownerReview : requesterReview,
        other_review:
          req.user!.id === exchange.owner_id ? requesterReview : ownerReview,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  success(res, exchanges);
});

router.get('/:id', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (
    exchange.requester_id !== req.user.id &&
    exchange.owner_id !== req.user.id
  ) {
    return forbidden(res, 'Not authorized');
  }

  const book = db.data.books.find((b) => b.id === exchange.book_id);
  const requester = db.data.users.find((u) => u.id === exchange.requester_id);
  const owner = db.data.users.find((u) => u.id === exchange.owner_id);

  const reviews = db.data.exchangeReviews.filter(
    (r) => r.exchange_id === exchangeId
  );

  const response: ExchangeDetailResponse = {
    ...exchange,
    book,
    requester: {
      id: requester?.id,
      username: requester?.username,
      avatar: requester?.avatar,
    },
    owner: {
      id: owner?.id,
      username: owner?.username,
      avatar: owner?.avatar,
    },
    reviews,
  };

  success(res, response);
});

router.post('/:id/accept', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (exchange.owner_id !== req.user.id) {
    return forbidden(res, 'Not authorized');
  }

  if (exchange.status !== 'pending') {
    return badRequest(res, 'Exchange already processed');
  }

  const book = db.data.books.find((b) => b.id === exchange.book_id);
  if (!book) {
    return notFound(res, 'Book not found');
  }

  exchange.status = 'accepted';
  exchange.accepted_at = new Date().toISOString();

  const requester = db.data.users.find((u) => u.id === exchange.requester_id);
  const owner = db.data.users.find((u) => u.id === req.user!.id);

  if (requester) requester.points -= book.points_required;
  if (owner) owner.points += book.points_required;

  book.current_holder_id = exchange.requester_id;
  book.status = 'borrowed';

  await db.write();

  const response: MessageResponse = { message: 'Exchange accepted', exchange };
  success(res, response);
});

router.post('/:id/reject', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (exchange.owner_id !== req.user.id) {
    return forbidden(res, 'Not authorized');
  }

  if (exchange.status !== 'pending') {
    return badRequest(res, 'Exchange already processed');
  }

  exchange.status = 'rejected';
  exchange.rejected_at = new Date().toISOString();
  await db.write();

  success(res, { message: 'Exchange rejected' });
});

router.post('/:id/cancel', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (exchange.requester_id !== req.user.id) {
    return forbidden(res, 'Not authorized');
  }

  if (exchange.status !== 'pending') {
    return badRequest(res, 'Cannot cancel this exchange');
  }

  exchange.status = 'cancelled';
  exchange.cancelled_at = new Date().toISOString();
  await db.write();

  success(res, { message: 'Exchange cancelled' });
});

router.post('/:id/start', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (
    exchange.requester_id !== req.user.id &&
    exchange.owner_id !== req.user.id
  ) {
    return forbidden(res, 'Not authorized');
  }

  if (exchange.status !== 'accepted') {
    return badRequest(res, 'Can only start accepted exchanges');
  }

  exchange.status = 'in_progress';
  exchange.started_at = new Date().toISOString();
  await db.write();

  const response: MessageResponse = { message: 'Exchange started', exchange };
  success(res, response);
});

router.post('/:id/complete', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (
    exchange.requester_id !== req.user.id &&
    exchange.owner_id !== req.user.id
  ) {
    return forbidden(res, 'Not authorized');
  }

  if (exchange.status !== 'in_progress' && exchange.status !== 'accepted') {
    return badRequest(res, 'Can only complete in-progress exchanges');
  }

  exchange.status = 'completed';
  exchange.completed_at = new Date().toISOString();

  const book = db.data.books.find((b) => b.id === exchange.book_id);
  if (book) {
    book.status = 'available';
  }

  await db.write();

  const response: MessageResponse = { message: 'Exchange completed', exchange };
  success(res, response);
});

router.post(
  '/:id/review',
  authMiddleware,
  validateIdParam(),
  validate({
    body: {
      rating: { type: 'number', required: true, min: 1, max: 5 },
      comment: { type: 'string' },
    },
  }),
  async (req: AuthRequest, res) => {
    if (!req.user) {
      return unauthorized(res, 'Not authenticated');
    }

    const { id } = req.params;
    const exchangeId = parseInt(id);
    const { rating, comment } = req.body as ReviewExchangeRequest;

    await db.read();
    checkAndUpdateExpiredExchanges();

    const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

    if (!exchange) {
      return notFound(res, 'Exchange not found');
    }

    if (
      exchange.requester_id !== req.user.id &&
      exchange.owner_id !== req.user.id
    ) {
      return forbidden(res, 'Not authorized');
    }

    if (exchange.status !== 'completed') {
      return badRequest(res, 'Can only review completed exchanges');
    }

    const existingReview = db.data.exchangeReviews.find(
      (r) => r.exchange_id === exchangeId && r.reviewer_id === req.user!.id
    );

    if (existingReview) {
      return badRequest(res, 'You have already reviewed this exchange');
    }

    const isOwner = exchange.owner_id === req.user.id;
    const revieweeId = isOwner ? exchange.requester_id : exchange.owner_id;

    const newId = Math.max(0, ...db.data.exchangeReviews.map((r) => r.id)) + 1;

    const newReview: ExchangeReview = {
      id: newId,
      exchange_id: exchangeId,
      reviewer_id: req.user.id,
      reviewee_id: revieweeId,
      rating,
      comment,
      created_at: new Date().toISOString(),
    };

    db.data.exchangeReviews.push(newReview);

    if (isOwner) {
      exchange.owner_rated = true;
    } else {
      exchange.requester_rated = true;
    }

    await db.write();

    created(res, newReview);
  }
);

router.get('/:id/reviews', authMiddleware, validateIdParam(), async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not authenticated');
  }

  const { id } = req.params;
  const exchangeId = parseInt(id);

  await db.read();
  checkAndUpdateExpiredExchanges();

  const exchange = db.data.exchanges.find((e) => e.id === exchangeId);

  if (!exchange) {
    return notFound(res, 'Exchange not found');
  }

  if (
    exchange.requester_id !== req.user.id &&
    exchange.owner_id !== req.user.id
  ) {
    return forbidden(res, 'Not authorized');
  }

  const reviews = db.data.exchangeReviews
    .filter((r) => r.exchange_id === exchangeId)
    .map((review) => {
      const reviewer = db.data.users.find((u) => u.id === review.reviewer_id);
      return {
        ...review,
        reviewer_name: reviewer?.username,
        reviewer_avatar: reviewer?.avatar,
      };
    });

  success(res, reviews);
});

router.get('/user/:userId/reviews', validateIdParam('userId'), async (req, res) => {
  const { userId } = req.params;
  const userIdNum = parseInt(userId);

  await db.read();

  const reviews = db.data.exchangeReviews
    .filter((r) => r.reviewee_id === userIdNum)
    .map((review) => {
      const reviewer = db.data.users.find((u) => u.id === review.reviewer_id);
      const exchange = db.data.exchanges.find((e) => e.id === review.exchange_id);
      const book = exchange
        ? db.data.books.find((b) => b.id === exchange.book_id)
        : null;
      return {
        ...review,
        reviewer_name: reviewer?.username,
        reviewer_avatar: reviewer?.avatar,
        book_title: book?.title,
        book_cover: book?.cover,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const response: UserReviewsResponse = {
    reviews,
    average_rating: parseFloat(averageRating.toFixed(1)),
    review_count: reviews.length,
  };

  success(res, response);
});

export default router;
