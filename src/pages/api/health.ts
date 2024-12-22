import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  difyAPI: boolean;
  database?: boolean;
  timestamp: string;
  version: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Use the base URL directly since we know it works
    const healthUrl = process.env.DIFY_API_URL;
    
    console.log('Attempting health check at:', healthUrl);

    const difyHealth = await fetch(healthUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Log response for debugging
    console.log('Dify API Response:', {
      status: difyHealth.status,
      ok: difyHealth.ok,
      url: healthUrl,
      statusText: difyHealth.statusText
    });

    const healthStatus: HealthResponse = {
      status: difyHealth.ok ? 'healthy' : 'degraded',
      difyAPI: difyHealth.ok,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    };

    return res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(200).json({
      status: 'unhealthy',
      difyAPI: false,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
