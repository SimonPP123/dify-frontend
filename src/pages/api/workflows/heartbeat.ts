import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflowRunId, taskId } = req.body;

  try {
    const response = await fetch(
      `${process.env.DIFY_API_URL}/workflows/${workflowRunId}/status`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check workflow status');
    }

    const status = await response.json();
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check workflow status' });
  }
}