import React, { useContext, useState } from 'react';
import { NotesContext } from '../NotesContext';

function NotesPage() {
  const { notesData } = useContext(NotesContext);
  const [viewMode, setViewMode] = useState('readable');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const notesText = notesData.notes.map(note => {
      const title = note.title || note.heading || '';
      const points = note.points || note.content || [];
      return `${title}\n${points.join('\n')}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(notesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const notesText = notesData.notes.map(note => {
      const title = note.title || note.heading || '';
      const points = note.points || note.content || [];
      return `# ${title}\n${points.map(p => {
        if (p.startsWith('•')) return `  ${p}`;
        if (p.endsWith(':')) return `\n## ${p}`;
        return `- ${p}`;
      }).join('\n')}`;
    }).join('\n\n');
    
    const blob = new Blob([notesText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPoint = (point, index) => {
    // Check if it's a sub-heading (ends with colon)
    if (point.endsWith(':')) {
      return (
        <li key={index} className="list-none mt-4 mb-2">
          <h4 className="font-semibold text-yellow-300">{point}</h4>
        </li>
      );
    }
    
    // Check if it's a sub-point (starts with bullet)
    if (point.startsWith('•')) {
      return (
        <li key={index} className="list-none ml-6 text-gray-400">
          {point}
        </li>
      );
    }
    
    // Regular point
    return (
      <li key={index} className="text-gray-300">
        {point}
      </li>
    );
  };

  if (!notesData.notes || notesData.notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">description</span>
          <p className="text-xl text-gray-400">No notes available yet</p>
          <p className="text-sm text-gray-500 mt-2">Upload an image or PDF to generate notes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button 
            onClick={() => setViewMode('readable')}
            className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
              viewMode === 'readable' 
                ? 'bg-gray-800 border-gray-700' 
                : 'border-transparent hover:bg-gray-800'
            }`}
          >
            Readable
          </button>
          <button 
            onClick={() => setViewMode('compact')}
            className={`text-sm font-medium px-4 py-2 rounded-lg ml-2 transition-colors ${
              viewMode === 'compact' 
                ? 'bg-gray-800 border-gray-700' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            Compact
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 min-w-[84px] cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-800 border border-gray-700 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button 
            onClick={downloadMarkdown}
            className="flex items-center gap-2 min-w-[84px] cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-800 border border-gray-700 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Save Notes</span>
          </button>
        </div>
      </div>

      <div className={`${viewMode === 'compact' ? 'space-y-4' : 'space-y-8'}`}>
        {notesData.notes.map((note, index) => {
          const title = note.title || note.heading || `Section ${index + 1}`;
          const points = note.points || note.content || [];
          
          return (
            <div key={index} className={`bg-gray-800 rounded-2xl shadow-lg ${viewMode === 'compact' ? 'p-4' : 'p-6'} space-y-4`}>
              <h3 className={`${viewMode === 'compact' ? 'text-lg' : 'text-xl'} font-bold text-yellow-400`}>
                {title}
              </h3>
              
              {/* Main definition/concept if it's the first point */}
              {points.length > 0 && !points[0].endsWith(':') && !points[0].startsWith('•') && (
                <p className="text-gray-300 italic border-l-4 border-yellow-400/30 pl-4 mb-4">
                  {points[0]}
                </p>
              )}
              
              <ul className={`list-disc list-inside ${viewMode === 'compact' ? 'space-y-1 text-sm' : 'space-y-2'} pl-2`}>
                {points.slice(points[0] && !points[0].endsWith(':') && !points[0].startsWith('•') ? 1 : 0).map((point, pIndex) => 
                  renderPoint(point, pIndex)
                )}
              </ul>
              
              {note.images && note.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {note.images.map((img, imgIndex) => (
                    <img 
                      key={imgIndex}
                      alt={`Note illustration ${imgIndex + 1}`} 
                      className="rounded-lg object-cover w-full h-40" 
                      src={img}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NotesPage;