import React, { useState } from 'react';
import { NotesProvider } from './NotesContext';
import UploadPage from './components/UploadPage';
import NotesPage from './components/NotesPage';
import MCQsPage from './components/MCQsPage';
import ShortQsPage from './components/ShortQsPage';
import ChatPanel from './components/ChatPanel';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleTabChange = (tab) => {
    if (!isUploading) {
      setActiveTab(tab);
      setShowChat(false); // Close chat when switching tabs on mobile
    }
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadPage 
          onFileUploaded={setUploadedFile}
          onUploadStart={() => setIsUploading(true)}
          onUploadComplete={() => {
            setUploadComplete(true);
            setIsUploading(false);
            setTimeout(() => setActiveTab('notes'), 2000);
          }}
        />;
      case 'notes':
        return <NotesPage />;
      case 'mcqs':
        return <MCQsPage />;
      case 'shortqs':
        return <ShortQsPage />;
      default:
        return <UploadPage onFileUploaded={setUploadedFile} />;
    }
  };

  return (
    <NotesProvider>
      <div className="relative flex size-full min-h-screen flex-col bg-gray-900 text-gray-100">
        <div className="flex h-full grow flex-col">
          {/* Mobile-friendly header */}
          <header className="flex items-center justify-between border-b border-solid border-gray-800 px-4 sm:px-10 py-4">
            <div className="flex items-center gap-2 sm:gap-4 text-white">
              <svg className="size-5 sm:size-6 text-yellow-400" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
              </svg>
              <h2 className="text-lg sm:text-xl font-bold tracking-[-0.015em]">Pic-to-Notes</h2>
            </div>
            
            {/* Mobile chat toggle - IMPROVED */}
            <button 
              onClick={() => setShowChat(!showChat)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-yellow-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-yellow-500 transition-colors min-h-[44px]"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span className="font-semibold">Chat</span>
            </button>
            
            {/* Desktop upload button */}
            <button 
              onClick={() => handleTabChange('upload')}
              disabled={isUploading}
              className={`hidden lg:flex min-w-[84px] cursor-pointer items-center justify-center rounded-xl h-10 px-5 bg-yellow-400 text-gray-900 text-sm font-bold transition-colors duration-200 ${
                isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-500'
              }`}
            >
              <span className="truncate">Upload</span>
            </button>
          </header>

          {/* Mobile navigation */}
          <nav className="lg:hidden flex overflow-x-auto border-b border-gray-800 px-2 bg-gray-800/50">
            {[
              { key: 'upload', label: 'Upload', icon: 'upload' },
              { key: 'notes', label: 'Notes', icon: 'description' },
              { key: 'mcqs', label: 'MCQs', icon: 'quiz' },
              { key: 'shortqs', label: 'Short Qs', icon: 'help_outline' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors min-h-[60px] ${
                  activeTab === tab.key 
                    ? 'text-yellow-400 border-b-2 border-yellow-400' 
                    : 'text-gray-400 hover:text-white'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleTabChange(tab.key)}
                disabled={isUploading}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex flex-1 justify-center gap-2 border-b border-gray-800 px-10 py-2">
            {[
              { key: 'upload', label: 'Upload' },
              { key: 'notes', label: 'Notes' },
              { key: 'mcqs', label: 'MCQs' },
              { key: 'shortqs', label: 'Short Qs' }
            ].map(tab => (
              <a
                key={tab.key}
                className={`px-4 py-2 text-sm font-medium leading-normal cursor-pointer transition-colors duration-200 ${
                  activeTab === tab.key 
                    ? 'relative text-yellow-400 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-yellow-400' 
                    : 'text-gray-400 hover:text-white'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </a>
            ))}
          </nav>

          {/* Main content area */}
          <main className="flex flex-1 relative overflow-hidden">
            {/* Page content */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:pr-8 overflow-y-auto">
              {renderPage()}
            </div>
            
            {/* Desktop chat panel */}
            <div className="hidden lg:block">
              <ChatPanel />
            </div>
          </main>
          
          {/* Mobile chat overlay - COMPLETELY REDESIGNED */}
          {showChat && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-50" 
                onClick={() => setShowChat(false)}
              ></div>
              
              {/* Chat panel - slides from bottom */}
              <div className="relative w-full h-full flex flex-col bg-gray-900 animate-slide-up">
                {/* Chat header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
                  <h3 className="text-lg font-bold text-white">Study Assistant</h3>
                  <button 
                    onClick={() => setShowChat(false)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white">close</span>
                  </button>
                </div>
                
                {/* Chat content */}
                <div className="flex-1 overflow-hidden">
                  <ChatPanel isMobile={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </NotesProvider>
  );
}

export default App;
