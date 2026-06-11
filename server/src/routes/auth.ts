import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { User } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { success, created, badRequest, unauthorized, forbidden, notFound } from '../utils/response';
import { AuthResponse, UserProfile } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'book-exchange-secret-key';

interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function buildUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    bio: user.bio,
    reading_tags: (user as any).reading_tags || [],
    expertise_fields: (user as any).expertise_fields || [],
    shelf_style: (user as any).shelf_style || 'grid',
  };
}

router.post(
  '/register',
  validate({
    body: {
      username: { type: 'string', required: true, min: 3, max: 20 },
      email: { type: 'email', required: true },
      password: { type: 'string', required: true, min: 6, max: 32 },
    },
  }),
  async (req, res) => {
    const { username, email, password } = req.body as RegisterBody;

    await db.read();

    const existingUser = db.data.users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return badRequest(res, '用户名或邮箱已存在');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newId = Math.max(0, ...db.data.users.map(u => u.id)) + 1;

    const newUser: User = {
      id: newId,
      username,
      email,
      password: hashedPassword,
      points: 100,
      role: 'user',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    db.data.users.push(newUser);

    const defaultWishlistId = Math.max(0, ...db.data.wishlists.map(w => w.id)) + 1;
    const defaultWishlist = {
      id: defaultWishlistId,
      user_id: newId,
      name: '默认心愿单',
      description: '我的收藏',
      is_default: true,
      created_at: new Date().toISOString(),
    };
    db.data.wishlists.push(defaultWishlist);

    await db.write();

    const token = jwt.sign(
      { id: newId, username, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userProfile = buildUserProfile(newUser);
    created<AuthResponse>(res, { token, user: userProfile }, '注册成功');
  }
);

router.post(
  '/login',
  validate({
    body: {
      email: { type: 'email', required: true },
      password: { type: 'string', required: true },
    },
  }),
  async (req, res) => {
    const { email, password } = req.body as LoginBody;

    await db.read();
    const user = db.data.users.find(u => u.email === email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return unauthorized(res, '邮箱或密码错误');
    }

    if (user.status === 'banned') {
      return forbidden(res, '账号已被封禁');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userProfile = buildUserProfile(user);
    success<AuthResponse>(res, { token, user: userProfile }, '登录成功');
  }
);

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return unauthorized(res);
  }

  await db.read();
  const user = db.data.users.find(u => u.id === req.user!.id);

  if (!user) {
    return notFound(res, '用户不存在');
  }

  if (user.status === 'banned') {
    return forbidden(res, '账号已被封禁');
  }

  const userProfile = buildUserProfile(user);
  success<UserProfile>(res, userProfile);
});

export default router;
