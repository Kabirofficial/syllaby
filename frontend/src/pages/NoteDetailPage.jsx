/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { FaEdit, FaSave, FaTrash, FaBrain, FaArrowLeft } from 'react-icons/fa';

const Flashcard = ({ card }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border min-h-40 flex flex-col">
      <p className="font-semibold text-gray-800 pb-2">{card.front}</p>
      <hr className="border-gray-200" />
      <p className="text-gray-600 pt-2 flex-grow">{card.back}</p>
    </div>
  );
};

const NoteDetailPage = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  const fetchNote = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/notes/${noteId}`);
      setNote(response.data);
      setEditedTitle(response.data.title);
      setEditedContent(response.data.original_content);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch note.');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleReprocess = async (action) => {
    setIsProcessing(true);
    const toastId = toast.loading(`Regenerating ${action.replace('-', ' ')}...`);
    try {
      const response = await api.post(`/ai/process-note/${noteId}`, { action });
      setNote(response.data);
      toast.success('Content regenerated successfully!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to regenerate content.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedTitle.trim()) return toast.error('Title cannot be empty.');

    const toastId = toast.loading('Saving changes...');
    try {
      const updateData = {
        title: editedTitle,
        original_content: editedContent,
      };
      const response = await api.put(`/notes/${noteId}`, updateData);
      setNote(response.data);
      setIsEditing(false);
      toast.success('Note updated successfully!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update note.', { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this note?')) {
      const toastId = toast.loading('Deleting note...');
      try {
        await api.delete(`/notes/${noteId}`);
        toast.success('Note deleted!', { id: toastId });
        navigate('/notes');
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to delete note.', { id: toastId });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-gray-50"><p>Loading note...</p></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen bg-gray-50 text-red-500"><p>{error}</p></div>;
  }

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 bg-gray-50">
      <Toaster position="top-right" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-4xl font-extrabold text-[#1F2937] w-full border-b-2 border-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <h1 className="text-4xl font-extrabold text-[#1F2937]">{note.title}</h1>
              )}
              <Link to="/notes" className="text-indigo-600 hover:underline flex items-center gap-2 mt-2">
                <FaArrowLeft /> Back to all notes
              </Link>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isEditing ? (
                <button onClick={handleSaveChanges} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700">
                  <FaSave /> Save
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center gap-2 hover:bg-indigo-700">
                  <FaEdit /> Edit
                </button>
              )}
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700">
                <FaTrash /> Delete
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Original Content</h2>
              {isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                  className="w-full border-gray-300 rounded-md p-4 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap text-gray-700 max-h-[60vh] overflow-y-auto">
                  {note.original_content}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <AnimatePresence>
                {note.summary && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-xl font-bold text-gray-800">AI Summary</h2>
                      <button onClick={() => handleReprocess('summary')} disabled={isProcessing} className="text-sm text-indigo-500 hover:underline disabled:opacity-50 flex items-center gap-1"><FaBrain/> Regenerate</button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.summary}</p>
                  </motion.div>
                )}

                {note.key_terms_rel?.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-xl font-bold text-gray-800">Key Terms</h2>
                      <button onClick={() => handleReprocess('key-terms')} disabled={isProcessing} className="text-sm text-indigo-500 hover:underline disabled:opacity-50 flex items-center gap-1"><FaBrain/> Regenerate</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {note.key_terms_rel.map((term) => (
                        <span key={term.id} className="bg-purple-600 text-white text-sm font-medium px-3 py-1 rounded-full">{term.term}</span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {note.flashcards_rel?.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-lg shadow-md border">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-xl font-bold text-gray-800">Flashcards</h2>
                      <button onClick={() => handleReprocess('flashcards')} disabled={isProcessing} className="text-sm text-indigo-500 hover:underline disabled:opacity-50 flex items-center gap-1"><FaBrain/> Regenerate</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {note.flashcards_rel.map((card) => <Flashcard key={card.id} card={card} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetailPage;