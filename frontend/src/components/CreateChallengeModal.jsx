/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';

const CreateChallengeModal = ({ isOpen, onClose, onChallengeCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allTasks, setAllTasks] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchAllTasks = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await api.get('/kanban/tasks/all');
          const uncompletedTasks = response.data.filter(task => !task.completed);
          setAllTasks(uncompletedTasks);
        } catch (err) {
          setError('Failed to load tasks. Please try again.');
          toast.error('Failed to load tasks.');
        } finally {
          setLoading(false);
        }
      };
      fetchAllTasks();
    } else {
      setTitle('');
      setDescription('');
      setEndDate('');
      setSelectedTaskIds(new Set());
      setAllTasks([]);
    }
  }, [isOpen]);

  const handleTaskToggle = (taskId) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !endDate || selectedTaskIds.size === 0) {
      toast.error('Please fill in the title, end date, and select at least one task.');
      return;
    }

    const toastId = toast.loading('Creating challenge...');
    const challengeData = {
      title,
      description,
      end_date: new Date(endDate).toISOString(),
      task_ids: Array.from(selectedTaskIds),
    };

    try {
      await api.post('/challenges', challengeData);
      toast.success('Challenge created successfully!', { id: toastId });
      onChallengeCreated();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to create challenge.';
      toast.error(errorMsg, { id: toastId });
    }
  };
  
  const getTodayString = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl transform transition-all scale-95 hover:scale-100 flex flex-col max-h-[90vh]">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Create a New Challenge
        </h2>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Challenge Title</label>
            <input
              type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Master Chapter 5" required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea
              id="description" rows="2" value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder="A brief summary of what this challenge entails."
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              min={getTodayString()}
              className="mt-1 w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500" required
            />
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Tasks for this Challenge</h3>
            {loading && <p>Loading tasks...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {allTasks.length > 0 ? allTasks.map(task => (
                    <div key={task.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100">
                        <input
                            type="checkbox" id={`task-${task.id}`}
                            checked={selectedTaskIds.has(task.id)}
                            onChange={() => handleTaskToggle(task.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor={`task-${task.id}`} className="flex-1 text-gray-700 cursor-pointer">{task.title}</label>
                    </div>
                )) : !loading && <p className="text-gray-500">No uncompleted tasks available.</p>}
            </div>
          </div>
        </form>
        
        <div className="mt-6 pt-6 border-t flex justify-end space-x-4">
            <button
                type="button" onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-semibold transition"
            >
                Cancel
            </button>
            <button
                type="button" onClick={handleSubmit} disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition disabled:bg-indigo-300"
            >
                Create Challenge
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChallengeModal;