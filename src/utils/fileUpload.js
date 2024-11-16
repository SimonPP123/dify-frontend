import axios from 'axios';

export async function uploadFile(file, userId) {
  if (!file) throw new Error('No file provided');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', userId);

  try {
    const response = await axios.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status === 415) {
      throw new Error('Unsupported file type. Supported formats: PDF, TXT, MD, HTML, XLSX, DOCX, CSV');
    }

    return response.data.id;
  } catch (error) {
    if (error.response?.status === 415) {
      throw new Error('Unsupported file type. Supported formats: PDF, TXT, MD, HTML, XLSX, DOCX, CSV');
    }
    throw new Error(error.response?.data?.error || 'File upload failed');
  }
} 