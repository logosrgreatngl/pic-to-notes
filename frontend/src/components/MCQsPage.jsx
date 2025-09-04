import React, { useContext, useState } from 'react';
import { NotesContext } from '../NotesContext';

function MCQsPage() {
  const { notesData } = useContext(NotesContext);
  const [revealedAnswers, setRevealedAnswers] = useState({});

  const toggleAnswer = (index) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Debug: Log the data to see what we're getting
  console.log('MCQs data:', notesData.mcqs);

  if (!notesData.mcqs || notesData.mcqs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-96">
        <div className="text-center">
           <span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-600 mb-4">quiz</span>
          <p className="text-lg sm:text-xl text-gray-400">No MCQs available yet</p>
          <p className="text-sm text-gray-500 mt-2">Upload an image or PDF to generate MCQs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Multiple Choice Questions</h2>
      
      {notesData.mcqs.map((mcq, index) => {
        const question = mcq.question || '';
        const options = mcq.options || [];
        const correctAnswer = mcq.correctAnswer || '';
        const correctIndex = mcq.correctIndex !== undefined ? mcq.correctIndex : -1;

        // Skip if no question
        if (!question) return null;

        return (
          <details key={index} className="group bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 ease-in-out overflow-hidden" open={index === 0}>
            <summary className="flex cursor-pointer items-center justify-between p-4 sm:p-6 tap-target">
              <p className="text-base sm:text-lg font-semibold flex-1 pr-4 break-words">
                <span className="text-yellow-400 mr-2">Q{index + 1}.</span>
                {question}
              </p>
              <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180 text-gray-400">expand_more</span>
            </summary>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              {options.length > 0 ? (
                <div className="space-y-3">
                  {options.map((option, optIndex) => {
                    const isCorrect = option === correctAnswer || optIndex === correctIndex;
                    return (
                      <div
                        key={optIndex}
                        className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-colors flex items-center justify-between cursor-pointer tap-target ${
                          revealedAnswers[index] && isCorrect
                            ? 'bg-green-500/20 border-green-500'
                            : revealedAnswers[index] && !isCorrect
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'border-gray-700 hover:bg-gray-700/50'
                        }`}
                      >
                        <span className="flex items-center gap-3 flex-1">
                          <span className="text-gray-400 font-semibold text-sm sm:text-base">{String.fromCharCode(65 + optIndex)}.</span>
                          <span className="text-sm sm:text-base break-words">{option}</span>
                        </span>
                        {revealedAnswers[index] && isCorrect && (
                          <span className="material-symbols-outlined text-green-500 ml-2">check_circle</span>
                        )}
                        {revealedAnswers[index] && !isCorrect && (
                          <span className="material-symbols-outlined text-red-500/50 ml-2">cancel</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm sm:text-base">No options available for this question</p>
              )}
              
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                  onClick={() => toggleAnswer(index)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors tap-target w-full sm:w-auto ${
                    revealedAnswers[index] 
                      ? 'bg-gray-700 text-gray-400' 
                      : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                  }`}
                >
                  {revealedAnswers[index] ? '✓ Answer Revealed' : 'Reveal Answer'}
                </button>

                {revealedAnswers[index] && correctAnswer && (
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-xs text-gray-400 mb-1">Correct Answer:</p>
                    <p className="text-sm font-semibold text-green-400 break-words">{correctAnswer}</p>
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default MCQsPage;