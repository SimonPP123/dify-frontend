import { QuestionSection } from '../types/workflow';
import { useState } from 'react';

interface QuestionSelectorProps {
  questions: QuestionSection[];
  onOptionsChange: (questionIndex: number, selectedOptions: string[]) => void;
  error?: string;
}

export const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  questions,
  onOptionsChange,
  error
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSelectAll = (questionIndex: number) => {
    onOptionsChange(questionIndex, [...questions[questionIndex].options]);
  };

  const handleDeselectAll = (questionIndex: number) => {
    onOptionsChange(questionIndex, []);
  };

  const handleGlobalSelectAll = () => {
    questions.forEach((_, index) => {
      handleSelectAll(index);
    });
  };

  const handleGlobalDeselectAll = () => {
    questions.forEach((_, index) => {
      handleDeselectAll(index);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end space-x-4 mb-4">
        <button
          type="button"
          onClick={handleGlobalSelectAll}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Select All Options
        </button>
        <button
          type="button"
          onClick={handleGlobalDeselectAll}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
        >
          Deselect All Options
        </button>
      </div>

      {questions.map((question, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => toggleQuestion(index)}
            >
              <h3 className="text-lg font-medium">{question.question}</h3>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleSelectAll(index)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleDeselectAll(index)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Deselect All
              </button>
              <svg 
                className={`h-5 w-5 transform transition-transform ${
                  expandedQuestions.includes(index) ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {expandedQuestions.includes(index) && (
            <div className="grid grid-cols-3 gap-3">
              {question.options.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    const newSelection = question.selectedOptions.includes(option)
                      ? question.selectedOptions.filter(opt => opt !== option)
                      : [...question.selectedOptions, option];
                    onOptionsChange(index, newSelection);
                  }}
                  className={`p-3 cursor-pointer rounded-md border ${
                    question.selectedOptions.includes(option)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  } transition-colors duration-200 ease-in-out flex items-center justify-between`}
                >
                  <span className="text-sm truncate">{option}</span>
                  {question.selectedOptions.includes(option) && (
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
        </div>
      ))}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};