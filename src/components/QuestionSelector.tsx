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

  const handleOptionSelect = (questionIndex: number, option: string, isSelectAll: boolean = false) => {
    const question = questions[questionIndex];
    
    if (isSelectAll) {
      if (option === 'select') {
        const validOptions = question.options
          .filter(opt => opt && opt.trim() !== '');
        onOptionsChange(questionIndex, validOptions);
        return;
      }
      if (option === 'deselect') {
        onOptionsChange(questionIndex, []);
        return;
      }
    }

    const optionStr = String(option);
    const newSelection = question.selectedOptions.includes(optionStr)
      ? question.selectedOptions.filter(opt => opt !== optionStr)
      : [...question.selectedOptions, optionStr];
    onOptionsChange(questionIndex, newSelection);
  };

  const handleAllQuestionsSelection = (shouldSelect: boolean) => {
    const updates = questions.map((question, index) => {
      const validOptions = question.options
        .filter(opt => opt && opt.trim() !== '');
      
      return {
        index,
        newSelection: shouldSelect ? validOptions : []
      };
    });

    updates.forEach(({ index, newSelection }) => {
      onOptionsChange(index, newSelection);
    });
  };

  const formatQuestionDisplay = (questionText: string, index: number) => {
    const displayNumber = index + 1;
    const questionOnly = questionText.split('?')[0] + '?';
    return `${displayNumber}. ${questionOnly}`;
  };

  const formatOptionDisplay = (option: string): string => {
    return option.trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end space-x-4 mb-4">
        <button
          type="button"
          onClick={() => handleAllQuestionsSelection(true)}
          className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
        >
          Select All Rows
        </button>
        <button
          type="button"
          onClick={() => handleAllQuestionsSelection(false)}
          className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
        >
          Deselect All Rows
        </button>
      </div>
      {questions.map((question, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => toggleQuestion(index)}
            >
              <h3 className="text-lg font-medium">
                {formatQuestionDisplay(question.questionText, index)}
              </h3>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleOptionSelect(index, 'select', true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleOptionSelect(index, 'deselect', true)}
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
              {question.options.filter(Boolean).map((option, optionIndex) => (
                <div
                  key={`${index}-${optionIndex}`}
                  onClick={() => handleOptionSelect(index, option)}
                  className={`p-3 cursor-pointer rounded-md border ${
                    question.selectedOptions.includes(option)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm block w-full">
                    {formatOptionDisplay(option)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};