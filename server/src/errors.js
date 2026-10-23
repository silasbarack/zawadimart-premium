import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = 'Resource') => new AppError(404, `${what} not found`);

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Please check the highlighted fields.',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (error.code === '23505') return res.status(409).json({ error: 'That record already exists.' });
  if (error.code === '23503') return res.status(409).json({ error: 'That record is referenced by other data.' });

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
