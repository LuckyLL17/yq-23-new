import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database';

const JWT_SECRET = process.env.JWT_SECRET || 'book-exchange-secret-key';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role?: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token format error' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token format error' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    await db.read();
    const user = db.data.users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuthMiddleware = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role
        };
      } catch (error) {
        // 忽略无效 token，继续作为未登录用户处理
      }
    }
  }

  next();
};
