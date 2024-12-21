import { useState } from 'react';

interface ColumnSelectorProps {
  headers: string[];
  selectedColumns: string[];
  onColumnChange: (columns: string[]) => void;
  error?: string;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  headers,
  selectedColumns,
  onColumnChange,
  error
}) => {
  const handleSelectAll = () => {
    onColumnChange([...headers]);
  };

  const handleDeselectAll = () => {
    onColumnChange([]);
  };

  const handleCheckboxChange = (header: string) => {
    const newSelection = selectedColumns.includes(header)
      ? selectedColumns.filter(col => col !== header)
      : [...selectedColumns, header];
    onColumnChange(newSelection);
  };

  return (
    <div className="mt-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Select Columns for Analysis (Required)
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Select All Columns
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
          >
            Deselect All Columns
          </button>
        </div>
      </div>
      <div className="relative">
        <div
          className={`w-full p-4 border rounded-md grid grid-cols-3 gap-3 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {headers.map((header) => (
            <div
              key={header}
              onClick={() => handleCheckboxChange(header)}
              className={`p-3 cursor-pointer rounded-md border ${
                selectedColumns.includes(header) 
                  ? 'bg-blue-50 border-blue-500' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } transition-colors duration-200 ease-in-out flex items-center justify-between`}
            >
              <span className="text-sm truncate">{header}</span>
              {selectedColumns.includes(header) && (
                <svg 
                  className="h-5 w-5 text-blue-500" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      {selectedColumns.length === 0 && (
        <p className="text-red-500 text-sm mt-1">Please select at least one column</p>
      )}
    </div>
  );
};
