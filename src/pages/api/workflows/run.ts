import type { NextApiRequest, NextApiResponse } from 'next';

interface APIError extends Error {
  name: string;
  status?: number;
}

interface WorkflowRequest {
  inputs: {
    system_message_1: string;
    system_message_2: string;
    user_prompt_1: string;
    user_prompt_2: string;
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
    'system_message_1',
    'system_message_2',
    'user_prompt_1',
    'user_prompt_2',
    'file_upload',
    'sys.app_id',
    'sys.user_id'
  ];

  for (const field of required) {
    if (!body.inputs[field]) {
      throw new Error(`Missing required input: ${field}`);
    }
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
  const timeoutId = setTimeout(() => controller.abort(), 299000);

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

    const response = await fetch(`${process.env.DIFY_API_URL}/workflows/run`, {
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