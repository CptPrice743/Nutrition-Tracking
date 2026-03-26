import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';

type SessionPayload = {
  sub: string;
  iat?: number;
  exp?: number;
};

const unauthorized = (res: Response): Response => {
  return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const sessionToken = req.cookies?.session;
    if (typeof sessionToken !== 'string' || !sessionToken) {
      return unauthorized(res);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return unauthorized(res);
    }

    const decoded = jwt.verify(sessionToken, jwtSecret);
    if (typeof decoded !== 'object' || decoded === null || !('sub' in decoded)) {
      return unauthorized(res);
    }

    const payload = decoded as SessionPayload;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return unauthorized(res);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return unauthorized(res);
    }

    req.user = user;
    next();
  } catch {
    return unauthorized(res);
  }
};
