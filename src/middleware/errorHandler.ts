import { NextApiRequest, NextApiResponse } from 'next';

export function errorHandler(err: any, req: NextApiRequest, res: NextApiResponse) {
  console.error('API Error:', err);

  if (err.name === 'AbortError') {
    return res.status(504).json({ error: 'Request timeout' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    requestId: req.headers['x-request-id']
  });
} 