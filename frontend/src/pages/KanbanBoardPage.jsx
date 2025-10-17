import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import toast, { Toaster } from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import TaskDetailModal from "../components/TaskDetailModal";
import { FaPlus } from "react-icons/fa";

Modal.setAppElement("#root");

const KanbanBoardPage = () => {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [newDueDate, setNewDueDate] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/kanban/${boardId}`);
      data.columns.forEach((column) => {
        column.tasks.sort((a, b) => a.position - b.position);
      });
      setBoard(data);
    } catch {
      toast.error("Failed to load board");
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !board) return;

    const originalBoardState = JSON.parse(JSON.stringify(board));
    const columns = board.columns.map((col) => ({
      ...col,
      tasks: [...col.tasks],
    }));

    const sourceCol = columns.find((c) => c.id === Number(source.droppableId));
    const destCol = columns.find((c) => c.id === Number(destination.droppableId));

    if (!sourceCol || !destCol) return;

    const [movedTask] = sourceCol.tasks.splice(source.index, 1);

    let completionChanged = false;
    if (destCol.title.toLowerCase() === "done" && !movedTask.completed) {
      movedTask.completed = true;
      completionChanged = true;
    } else if (destCol.title.toLowerCase() !== "done" && movedTask.completed) {
      movedTask.completed = false;
      completionChanged = true;
    }

    destCol.tasks.splice(destination.index, 0, movedTask);

    setBoard({ ...board, columns });

    try {
      const movePromise = api.put(`/kanban/${boardId}/move-task`, {
        taskId: Number(draggableId),
        sourceColumnId: Number(source.droppableId),
        destinationColumnId: Number(destination.droppableId),
        destinationIndex: destination.index,
      });

      const apiPromises = [movePromise];
      if (completionChanged) {
        apiPromises.push(
          api.put(`/kanban/tasks/${movedTask.id}`, { completed: movedTask.completed })
        );
      }
      await Promise.all(apiPromises);
      toast.success("Board updated!");
    } catch {
      toast.error("Failed to save changes. Reverting.");
      setBoard(originalBoardState);
    }
  };

  const openAddModal = (columnId) => {
    setSelectedColumnId(String(columnId));
    setAddModalOpen(true);
  };
  const closeAddModal = () => {
    setAddModalOpen(false);
    setNewTaskTitle("");
    setSelectedColumnId("");
    setNewDueDate(null);
  };

  const createTask = async () => {
    if (!newTaskTitle.trim() || !selectedColumnId) {
      return toast.error("Title and column are required.");
    }

    const toastId = toast.loading("Creating task...");
    try {
      const response = await api.post(`/kanban/columns/${selectedColumnId}/tasks`, {
        title: newTaskTitle,
        due_date: newDueDate,
      });
      const newTask = response.data;

      setBoard((prevBoard) => ({
        ...prevBoard,
        columns: prevBoard.columns.map((col) =>
          col.id === Number(selectedColumnId)
            ? { ...col, tasks: [...col.tasks, newTask] }
            : col
        ),
      }));

      closeAddModal();
      toast.success("Task added!", { id: toastId });
    } catch {
      toast.error("Failed to create task", { id: toastId });
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      columns: prevBoard.columns.map((col) => ({
        ...col,
        tasks: col.tasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        ),
      })),
    }));
  };

  const handleTaskDelete = (taskId) => {
    setBoard((prevBoard) => ({
      ...prevBoard,
      columns: prevBoard.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((task) => task.id !== taskId),
      })),
    }));
  };

  const handleOpenTaskDetails = (task) => setSelectedTask(task);
  const handleCloseTaskDetails = () => setSelectedTask(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
        <p className="text-gray-100 animate-pulse">Loading board…</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-8 text-center text-gray-500">
        Board not found.{" "}
        <Link to="/kanban" className="text-[#4A74C4] underline">
          Go back to boards list
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] p-6 font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
        <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      </div>
      <div className="relative z-10">
        <Toaster position="top-right" />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">{board.title}</h1>
          <button
            onClick={() => openAddModal(board.columns[0]?.id)}
            className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white px-4 py-2 rounded-xl hover:opacity-90"
          >
            + Add Task
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {board.columns.map((column) => (
              <Droppable droppableId={String(column.id)} key={column.id}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="bg-white/90 backdrop-blur-md rounded-xl shadow p-4 border border-gray-200 flex flex-col"
                  >
                    <h2 className="font-bold text-lg mb-4 flex justify-between">
                      {column.title}
                      <span className="text-gray-400 text-sm">{column.tasks.length}</span>
                    </h2>
                    <div className="flex-grow min-h-[100px]">
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleOpenTaskDetails(task)}
                              className={`mb-3 p-3 rounded-xl shadow transition cursor-pointer ${
                                task.completed ? "bg-green-100 text-gray-500 opacity-80 line-through" : "bg-[#EDE9FE]"
                              } ${
                                snapshot.isDragging ? "shadow-lg scale-105 z-50" : "hover:shadow-md"
                              }`}
                            >
                              {task.title}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                    <button
                      onClick={() => openAddModal(column.id)}
                      className="mt-2 text-sm text-gray-500 hover:bg-gray-200 w-full text-left p-2 rounded-md flex items-center transition"
                    >
                      <FaPlus className="mr-2" /> Add a task
                    </button>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        <Modal
          isOpen={isAddModalOpen}
          onRequestClose={closeAddModal}
          className="bg-white w-full max-w-3xl mx-auto mt-20 p-8 rounded-2xl shadow-2xl outline-none"
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-lg flex justify-center items-start z-50"
        >
          <h2 className="text-3xl font-extrabold mb-6 text-center text-[#1F2937]">Create Task</h2>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title</label>
          <input
            type="text"
            placeholder="Enter the task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full p-4 mb-5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4A74C4] focus:outline-none shadow-sm"
          />
          <label className="block text-sm font-semibold text-gray-700 mb-2">Column</label>
          <select
            value={selectedColumnId}
            onChange={(e) => setSelectedColumnId(e.target.value)}
            className="w-full p-4 mb-5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4A74C4] focus:outline-none shadow-sm"
          >
            <option value="">Select Column</option>
            {board.columns.map((col) => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline (Optional)</label>
          <DatePicker
            selected={newDueDate}
            onChange={(date) => setNewDueDate(date)}
            placeholderText="Select a date"
            className="w-full p-4 mb-6 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4A74C4] focus:outline-none shadow-sm"
            dateFormat="MMMM d, yyyy"
            isClearable
          />
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeAddModal}
              className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={createTask}
              className="px-6 py-3 bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-semibold rounded-xl shadow-md hover:shadow-lg"
            >
              Create
            </button>
          </div>
        </Modal>

        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={handleCloseTaskDetails}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
          />
        )}
      </div>
    </div>
  );
};

export default KanbanBoardPage;