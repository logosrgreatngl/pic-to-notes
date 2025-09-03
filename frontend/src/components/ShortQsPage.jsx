import React, { useContext } from 'react';
import { NotesContext } from '../NotesContext';

function ShortQsPage() {
  const { notesData } = useContext(NotesContext);

  // Debug: Log the data to see what we're getting
  console.log('Short Questions data:', notesData.shortQuestions);

  if (!notesData.shortQuestions || notesData.shortQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">help_outline</span>
          <p className="text-xl text-gray-400">No short questions available yet</p>
          <p className="text-sm text-gray-500 mt-2">Upload an image or PDF to generate questions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Short Answer Questions</h2>
      
      {notesData.shortQuestions.map((sq, index) => {
        // Handle both 'question' and 'q' field names
        const question = sq.question || sq.q || '';
        const answer = sq.answer || sq.a || '';

        // Skip if no question
        if (!question) return null;

        return (
          <details key={index} className="group bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out">
            <summary className="flex items-center justify-between p-6 cursor-pointer">
              <h3 className="text-xl font-semibold">
                <span className="text-yellow-400 mr-2">Q{index + 1}.</span>
                {question}
              </h3>
              <span className="material-symbols-outlined text-gray-400 group-open:rotate-180 transition-transform duration-300">
                expand_more
              </span>
            </summary>
            <div className="px-6 pb-6 pt-0">
              <p className="text-gray-300 leading-relaxed">{answer}</p>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default ShortQsPage;