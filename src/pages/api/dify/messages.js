import { fetchDifyAPI } from '../../../utils/api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetchDifyAPI('/messages', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    
    res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 