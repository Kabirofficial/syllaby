import React, { useState, useMemo } from "react";
import Modal from "react-modal";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import { FaPlus, FaClipboardList } from "react-icons/fa";

const CreateBoardModal = ({ isOpen, onClose, syllabi, boards, onBoardCreated }) => {
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [selectedSyllabusId, setSelectedSyllabusId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const syllabiWithoutBoards = useMemo(() => 
    syllabi.filter(s => !boards.some(b => b.syllabus_id === s.id)),
    [syllabi, boards]
  );

  const resetAndClose = () => {
    setNewBoardTitle("");
    setSelectedSyllabusId("");
    onClose();
  };

  const handleCreateBlankBoard = async () => {
    if (!newBoardTitle.trim()) return toast.error("Board title cannot be empty.");
    
    setIsCreating(true);
    const toastId = toast.loading("Creating blank board...");
    try {
      const res = await api.post("/kanban", { title: newBoardTitle });
      toast.success(`Board "${newBoardTitle}" created!`, { id: toastId });
      onBoardCreated(res.data);
      resetAndClose();
    } catch {
      toast.error("Failed to create board.", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFromSyllabus = async () => {
    if (!selectedSyllabusId) return toast.error("Please select a syllabus.");

    setIsCreating(true);
    const toastId = toast.loading("Generating board from syllabus...");
    try {
      const res = await api.post(`/syllaby/${selectedSyllabusId}/create-kanban`);
      toast.success("Board created from syllabus!", { id: toastId });
      onBoardCreated(res.data);
      resetAndClose();
    } catch (error) {
      const detail = error.response?.data?.detail || "Failed to create board.";
      toast.error(detail, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleTitleChange = (e) => {
      setNewBoardTitle(e.target.value);
      if(selectedSyllabusId) {
          setSelectedSyllabusId("");
      }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl outline-none"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onAfterClose={() => {
          setNewBoardTitle("");
          setSelectedSyllabusId("");
      }}
    >
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Create a New Board</h2>
      <div className="space-y-6">
        <div>
          <input type="text" placeholder="Enter new board title..." value={newBoardTitle} onChange={handleTitleChange} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500" disabled={isCreating} />
          <button onClick={handleCreateBlankBoard} className="mt-4 w-full bg-gray-800 text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 shadow disabled:opacity-50" disabled={isCreating || !newBoardTitle.trim()}>
            <FaPlus /> Create Blank Board
          </button>
        </div>
        
        <div className="relative flex items-center">
            <hr className="w-full border-gray-300" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-white px-2 text-gray-500">OR</span>
        </div>

        <div>
          <select value={selectedSyllabusId} onChange={(e) => { setSelectedSyllabusId(e.target.value); setNewBoardTitle(""); }} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white" disabled={syllabiWithoutBoards.length === 0 || isCreating}>
            <option value="">{syllabiWithoutBoards.length > 0 ? "Select a syllabus to generate tasks..." : "No available syllabi"}</option>
            {syllabiWithoutBoards.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <button onClick={handleCreateFromSyllabus} className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow disabled:opacity-50" disabled={!selectedSyllabusId || isCreating}>
            <FaClipboardList /> Generate from Syllabus
          </button>
        </div>
      </div>
      <button onClick={onClose} className="w-full mt-8 py-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50" disabled={isCreating}>Cancel</button>
    </Modal>
  );
};

export default CreateBoardModal;