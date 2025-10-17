import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { FaTimes, FaCheckCircle, FaCircle, FaTrash, FaEdit, FaSave } from 'react-icons/fa';

const ChallengeDetailModal = ({ isOpen, onClose, challenge, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (challenge) {
      setEditedTitle(challenge.title);
      setEditedDescription(challenge.description || "");
    }
  }, [challenge]);

  const handleSaveChanges = async () => {
    if (!editedTitle.trim()) {
      return toast.error("Title cannot be empty.");
    }
    setIsSaving(true);
    try {
      const res = await api.put(`/challenges/${challenge.id}`, {
        title: editedTitle,
        description: editedDescription,
      });
      onUpdate(res.data);
      toast.success("Challenge updated!");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update challenge.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the challenge "${challenge.title}"?`)) {
        try {
            await api.delete(`/challenges/${challenge.id}`);
            toast.success("Challenge deleted.");
            onDelete(challenge.id);
            onClose();
        } catch {
            toast.error("Failed to delete challenge.");
        }
    }
  };

  if (!challenge) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl outline-none"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative">
        <button onClick={onClose} className="absolute -top-4 -right-4 text-gray-500 hover:text-gray-800">
          <FaTimes size={24} />
        </button>
        
        {isEditing ? (
          <div className='mb-6'>
            <input type="text" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className="w-full text-3xl font-extrabold text-gray-800 border-b-2 p-1 mb-2 focus:outline-none focus:border-indigo-500" />
            <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} className="w-full text-gray-500 border rounded-md p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Add a description..."/>
          </div>
        ) : (
          <div className='mb-6'>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{challenge.title}</h2>
            <p className="text-gray-500">{challenge.description}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">Progress</h3>
            <span className="font-semibold text-indigo-600">{challenge.completion_percentage}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full" style={{ width: `${challenge.completion_percentage}%` }}></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Completed {challenge.completed_tasks} of {challenge.total_tasks} tasks.</p>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Challenge Tasks</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {challenge.tasks?.map(task => (
              <div key={task.id} className={`flex items-center p-3 rounded-lg ${task.completed ? 'bg-green-50 text-gray-500' : 'bg-gray-100'}`}>
                {task.completed ? <FaCheckCircle className="text-green-500 mr-3" /> : <FaCircle className="text-gray-300 mr-3" />}
                <span className={`flex-grow ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <div>
            {isEditing ? (
              <button onClick={handleSaveChanges} disabled={isSaving} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50">
                <FaSave /> {isSaving ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                <FaEdit /> Edit
              </button>
            )}
          </div>
          <div className='flex gap-4 items-center'>
            <button onClick={handleDelete} className='text-red-500 hover:text-red-700 font-semibold flex items-center gap-2'><FaTrash /> Delete Challenge</button>
            <Link to="/kanban" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg shadow">Go to Boards</Link>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChallengeDetailModal;