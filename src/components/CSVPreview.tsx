import React, { useState, useMemo } from 'react';

interface CSVPreviewProps {
    csvData: {
      headers: string[];
      rows: string[][];
    };
    isLoading?: boolean;
  }

export const CSVPreview: React.FC<CSVPreviewProps> = ({ csvData, isLoading }) => {
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    column: number | null;
    direction: 'asc' | 'desc';
  }>({ column: null, direction: 'asc' });

  const displayRows = showAll ? csvData.rows : csvData.rows.slice(0, 15);

  const sortedAndFilteredRows = useMemo(() => {
    let result = [...displayRows];
    
    // Apply sorting
    if (sortConfig.column !== null) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.column!];
        const bVal = b[sortConfig.column!];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Apply filtering
    if (searchTerm) {
      result = result.filter(row =>
        row.some(cell => 
          cell.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return result;
  }, [displayRows, sortConfig, searchTerm]);

  const handleSort = (columnIndex: number) => {
    setSortConfig(current => ({
      column: columnIndex,
      direction: current.column === columnIndex && current.direction === 'asc' 
        ? 'desc' 
        : 'asc'
    }));
  };

  if (isLoading) {
    return <div className="mt-4 p-4 text-center">Loading CSV data...</div>;
  }

  return (
    <div className="mt-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search in table..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
      </div>
      <div className="overflow-x-auto max-h-[400px]">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {csvData.headers.map((header, index) => (
                <th 
                  key={index} 
                  className="border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center justify-between">
                    {header}
                    {sortConfig.column === index && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-300 px-4 py-2">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {csvData.rows.length > 15 && (
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {sortedAndFilteredRows.length} of {csvData.rows.length} rows
          </span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        </div>
      )}
    </div>
  );
};