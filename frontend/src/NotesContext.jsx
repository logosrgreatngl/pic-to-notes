import React, { createContext, useState } from 'react';

export const NotesContext = createContext();

export const NotesProvider = ({ children }) => {
  const [notesData, setNotesData] = useState({
    notes: [],
    mcqs: [],
    shortQuestions: [],
    rawText: '',
    strategy: '',
    usedKb: []
  });

  return (
    <NotesContext.Provider value={{ notesData, setNotesData }}>
      {children}
    </NotesContext.Provider>
  );
};