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

export const validateInputs = (inputs) => {
  const processedInputs = {};
  
  // Process standard inputs
  for (const [key, value] of Object.entries(inputs)) {
    if (key === 'selectedApp') {
      processedInputs['sys.app_id'] = value;
    } else {
      processedInputs[key] = processLargeInput(value);
    }
  }
  
  // Add required system fields
  processedInputs['sys.files'] = [];
  
  return processedInputs;
}; 