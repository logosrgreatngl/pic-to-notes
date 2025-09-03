import React, { useState, useContext, useRef, useEffect } from 'react';
import { NotesContext } from '../NotesContext';
import { API_BASE_URL } from '../config';

function ChatPanel() {
  const { notesData } = useContext(NotesContext);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: 'Hi! I\'m your study assistant. Ask me anything about your notes or the topics you\'re studying.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context: notesData.rawText || ''
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <aside className="flex flex-col w-[360px] bg-gray-800/60 rounded-2xl shadow-xl">
      <div className="border-b border-gray-700 p-4">
        <h3 className="text-lg font-bold leading-tight tracking-tight text-white">Study Assistant</h3>
      </div>
      
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full w-9 shrink-0 ${
              message.type === 'system' || message.type === 'ai' ? 'bg-gray-700' : ''
            }`}>
              {(message.type === 'system' || message.type === 'ai') && (
                <div className="w-9 h-9 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400 text-xl">school</span>
                </div>
              )}
              {message.type === 'user' && (
                <div className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">U</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 max-w-[80%]">
              <p className="text-sm font-medium text-gray-400">
                {message.type === 'system' || message.type === 'ai' ? 'Study Assistant' : 'You'}
              </p>
              <div className={`rounded-xl px-4 py-2.5 text-base font-normal leading-normal ${
                message.type === 'user' 
                  ? 'bg-yellow-400 text-gray-900 rounded-tr-none' 
                  : 'bg-gray-700 text-white rounded-tl-none'
              }`}>
                {message.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="bg-gray-700 rounded-full w-9 h-9 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400 text-xl">school</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-gray-400">Study Assistant</p>
              <div className="bg-gray-700 rounded-xl rounded-tl-none px-4 py-2.5">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-700 p-4">
        <div className="relative">
          <input 
            className="form-input w-full resize-none rounded-xl border-none bg-gray-700 py-3 pl-4 pr-12 text-base text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400"
            placeholder="Ask about your study material..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button 
            className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-gray-400 hover:text-yellow-400 transition-colors duration-200 disabled:opacity-50"
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ChatPanel;