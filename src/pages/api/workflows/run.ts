import type { NextApiRequest, NextApiResponse } from 'next';
import { getApiUrl } from '../../../utils/api';
import { transformDifyResponse } from '../../../utils/responseTransformer';

// Add proper validation interface
interface WorkflowRequest {
  inputs: {
    insights_number: string;
    summary_insights_number: string;
    language: string;
    file_upload: string;
    selectedColumns: string[];
    selectedQuestionOptions: Array<{
      question: string;
      options: string[];
      selectedOptions: string[];
    }>;
    'sys.app_id': string;
    'sys.user_id': string;
  };
  response_mode: 'streaming' | 'blocking';
  user: string;
}

const validateRequest = (body: any): WorkflowRequest => {
  if (!body.inputs) {
    throw new Error('Missing inputs in request body');
  }

  const { insights_number, summary_insights_number, language, file_upload } = body.inputs;

  // Validate required fields
  if (!insights_number || !summary_insights_number || !language || !file_upload) {
    throw new Error('Missing required input fields');
  }

  // Validate select options
  const validInsights = ['5', '10', '15', '20', '25'];
  const validSummaryInsights = ['10', '20', '30', '40', '50'];
  const validLanguages = ['Български', 'English'];

  if (!validInsights.includes(insights_number)) {
    throw new Error('Invalid insights number');
  }
  if (!validSummaryInsights.includes(summary_insights_number)) {
    throw new Error('Invalid summary insights number');
  }
  if (!validLanguages.includes(language)) {
    throw new Error('Invalid language');
  }

  // Handle optional fields and system fields
  const validatedBody: WorkflowRequest = {
    inputs: {
      insights_number,
      summary_insights_number,
      language,
      file_upload,
      selectedColumns: body.inputs.selectedColumns || [],
      selectedQuestionOptions: body.inputs.selectedQuestionOptions || [],
      'sys.app_id': body.inputs['sys.app_id'] || process.env.DIFY_APP_ID || '',
      'sys.user_id': body.inputs['sys.user_id'] || 'anonymous'
    },
    response_mode: body.response_mode === 'streaming' ? 'streaming' : 'blocking',
    user: body.user || 'anonymous'
  };

  return validatedBody;
};

const formatResponse = (data: any) => {
  // Always return in consistent format
  return {
    data: {
      outputs: transformDifyResponse(data)
    }
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('📥 Received workflow request');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

  try {
    const validatedBody = validateRequest(req.body);
    console.log('✅ Request validation passed');
    
    // For blocking mode, handle differently
    if (validatedBody.response_mode === 'blocking') {
      const response = await fetch(getApiUrl('/v1/workflows/run'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
        },
        body: JSON.stringify(validatedBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return res.json({
        outputs: data.outputs || {
          output: data.data?.outputs?.output || [],
          summary: data.data?.outputs?.summary || '',
          whole_output: data.data?.outputs?.whole_output || [],
          whole_summary: data.data?.outputs?.whole_summary || ''
        }
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log('🚀 Forwarding request to Dify API');
    const response = await fetch(getApiUrl('/v1/workflows/run'), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
      },
      body: JSON.stringify(validatedBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Dify API error:', {
        status: response.status,
        error: errorText
      });
      clearTimeout(timeoutId);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeoutId);
      throw new Error('No response stream available');
    }

    // Handle client disconnect
    req.socket.on('close', () => {
      console.log('🔌 Client disconnected');
      clearTimeout(timeoutId);
      controller.abort();
      reader.cancel();
    });

    // Stream the response
    console.log('📡 Starting response stream');
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✨ Stream completed');
          if (buffer.trim()) {
            // Transform before sending
            const data = JSON.parse(buffer);
            const transformed = transformDifyResponse(data);
            res.write(`data: ${JSON.stringify(transformed)}\n\n`);
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
            // Validate JSON before forwarding
            JSON.parse(jsonStr);
            res.write(`${message}\n\n`);
          } catch (e) {
            console.error('⚠️ Invalid JSON in stream:', message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Stream error:', error);
      if (!res.writableEnded) {
        res.end();
      }
      throw error;
    }
  } catch (error) {
    console.error('🔥 Handler error:', error);
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: false
  }
};