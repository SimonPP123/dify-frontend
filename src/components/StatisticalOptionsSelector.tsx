import React, { useState } from 'react';

interface StatisticalOptionsSelectorProps {
  selectedOptions: string[];
  onOptionsChange: (options: string[]) => void;
  error?: string;
}

const STATISTICAL_OPTIONS = [
  { id: 'highest_value', label: 'Highest Value' },
  { id: 'lowest_nonzero', label: 'Lowest Non-Zero Value' },
  { id: 'mean', label: 'Mean (Average)' },
  { id: 'median', label: 'Median' },
  { id: 'mode', label: 'Mode' },
  { id: 'std_dev', label: 'Standard Deviation' },
  { id: 'top_box', label: 'Top to Box' },
  { id: 'bottom_box', label: 'Bottom to Box' }
];

export const StatisticalOptionsSelector: React.FC<StatisticalOptionsSelectorProps> = ({
  selectedOptions,
  onOptionsChange,
  error
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSelectAll = () => {
    onOptionsChange(STATISTICAL_OPTIONS.map(opt => opt.id));
  };

  const handleDeselectAll = () => {
    onOptionsChange([]);
  };

  const handleOptionChange = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    onOptionsChange(newSelection);
  };

  return (
    <div className="border rounded-lg p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-lg font-medium">Statistical Analysis Options</h3>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAll();
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeselectAll();
            }}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Deselect All
          </button>
          <svg 
            className={`h-5 w-5 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-3 gap-3">
          {STATISTICAL_OPTIONS.map((option) => (
            <div
              key={option.id}
              onClick={() => handleOptionChange(option.id)}
              className={`p-3 cursor-pointer rounded-md border ${
                selectedOptions.includes(option.id)
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } transition-colors duration-200 ease-in-out flex items-center justify-between`}
            >
              <span className="text-sm truncate">{option.label}</span>
              {selectedOptions.includes(option.id) && (
                <svg 
                  className="h-5 w-5 text-blue-500"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}; 