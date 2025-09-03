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

  const handleTabChange = (tab) => {
    if (!isUploading) {
      setActiveTab(tab);
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
      <div className="relative flex size-full min-h-screen flex-col group/design-root overflow-x-hidden bg-gray-900 text-gray-100">
        <div className="flex h-full grow flex-col">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-800 px-10 py-4">
            <div className="flex items-center gap-4 text-white">
              <svg className="size-6 text-yellow-400" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
              </svg>
              <h2 className="text-xl font-bold tracking-[-0.015em]">Pic-to-Notes</h2>
            </div>
            <nav className="flex flex-1 justify-center gap-2">
              <a 
                className={`px-4 py-2 text-sm font-medium leading-normal cursor-pointer ${
                  activeTab === 'upload' 
                    ? 'relative text-yellow-400 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-yellow-400' 
                    : 'text-gray-400 hover:text-white transition-colors duration-200'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleTabChange('upload')}
              >
                Upload
              </a>
              <a 
                className={`px-4 py-2 text-sm font-medium leading-normal cursor-pointer ${
                  activeTab === 'notes' 
                    ? 'relative text-yellow-400 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-yellow-400' 
                    : 'text-gray-400 hover:text-white transition-colors duration-200'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleTabChange('notes')}
              >
                Notes
              </a>
              <a 
                className={`px-4 py-2 text-sm font-medium leading-normal cursor-pointer ${
                  activeTab === 'mcqs' 
                    ? 'relative text-yellow-400 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-yellow-400' 
                    : 'text-gray-400 hover:text-white transition-colors duration-200'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleTabChange('mcqs')}
              >
                MCQs
              </a>
              <a 
                className={`px-4 py-2 text-sm font-medium leading-normal cursor-pointer ${
                  activeTab === 'shortqs' 
                    ? 'relative text-yellow-400 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-yellow-400' 
                    : 'text-gray-400 hover:text-white transition-colors duration-200'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleTabChange('shortqs')}
              >
                Short Qs
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleTabChange('upload')}
                disabled={isUploading}
                className={`flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-5 bg-yellow-400 text-gray-900 text-sm font-bold leading-normal tracking-[-0.01em] shadow-lg shadow-yellow-400/10 hover:bg-yellow-500 transition-colors duration-200 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="truncate">Upload</span>
              </button>
            </div>
          </header>
          <main className="flex flex-1 p-8">
            <div className="flex-1 pr-8">
              {renderPage()}
            </div>
            <ChatPanel />
          </main>
        </div>
      </div>
    </NotesProvider>
  );
}

export default App;