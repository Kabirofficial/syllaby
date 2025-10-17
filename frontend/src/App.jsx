import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CreateSyllabyPage from './pages/CreateSyllabyPage';
import SyllabyListPage from './pages/SyllabyListPage';
import SyllabyDetailPage from './pages/SyllabyDetailPage';
import EditSyllabyPage from './pages/EditSyllabyPage';
import StudyAssistantPage from './pages/StudyAssistantPage';
import NoteListPage from './pages/NoteListPage';
import NoteDetailPage from './pages/NoteDetailPage';
import QuizGeneratorPage from './pages/QuizGeneratorPage';
import FreeFormQuizPage from './pages/FreeFormQuizPage';
import AIChatbotPage from './pages/AIChatbotPage';
import KanbanListPage from './pages/KanbanListPage'; 
import KanbanBoardPage from './pages/KanbanBoardPage';
import CalendarPage from './pages/CalendarPage';
import NotesPage from './pages/NotesPage';
import ProgressDashboardPage from './pages/ProgressDashboardPage';

function AppContent() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#F5F7FA] font-sans">
        <div className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">Loading Syllaby...</p>
        </div>
      </div>
    );
  }

  const AuthenticatedRoute = ({ children }) => (
    <><Navbar /><ProtectedRoute>{children}</ProtectedRoute></>
  );

  return (
    <Routes>
      {isAuthenticated() ? (
        <Route path="/" element={<Navigate to="/home" replace />} />
      ) : (
        <Route path="/" element={<><Navbar /><LandingPage /></>} />
      )}

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/home" element={<AuthenticatedRoute><HomePage /></AuthenticatedRoute>} />
      
      <Route path="/progress-dashboard" element={<AuthenticatedRoute><ProgressDashboardPage /></AuthenticatedRoute>} />

      <Route path="/syllaby/new" element={<AuthenticatedRoute><CreateSyllabyPage /></AuthenticatedRoute>} />
      <Route path="/syllaby" element={<AuthenticatedRoute><SyllabyListPage /></AuthenticatedRoute>} />
      <Route path="/syllaby/:id" element={<AuthenticatedRoute><SyllabyDetailPage /></AuthenticatedRoute>} />
      <Route path="/syllaby/:syllabyId/edit" element={<AuthenticatedRoute><EditSyllabyPage /></AuthenticatedRoute>} />

      <Route path="/study-assistant" element={<AuthenticatedRoute><StudyAssistantPage /></AuthenticatedRoute>} />
      <Route path="/notes" element={<AuthenticatedRoute><NoteListPage /></AuthenticatedRoute>} />
      <Route path="/notes/:noteId" element={<AuthenticatedRoute><NoteDetailPage /></AuthenticatedRoute>} />
      <Route path="/notes/new" element={<AuthenticatedRoute><NotesPage /></AuthenticatedRoute>} />

      <Route path="/quiz/generate" element={<AuthenticatedRoute><QuizGeneratorPage /></AuthenticatedRoute>} />
      <Route path="/quiz/freeform" element={<AuthenticatedRoute><FreeFormQuizPage /></AuthenticatedRoute>} />
      
      <Route path="/ai-chatbot" element={<AuthenticatedRoute><AIChatbotPage /></AuthenticatedRoute>} />
      <Route path="/kanban" element={<AuthenticatedRoute><KanbanListPage /></AuthenticatedRoute>} />
      <Route path="/kanban/:boardId" element={<AuthenticatedRoute><KanbanBoardPage /></AuthenticatedRoute>} />
      <Route path="/calendar" element={<AuthenticatedRoute><CalendarPage /></AuthenticatedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;