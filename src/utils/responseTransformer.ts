interface DifyResponse {
  text?: string;
  output?: string[];
  summary?: string;
  whole_output?: string[];
  whole_summary?: string;
}

interface FormattedResponse {
  output: string[];
  summary: string;
  whole_output: string[];
  whole_summary: string;
}

export const createEmptyResponse = (): FormattedResponse => ({
  output: [],
  summary: '',
  whole_output: [],
  whole_summary: ''
});

export const transformDifyResponse = (responseData: any): FormattedResponse => {
  console.log('🔄 Transform Input:', responseData);
  
  // First check if we have outputs object with the data
  if (responseData?.outputs) {
    const transformed = {
      output: Array.isArray(responseData.outputs.output) ? responseData.outputs.output : [],
      summary: responseData.outputs.summary || '',
      whole_output: Array.isArray(responseData.outputs.whole_output) ? responseData.outputs.whole_output : [],
      whole_summary: responseData.outputs.whole_summary || ''
    };
    console.log('🔄 Transformed Output:', transformed);
    return transformed;
  }
  
  // If not in outputs, try direct data access
  const data = responseData?.data?.outputs || responseData;
  console.log('🔄 Extracted Data:', data);
  
  const transformed = {
    output: Array.isArray(data.output) ? data.output : [],
    summary: data.summary || '',
    whole_output: Array.isArray(data.whole_output) ? data.whole_output : [],
    whole_summary: data.whole_summary || ''
  };
  console.log('🔄 Final Transformed Output:', transformed);
  return transformed;
}; 