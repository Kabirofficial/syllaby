/* eslint-disable no-unused-vars */
import React, { useState, useRef } from 'react';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { FaBrain, FaSave, FaTrash } from 'react-icons/fa';

const Flashcard = ({ card }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border min-h-40 flex flex-col">
      <p className="font-semibold text-gray-800 pb-2">{card.front}</p>
      <hr className="border-gray-200" />
      <p className="text-gray-600 pt-2 flex-grow">{card.back}</p>
    </div>
  );
};

const NotesPage = () => {
  const [noteTitle, setNoteTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [keyTerms, setKeyTerms] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleProcessAll = async () => {
    if (content.length < 50) {
      toast.error('Please enter at least 50 characters of content to process.');
      inputRef.current?.focus();
      return;
    }
    
    setIsProcessing(true);
    const toastId = toast.loading('Processing with AI...');
    
    try {
      const { data } = await api.post('/ai/process-content', { content });
      setSummary(data.summary || '');
      setKeyTerms(data.key_terms || []);
      setFlashcards(data.flashcards || []);
      toast.success('AI processing complete!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process content.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return toast.error('Please enter a title for your note.');
    if (content.length < 50) return toast.error('Content must be at least 50 characters.');

    setIsSaving(true);
    const toastId = toast.loading('Saving your note...');
    
    try {
      const noteData = { 
        title: noteTitle, 
        original_content: content, 
        summary, 
        key_terms: keyTerms.map(kt => typeof kt === 'object' && kt.term ? kt.term : kt), 
        flashcards 
      };

      const { data } = await api.post('/notes', noteData);
      toast.success('Note saved successfully!', { id: toastId });
      navigate(`/notes/${data.id}`);
    } catch (err) {
      let errorMessage = 'Failed to save note.'; 
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail[0].msg || errorMessage;
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    setNoteTitle('');
    setContent('');
    setSummary('');
    setKeyTerms([]);
    setFlashcards([]);
  };

  const isDisabled = isProcessing || isSaving;
  const hasGeneratedContent = summary || keyTerms.length > 0 || flashcards.length > 0;

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <Toaster position="top-right" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-[#1F2937] mb-4">Smart Notes & Flashcards</h1>
            <p className="text-lg text-gray-600 mb-8">Paste your text to get AI-powered summaries, key terms, and flashcards.</p>
        </div>
        
        <div className="space-y-6 bg-white p-8 rounded-xl shadow-lg">
            <div>
                <label className="block text-lg font-semibold text-[#1F2937] mb-2">Note Title</label>
                <input type="text" className="w-full border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Chapter 3: Photosynthesis" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} disabled={isDisabled} />
            </div>

            <div>
                <label className="block text-lg font-semibold text-[#1F2937] mb-2">Your Content</label>
                <textarea ref={inputRef} rows="12" className="w-full border-gray-300 rounded-md p-4 focus:ring-indigo-500 focus:border-indigo-500 resize-y" placeholder="Paste text here (min 50 characters)." value={content} onChange={(e) => setContent(e.target.value)} disabled={isDisabled} />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition" disabled={isDisabled}><FaTrash /> Clear</button>
                <button onClick={handleProcessAll} className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-md shadow hover:bg-indigo-700 transition disabled:opacity-50" disabled={isDisabled || content.length < 50}><FaBrain /> Process with AI</button>
            </div>
        </div>

        <AnimatePresence>
          {hasGeneratedContent && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10 space-y-8">
              {summary && <div className="bg-white p-6 rounded-lg shadow-md"><h2 className="text-2xl font-bold text-gray-800 mb-3">Summary</h2><p className="text-gray-700 whitespace-pre-wrap">{summary}</p></div>}
              {keyTerms.length > 0 && <div className="bg-white p-6 rounded-lg shadow-md"><h2 className="text-2xl font-bold text-gray-800 mb-3">Key Terms</h2><div className="flex flex-wrap gap-2">{keyTerms.map((term, i) => <span key={i} className="bg-purple-600 text-white text-sm font-medium px-3 py-1 rounded-full">{typeof term === 'object' ? term.term : term}</span>)}</div></div>}
              {flashcards.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Flashcards</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashcards.map((card, i) => <Flashcard key={i} card={card} />)}
                  </div>
                </div>
              )}
              <div className="flex justify-center mt-8 py-6"><button onClick={handleSaveNote} className="flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700 transition disabled:opacity-50" disabled={isDisabled || !noteTitle.trim() || content.length < 50}><FaSave/> {isSaving ? 'Saving...' : 'Save Note'}</button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotesPage;