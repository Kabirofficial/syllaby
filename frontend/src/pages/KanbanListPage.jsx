import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import toast, { Toaster } from "react-hot-toast";
import { FaTrash, FaPlus, FaTrophy, FaEye } from "react-icons/fa";
import CreateBoardModal from "../components/CreateBoardModal";
import CreateChallengeModal from "../components/CreateChallengeModal";
import ChallengeDetailModal from "../components/ChallengeDetailModal";

const ChallengeCard = ({ challenge, onClick }) => (
  <li className="bg-white/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-start mb-2">
        <p className="font-bold text-indigo-800 truncate pr-4">{challenge.title}</p>
        <p className="text-sm font-semibold text-gray-600 flex-shrink-0">
          {challenge.completed_tasks} / {challenge.total_tasks}
        </p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full" 
          style={{ width: `${challenge.completion_percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 text-right mt-1">
        Ends: {new Date(challenge.end_date).toLocaleDateString()}
      </p>
    </div>
    <div className="text-right mt-3">
        <button onClick={onClick} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-2 ml-auto">
            <FaEye /> View Details
        </button>
    </div>
  </li>
);

const BoardCard = ({ board, onDelete }) => {
  const { totalTasks, completedTasks, completionPercentage } = useMemo(() => {
    const allTasks = board.columns.flatMap(col => col.tasks);
    const total = allTasks.length;
    const completed = allTasks.filter(task => task.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTasks: total, completedTasks: completed, completionPercentage: percentage };
  }, [board.columns]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
      <Link to={`/kanban/${board.id}`} className="flex-grow">
        <h2 className="text-xl font-bold text-gray-800 truncate">{board.title}</h2>
        {board.syllabus_id && (
          <span className="inline-block mt-2 bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full">
            Linked to Syllabus
          </span>
        )}
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm font-semibold text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedTasks} / {totalTasks}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#4A74C4] to-[#7A54C9] h-2 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </Link>
      <div className="border-t mt-4 pt-4 flex justify-end">
        <button
          onClick={() => onDelete(board.id, board.title)}
          className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors"
          aria-label={`Delete board ${board.title}`}
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

const KanbanListPage = () => {
  const [boards, setBoards] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeDetails, setChallengeDetails] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [boardsRes, syllabiRes, challengesRes] = await Promise.all([
          api.get("/kanban"),
          api.get("/syllaby"),
          api.get("/challenges")
        ]);
        setBoards(boardsRes.data);
        setSyllabi(syllabiRes.data);
        setChallenges(challengesRes.data);
      } catch {
        toast.error("Failed to load your workspace data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleBoardCreated = (newBoard) => {
    setBoards(prev => [...prev, newBoard]);
    setShowBoardModal(false);
    navigate(`/kanban/${newBoard.id}`);
  };

  const handleChallengeCreated = (newChallenge) => {
    setShowChallengeModal(false);
    setChallenges(prev => [...prev, newChallenge]);
    toast.success("New challenge added!");
  };

  const handleChallengeUpdate = (updatedChallenge) => {
    setChallenges(prev => prev.map(c => c.id === updatedChallenge.id ? updatedChallenge : c));
    setChallengeDetails(prev => ({...prev, ...updatedChallenge}));
  };

  const handleChallengeDelete = (challengeId) => {
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
  };
  
  const handleChallengeClick = async (challenge) => {
    setSelectedChallenge(challenge);
    try {
      const res = await api.get(`/challenges/${challenge.id}`);
      setChallengeDetails(res.data);
    } catch {
      toast.error("Could not load challenge details.");
      setSelectedChallenge(null);
    }
  };

  const handleCloseChallengeModal = () => {
    setSelectedChallenge(null);
    setChallengeDetails(null);
  };

  const handleDeleteBoard = async (boardId, boardTitle) => {
    if (!window.confirm(`Delete "${boardTitle}"? This cannot be undone.`)) return;
    const toastId = toast.loading("Deleting board...");
    try {
      await api.delete(`/kanban/${boardId}`);
      setBoards(prev => prev.filter(b => b.id !== boardId));
      toast.success(`Board "${boardTitle}" deleted.`, { id: toastId });
    } catch {
      toast.error("Failed to delete board.", { id: toastId });
    }
  };

  if (loading && !boards.length && !challenges.length) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
        <p className="text-lg text-white animate-pulse">Loading Your Workspace…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 md:px-8 bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <Toaster position="top-right" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
        <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Your Workspace</h1>
          <div className="flex gap-4">
            <button
                onClick={() => setShowChallengeModal(true)}
                className="bg-white text-[#5E40B7] font-bold py-3 px-6 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform shadow-md"
            >
                <FaTrophy /> Create Challenge
            </button>
            <button
              onClick={() => setShowBoardModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform shadow-md"
            >
              <FaPlus /> Create Board
            </button>
          </div>
        </div>

        <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Active Challenges</h2>
            {challenges.length > 0 ? (
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                    <ul className="space-y-3">
                        {challenges.map(challenge => (
                            <ChallengeCard key={challenge.id} challenge={challenge} onClick={() => handleChallengeClick(challenge)} />
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="text-center p-8 bg-white/20 backdrop-blur-sm rounded-2xl text-white">
                    <p>No active challenges. Create one to stay motivated!</p>
                </div>
            )}
        </section>

        <section>
            <h2 className="text-2xl font-bold text-white mb-6">Kanban Boards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {boards.length > 0 ? (
                boards.map(board => <BoardCard key={board.id} board={board} onDelete={handleDeleteBoard} />)
              ) : (
                <div className="col-span-full text-center p-10 bg-white rounded-2xl text-gray-600 shadow-md">
                  You don’t have any boards yet. Create one to get started!
                </div>
              )}
            </div>
        </section>
      </div>
      
      <CreateBoardModal isOpen={showBoardModal} onClose={() => setShowBoardModal(false)} syllabi={syllabi} boards={boards} onBoardCreated={handleBoardCreated} />
      <CreateChallengeModal isOpen={showChallengeModal} onClose={() => setShowChallengeModal(false)} onChallengeCreated={handleChallengeCreated} />
      <ChallengeDetailModal isOpen={!!selectedChallenge} onClose={handleCloseChallengeModal} challenge={challengeDetails || selectedChallenge} onUpdate={handleChallengeUpdate} onDelete={handleChallengeDelete} />
    </div>
  );
};

export default KanbanListPage;