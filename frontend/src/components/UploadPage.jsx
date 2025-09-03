import React, { useState, useContext } from 'react';
import { NotesContext } from '../NotesContext';
import { API_BASE_URL } from '../config';

function UploadPage({ onFileUploaded, onUploadComplete, onUploadStart }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [strategy, setStrategy] = useState('');
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { setNotesData } = useContext(NotesContext);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleFile = (selectedFile) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PNG, JPG, or PDF file');
      return;
    }
    setFile(selectedFile);
    setError('');
    uploadFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const uploadFile = async (fileToUpload) => {
    setUploading(true);
    setProgress(0);
    setStrategy('');
    setUploadSuccess(false);
    
    if (onUploadStart) {
      onUploadStart();
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${API_BASE_URL}/notes-from-image`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setStrategy(data.strategy || 'unknown');
      
      // Parse the notes_md JSON string - matching YOUR backend schema
      let parsedNotes;
      try {
        parsedNotes = JSON.parse(data.notes_md);
      } catch (e) {
        console.error('Failed to parse notes:', e);
        parsedNotes = { notes: [], mcqs: [], shortQuestions: [] };
      }

      // Transform backend schema to frontend format
      const transformedNotes = parsedNotes.notes ? parsedNotes.notes.map(note => ({
        title: note.heading || note.title || '',
        points: note.points || []
      })) : [];

      const transformedMCQs = parsedNotes.mcqs ? parsedNotes.mcqs.map(mcq => ({
        question: mcq.q || mcq.question || '',
        options: mcq.options || [],
        correctAnswer: mcq.answer || '',
        correctIndex: mcq.options ? mcq.options.indexOf(mcq.answer) : -1
      })) : [];

      setNotesData({
        notes: transformedNotes,
        mcqs: transformedMCQs,
        shortQuestions: parsedNotes.shortQuestions || [],
        rawText: data.notes_md,
        strategy: data.strategy,
        usedKb: data.used_kb || []
      });

      if (onFileUploaded) {
        onFileUploaded(fileToUpload);
      }

      setUploadSuccess(true);
      
      // Call onUploadComplete after showing success message
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete();
        }
        setUploading(false);
        setUploadSuccess(false);
        setFile(null);
        setProgress(0);
      }, 1500);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
      if (onUploadStart) {
        onUploadStart(); // Reset uploading state in parent
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">Upload your files</h1>
        <p className="text-gray-400 text-lg mt-2">
          Drag and drop your files here, or select files from your computer. Supported formats: PNG, JPG, PDF.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div 
        className="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/50 p-16 shadow-inner cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !uploading && document.getElementById('fileInput').click()}
      >
        <input
          id="fileInput"
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-500">cloud_upload</span>
          <p className="text-xl font-bold leading-tight tracking-tight text-white">
            {file ? file.name : 'Drag and drop files here'}
          </p>
          <p className="text-gray-400">or</p>
          <button 
            className="mt-2 flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-gray-700 text-white text-base font-bold leading-normal tracking-[-0.01em] hover:bg-gray-600 transition-colors duration-200"
            disabled={uploading}
            type="button"
          >
            <span className="truncate">Select Files</span>
          </button>
        </div>
      </div>

      {uploading && (
        <div className="flex flex-col gap-4 rounded-2xl bg-gray-800/60 p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative flex h-5 w-5 items-center justify-center">
              <div className="absolute h-full w-full animate-spin rounded-full border-2 border-dashed border-yellow-400"></div>
              <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
            </div>
            <p className="text-base font-medium leading-normal text-white">Processing...</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-gray-700">
              <div 
                className="h-2 rounded-full bg-yellow-400 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-400">{progress}%</span>
          </div>
          {strategy && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-700/50 px-3 py-1.5 self-start">
              <p className="text-xs font-medium text-gray-300">Extraction Strategy:</p>
              <span className="text-xs font-semibold text-yellow-400">{strategy}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" title="Confidence: High"></span>
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
              <p className="text-green-400 font-medium text-center">
                <span className="material-symbols-outlined align-middle mr-2">check_circle</span>
                Upload complete! Your notes are ready.
              </p>
              <p className="text-green-400/80 text-sm text-center mt-1">Redirecting to Notes page...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadPage;