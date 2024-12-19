import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

// Tell Next.js to allow file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    // Get the uploaded file
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the file content
    const fileContent = fs.readFileSync(file.filepath);

    // Create form data for n8n
    const formData = new FormData();
    formData.append('file', new Blob([fileContent], { type: file.mimetype || 'application/octet-stream' }), file.originalFilename || 'file');
    formData.append('insights_number', fields.insights_number?.[0] || '');
    formData.append('language', fields.language?.[0] || '');

    // Your n8n webhook URL (from the Webhook node in n8n)
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // Send to n8n
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (!n8nResponse.ok) {
      throw new Error(`N8N webhook returned ${n8nResponse.status}`);
    }

    const result = await n8nResponse.json();

    return res.status(200).json({
      success: true,
      workflowResult: result,
    });
  } catch (error) {
    console.error('Workflow error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process workflow',
    });
  }
}