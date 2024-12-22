import type { NextApiRequest, NextApiResponse } from 'next';
import { getApiUrl } from '../../../utils/api';

interface APIError extends Error {
  name: string;
  status?: number;
}

interface WorkflowRequest {
  inputs: {
    insights_number: string;
    summary_insights_number: string;
    language: string;
    file_upload: string;
    'sys.app_id': string;
    'sys.user_id': string;
  };
  response_mode: 'streaming' | 'blocking';
  user: string;
}

const validateRequest = (body: any): WorkflowRequest => {
  if (!body.inputs || !body.response_mode || !body.user) {
    throw new Error('Missing required fields');
  }

  const required = [
    'insights_number',
    'summary_insights_number',
    'language',
    'file_upload',
    'sys.app_id',
    'sys.user_id'
  ];

  for (const field of required) {
    if (!body.inputs[field]) {
      throw new Error(`Missing required input: ${field}`);
    }
  }

  // Validate select options
  const validInsights = ['5', '10', '15', '20', '25'];
  const validSummaryInsights = ['10', '20', '30', '40', '50'];
  const validLanguages = ['Български', 'English'];

  if (!validInsights.includes(body.inputs.insights_number)) {
    throw new Error('Invalid insights number');
  }
  if (!validSummaryInsights.includes(body.inputs.summary_insights_number)) {
    throw new Error('Invalid summary insights number');
  }
  if (!validLanguages.includes(body.inputs.language)) {
    throw new Error('Invalid language');
  }

  return body as WorkflowRequest;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: false
  }
};

export const maxDuration = 300; // Set maximum duration to 300 seconds for Pro plan

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 299000000);

  try {
    const validatedBody = validateRequest(req.body);
    
    // Set headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const response = await fetch(getApiUrl('/workflows/run'), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
      },
      body: JSON.stringify(validatedBody)
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeoutId);
      throw new Error('No response stream available');
    }

    req.socket.on('close', () => {
      clearTimeout(timeoutId);
      controller.abort();
      reader.cancel();
    });

    await streamResponse(reader, res);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        res.status(504).json({ error: 'Request timeout' });
      } else {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}

async function streamResponse(reader: ReadableStreamDefaultReader, res: NextApiResponse) {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (buffer.trim()) {
          res.write(`data: ${buffer}\n\n`);
        }
        res.end();
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

      for (const message of messages) {
        if (!message.startsWith('data: ')) continue;
        
        const jsonStr = message.slice(6).trim();
        if (!jsonStr) continue;

        try {
          // Validate that it's proper JSON before forwarding
          JSON.parse(jsonStr);
          res.write(`${message}\n\n`);
        } catch (e) {
          console.error('Invalid JSON in stream:', message);
        }
      }
    }
  } catch (error) {
    if (!res.writableEnded) {
      res.end();
    }
    throw error;
  }
}