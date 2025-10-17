import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import api from "../api/axiosConfig";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import { FaTrash } from "react-icons/fa";

const TaskDetailModal = ({ task, isOpen, onClose, onTaskUpdate, onTaskDelete }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "Medium");
      setDueDate(task.due_date ? new Date(task.due_date) : null);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    const toastId = toast.loading('Saving...');
    setIsSaving(true);

    try {
      const payload = {
        title,
        description,
        priority,
        due_date: dueDate,
      };
      const response = await api.put(`/kanban/tasks/${task.id}`, payload);
      toast.success("Task updated!", { id: toastId });
      onTaskUpdate(response.data);
      onClose();
    } catch {
      toast.error("Failed to save task.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!task) return;

    const newCompletedStatus = !task.completed;
    const toastId = toast.loading('Updating status...');
    setIsSaving(true);
    
    try {
      const response = await api.put(`/kanban/tasks/${task.id}`, { completed: newCompletedStatus });
      toast.success(`Task marked as ${newCompletedStatus ? "complete" : "incomplete"}!`, { id: toastId });
      onTaskUpdate(response.data);
      onClose();
    } catch {
      toast.error("Failed to update status.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      const toastId = toast.loading('Deleting task...');
      try {
        await api.delete(`/kanban/tasks/${task.id}`);
        toast.success("Task deleted.", { id: toastId });
        onTaskDelete(task.id);
        onClose();
      } catch {
        toast.error("Failed to delete task.", { id: toastId });
      }
    }
  };
  
  if (!task) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white max-w-2xl w-full mx-4 md:mx-auto mt-20 p-8 rounded-2xl shadow-2xl outline-none"
      overlayClassName="fixed inset-0 bg-black/40 flex justify-center items-start z-50"
    >
      <div className="space-y-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-3xl font-bold mb-2 p-2 border-b-2 border-transparent focus:border-[#4A74C4] outline-none"
          placeholder="Task Title"
          disabled={isSaving}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="w-full h-32 p-3 border rounded-xl focus:ring-2 focus:ring-[#4A74C4]"
          disabled={isSaving}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A74C4]"
              disabled={isSaving}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <DatePicker
              selected={dueDate}
              onChange={setDueDate}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A74C4]"
              isClearable
              placeholderText="Select a date"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 p-2 rounded-full disabled:opacity-50"
            disabled={isSaving}
          >
            <FaTrash size={18} />
          </button>

          <div className="flex space-x-3">
            <button
              onClick={handleToggleComplete}
              className={`px-4 py-2 rounded-xl border ${
                task.completed ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-700"
              } disabled:opacity-50`}
              disabled={isSaving}
            >
              {task.completed ? "Mark as Incomplete" : "Mark as Complete"}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white rounded-xl disabled:opacity-50"
              disabled={isSaving}
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;