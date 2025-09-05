import React, { useState, useContext, useRef, useEffect } from 'react';
import { NotesContext } from '../NotesContext';

function ChatPanel({ isMobile = false }) {
  const [inputMessage, setInputMessage] = useState('');
  
  // Show helpful message about chat being temporarily unavailable
  const messages = [
    {
      id: 1,
      type: 'system',
      text: 'Chat is temporarily unavailable due to a technical issue. Your main features (Upload → Notes → MCQs → Short Questions) are working perfectly! 🚀\n\nFor now, you can:\n• Upload images to get structured notes\n• Generate MCQs for practice\n• Create short answer questions\n• Download your notes\n\nWe\'ll have chat working soon!',
      timestamp: new Date()
    }
  ];

  const sendMessage = () => {
    // Show a helpful message instead of trying to send
    alert('Chat is temporarily unavailable, but all your main features are working great! 📚\n\nTry uploading an image to see your notes, MCQs, and short questions.');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <aside className={`flex flex-col bg-gray-800/60 rounded-2xl shadow-xl ${
      isMobile 
        ? 'w-full h-full rounded-none' 
        : 'w-full lg:w-[360px] h-full lg:h-auto'
    }`}>
      <div className="border-b border-gray-700 p-4">
        <h3 className="text-lg font-bold leading-tight tracking-tight text-white">Study Assistant</h3>
        <p className="text-xs text-yellow-400 mt-1">Temporarily unavailable</p>
      </div>
      
      <div className={`flex-1 space-y-4 overflow-y-auto p-4 ${
        isMobile ? 'pb-safe' : ''
      }`} style={{ maxHeight: isMobile ? 'calc(100vh - 140px)' : '70vh' }}>
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            <div className="bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-400 text-lg">info</span>
            </div>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              <p className="text-xs font-medium text-gray-400">System</p>
              <div className="bg-gray-700 rounded-xl rounded-tl-none px-4 py-3 text-sm font-normal leading-normal break-words text-white whitespace-pre-line">
                {message.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={`border-t border-gray-700 p-4 ${isMobile ? 'pb-safe' : ''}`}>
        <div className="relative">
          <input 
            className={`form-input w-full resize-none rounded-xl border-none bg-gray-600 text-gray-400 placeholder:text-gray-500 cursor-not-allowed ${
              isMobile ? 'py-4 pl-4 pr-16 text-base' : 'py-3 pl-4 pr-12 text-sm'
            }`}
            placeholder="Chat temporarily unavailable - main features working great!"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={true}
          />
          <button 
            className={`absolute inset-y-0 right-0 flex items-center justify-center text-gray-500 cursor-not-allowed ${
              isMobile ? 'px-4 min-w-[60px]' : 'px-4'
            }`}
            onClick={sendMessage}
            disabled={true}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ChatPanel;