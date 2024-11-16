import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflowId } = req.query;

  try {
    const response = await fetch(
      `${process.env.DIFY_API_URL}/workflows/run/${workflowId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch workflow result');
    }

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching workflow result:', error);
    res.status(500).json({ error: 'Failed to fetch workflow result' });
  }
} 