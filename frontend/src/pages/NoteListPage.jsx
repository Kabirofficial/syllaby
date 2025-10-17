/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { motion } from 'framer-motion';

const NoteListPage = () => {
  const [noteList, setNoteList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNoteList = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/notes');
        setNoteList(response.data);
      } catch (err) {
        const errorMessage = err.response?.data?.detail || 'Failed to fetch notes.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchNoteList();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Note?')) {
      try {
        await api.delete(`/notes/${id}`);
        setNoteList(prev => prev.filter(note => note.id !== id));
        alert('Note deleted successfully!');
      } catch (err) {
        const errorMessage = err.response?.data?.detail || 'Failed to delete note.';
        setError(errorMessage);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] font-sans relative">
        <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
        <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
        <div className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
      <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-extrabold text-[#1F2937]">My Smart Notes</h1>
            <Link
              to="/notes/new"
              className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition duration-300 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Create New Note
            </Link>
          </div>

          <p className="text-lg text-gray-600 text-center mb-8">
            All your AI-processed content and flashcards in one place.
          </p>

          {error && (
            <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              {error}
            </p>
          )}

          {noteList.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <p className="text-xl text-gray-700 mb-4">You haven't saved any notes yet!</p>
              <Link
                to="/notes/new"
                className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition duration-300"
              >
                Create New Note
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {noteList.map((note, index) => (
                <motion.div
                  key={note.id}
                  className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between hover:shadow-xl transform hover:-translate-y-1 transition duration-300"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div>
                    <h2 className="text-2xl font-bold text-[#1F2937] mb-2 truncate">{note.title}</h2>
                    <p className="text-gray-700 text-sm mb-4 line-clamp-3">{note.original_content}</p>
                    {note.summary && <p className="text-gray-500 text-xs italic">Summary available</p>}
                    {note.key_terms && note.key_terms.length > 0 && <p className="text-gray-500 text-xs italic">Key terms available</p>}
                    {note.flashcards && note.flashcards.length > 0 && <p className="text-gray-500 text-xs italic">Flashcards available</p>}
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Link
                      to={`/notes/${note.id}`}
                      className="flex-grow bg-[#4A74C4] text-white text-center py-2 px-4 rounded-md text-sm font-semibold hover:bg-[#5E40B7] transition duration-200"
                    >
                      View Note
                    </Link>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="bg-red-500 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-red-600 transition duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteListPage;
