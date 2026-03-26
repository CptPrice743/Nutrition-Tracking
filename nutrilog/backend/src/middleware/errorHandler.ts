import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR'
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR'
  });
};
