export const processLargeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // If input is larger than 1MB, truncate it
  const MAX_SIZE = 1024 * 1024; // 1MB
  if (input.length > MAX_SIZE) {
    console.warn('Input size exceeds 1MB, truncating...');
    return input.substring(0, MAX_SIZE);
  }
  
  return input;
};

export const validateInputs = (inputs, userId) => {
  console.log('Validating inputs:', inputs);
  
  const processedInputs = {};
  
  // Required fields validation
  const requiredFields = [
    'insights_number',
    'summary_insights_number',
    'language',
    'file_upload',
    'columns_selected',
    'question_rows_selected',
    'statistics_selected'
  ];

  for (const field of requiredFields) {
    if (!inputs[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate and process each field
  for (const [key, value] of Object.entries(inputs)) {
    if (value === undefined || value === null) continue;

    switch (key) {
      case 'selectedApp':
        processedInputs['sys.app_id'] = value;
        break;

      case 'columns_selected':
        processedInputs[key] = Array.isArray(value) ? value.join(',') : value;
        break;

      case 'question_rows_selected':
        if (Array.isArray(value)) {
          const formattedQuestions = value
            .filter(question => question.selectedOptions.length > 0)
            .map(question => {
              const questionText = `Question ${question.questionNumber} ${question.questionText}`;
              // Clean the options before joining
              const cleanedOptions = question.selectedOptions.map(opt => 
                opt.replace(/^,?\s*/, '').split(/\s*,\s*/)[0].trim()
              );
              return `${questionText},${cleanedOptions.join(',')}`;
            })
            .join('|');
            
          processedInputs[key] = formattedQuestions;
        } else if (typeof value === 'string') {
          processedInputs[key] = value;
        } else {
          throw new Error('Invalid question_rows_selected format');
        }
        break;

      case 'statistics_selected':
        processedInputs[key] = Array.isArray(value) ? value.join(',') : value;
        break;

      default:
        processedInputs[key] = processLargeInput(value);
    }
  }
  
  // Add required system fields
  processedInputs['sys.files'] = [];
  processedInputs['sys.user_id'] = userId;
  
  console.log('Processed inputs:', processedInputs);
  return processedInputs;
}; 