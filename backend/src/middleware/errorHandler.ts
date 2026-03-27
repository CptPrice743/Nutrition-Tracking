import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Always log in development
  if (process.env.NODE_ENV !== 'production') {
    if (err instanceof Error) {
      console.error(`[ErrorHandler] ${err.name}: ${err.message}`);
      if (err.stack) {
        console.error(err.stack);
      }
    } else {
      console.error('[ErrorHandler] Non-Error thrown');
    }
  }

  if (
    err instanceof Error &&
    'statusCode' in err &&
    typeof err.statusCode === 'number'
  ) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: 'AUTH_ERROR',
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      // Show field-level errors in dev
      ...(process.env.NODE_ENV !== 'production' && {
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }),
    });
  }

  // Show error message in dev
  const message = process.env.NODE_ENV !== 'production' && err instanceof Error
    ? err.message
    : 'Internal Server Error';

  return res.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
};