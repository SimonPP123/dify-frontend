import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connection to Dify API
    const response = await fetch(`${process.env.DIFY_API_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
      }
    });

    if (response.ok) {
      return res.status(200).json({ status: 'healthy' });
    } else {
      return res.status(503).json({ error: 'Dify API is not available' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check API health' });
  }
}
