/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBookOpen, FaPaperPlane, FaWandMagicSparkles } from 'react-icons/fa6';
import { FaFeatherAlt,FaRedo  } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CheckboxItem = React.memo(({ id, label, checked, onChange, color, icon }) => (
  <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${checked ? `border-${color}-500 bg-${color}-50 shadow-sm` : 'border-transparent bg-white hover:bg-gray-50'}`}>
    {icon}
    <input type="checkbox" className={`form-checkbox h-5 w-5 ml-3 text-${color}-500 rounded focus:ring-${color}-400 border-gray-300`} checked={checked} onChange={() => onChange(id)} />
    <span className="ml-3 text-gray-700 font-medium">{label}</span>
  </label>
));

const ChatMessage = React.memo(({ msg }) => {
    const isUser = msg.role === 'user';
    return(
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-md ${isUser ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {isUser ? 'Y' : <FaWandMagicSparkles />}
            </div>
            <div className={`max-w-xl p-4 rounded-xl prose prose-sm prose-slate ${isUser ? 'bg-blue-500 text-white prose-invert' : 'bg-gray-100 text-gray-800'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
        </div>
    );
});

const TypingIndicator = React.memo(() => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-purple-500 text-white font-bold shadow-md">
            <FaWandMagicSparkles />
        </div>
        <div className="max-w-md p-3 rounded-xl bg-gray-200 text-gray-800 flex items-center gap-2">
            <div className="flex gap-1.5 p-1">
                {[0,1,2].map(i => (
                    <motion.div key={i} className="w-2 h-2 bg-gray-500 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.9, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }} />
                ))}
            </div>
        </div>
    </div>
  </motion.div>
));

const StudyAssistantPage = () => {
  const [syllabyList, setSyllabyList] = useState([]);
  const [noteList, setNoteList] = useState([]);
  const [selectedSyllabyIds, setSelectedSyllabyIds] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState('');

  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const formatErrorMessage = (err) => {
    if (err.response?.data?.detail) return err.response.data.detail;
    if (err.message) return `Network error: ${err.message}`;
    return "An unexpected error occurred.";
  };

  useEffect(() => {
    const fetchContentSources = async () => {
      setLoadingContent(true);
      try {
        const [syllabyRes, notesRes] = await Promise.all([
          api.get('/syllaby'),
          api.get('/notes')
        ]);
        setSyllabyList(syllabyRes.data);
        setNoteList(notesRes.data);
      } catch (err) {
        toast.error(formatErrorMessage(err));
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContentSources();
  }, []);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatHistory]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userMessage]);

  const handleToggle = (id, type) => {
    const stateSetter = type === 'syllaby' ? setSelectedSyllabyIds : setSelectedNoteIds;
    stateSetter(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleStartOrUpdateChat = async () => {
    if (selectedSyllabyIds.length === 0 && selectedNoteIds.length === 0) {
      toast.error('Please select at least one study material.');
      return;
    }

    setLoadingSession(true);
    try {
      const { data } = await api.post('/ai/chat/start', {
        syllaby_ids: selectedSyllabyIds,
        note_ids: selectedNoteIds,
      });
      setChatSessionId(data.session_id);
      setChatHistory([{ role: 'assistant', content: data.initial_message }]);
    } catch (err) {
      toast.error(formatErrorMessage(err));
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim() || !chatSessionId) return;

    const messageToSend = userMessage.trim();
    setUserMessage('');
    
    setChatHistory(prev => [...prev, { role: 'user', content: messageToSend }]);
    setLoadingMessage(true);

    try {
      const { data } = await api.post(`/ai/chat/${chatSessionId}/message`, { user_message: messageToSend });
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.assistant_message }]);
    } catch (err) {
      toast.error(formatErrorMessage(err));
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setLoadingMessage(false);
    }
  };

  const handleChangeContext = () => setChatSessionId(null);
  const handleResetChat = () => {
    setChatSessionId(null);
    setChatHistory([]);
    setSelectedSyllabyIds([]);
    setSelectedNoteIds([]);
  };

  const hasContent = syllabyList.length > 0 || noteList.length > 0;

  return (
    <div className="h-screen w-full relative bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-200 font-sans flex flex-col p-4 md:p-8">
      <Toaster position="top-right" />
      
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-gray-800">AI Study Assistant</h1>
        <p className="text-lg text-gray-600 mt-2">Your personal tutor, powered by your own study materials.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto min-h-0">
        <motion.div layout className="md:w-1/3 lg:w-1/4 flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Study Context</h2>
          {loadingContent ? <p>Loading library...</p> : !hasContent ? <p>Create a Syllaby or Note to get started!</p> :
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {syllabyList.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Syllabi</h3>
                    {syllabyList.map(s => <CheckboxItem key={s.id} id={s.id} label={s.title} checked={selectedSyllabyIds.includes(s.id)} onChange={(id) => handleToggle(id, 'syllaby')} color="blue" icon={<FaBookOpen className="text-blue-500"/>} />)}
                </div>
              )}
              {noteList.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
                    {noteList.map(n => <CheckboxItem key={n.id} id={n.id} label={n.title} checked={selectedNoteIds.includes(n.id)} onChange={(id) => handleToggle(id, 'note')} color="purple" icon={<FaFeatherAlt className="text-purple-500"/>}/>)}
                </div>
              )}
            </div>
          }
          <div className="mt-4 pt-4 border-t">
            <button onClick={handleStartOrUpdateChat} className="w-full bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-2.5 px-4 rounded-lg shadow hover:shadow-md transform hover:scale-105 transition flex items-center justify-center disabled:opacity-60" disabled={loadingSession || (selectedSyllabyIds.length === 0 && selectedNoteIds.length === 0)}>
              {loadingSession ? "Starting..." : chatSessionId ? "Update Context" : "Start Session"}
            </button>
            {chatSessionId && <button onClick={handleResetChat} className="mt-2 w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"><FaRedo/> Reset Chat</button>}
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col h-full bg-white/60 backdrop-blur-md rounded-2xl border shadow-lg p-4 min-h-0">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-6">
            <AnimatePresence>
              {chatHistory.map((msg, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <ChatMessage msg={msg} />
                </motion.div>
              ))}
            </AnimatePresence>
            {loadingMessage && <TypingIndicator />}
            {!chatSessionId && (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                    <FaWandMagicSparkles className="text-5xl mb-4" />
                    <p className="font-semibold">Select your study materials</p>
                    <p className="text-sm">Then click "Start Session" to begin chatting!</p>
                </div>
            )}
          </div>
          <form onSubmit={handleSendMessage} className="mt-4 flex gap-3 border-t pt-4">
            <textarea ref={textareaRef} rows="1" className="flex-grow bg-gray-100 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-400 border-transparent resize-none disabled:bg-gray-200 max-h-40" placeholder={!chatSessionId ? "Select materials to begin..." : "Ask a question..."} value={userMessage} onChange={e => setUserMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} disabled={loadingMessage || !chatSessionId} />
            <button type="submit" className="bg-blue-500 text-white font-semibold px-5 rounded-lg hover:bg-blue-600 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={loadingMessage || !userMessage.trim() || !chatSessionId}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudyAssistantPage;