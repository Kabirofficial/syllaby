import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";
import { formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { FaCalendarAlt, FaExclamationTriangle, FaBell } from "react-icons/fa";

const formatDueDate = (dueDate) => {
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) {
    return { text: "Overdue", color: "text-red-600 font-semibold", icon: <FaExclamationTriangle className="text-red-600" /> };
  }
  if (isToday(date)) {
    return { text: "Due Today", color: "text-orange-500 font-bold", icon: <FaBell className="text-orange-500" /> };
  }
  if (isTomorrow(date)) {
    return { text: "Due Tomorrow", color: "text-yellow-600 font-medium", icon: <FaBell className="text-yellow-600" /> };
  }
  return { text: `Due in ${formatDistanceToNow(date)}`, color: "text-gray-500", icon: null };
};

const UpcomingDeadlines = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeadlines = async () => {
      try {
        const { data: boardList } = await api.get("/kanban");
        if (!boardList || boardList.length === 0) {
          setLoading(false);
          return;
        }

        const boardDetailPromises = boardList.map(board =>
          api.get(`/kanban/${board.id}`).then(res => res.data)
        );

        const fullBoards = await Promise.all(boardDetailPromises);

        const allTasks = fullBoards.flatMap(board =>
          board.columns.flatMap(column =>
            (column.tasks || []).map(task => ({
              ...task,
              boardName: board.title,
              columnName: column.title
            }))
          )
        );

        const upcomingTasks = allTasks
          .filter(task =>
            task &&
            task.due_date &&
            !task.completed &&
            (task.columnName === "To Do" || task.columnName === "In Progress")
          )
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 7);

        setDeadlines(upcomingTasks);
      } catch (error) {
        console.error("Failed to fetch deadlines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeadlines();
  }, []);

  const renderSkeleton = () => (
    [...Array(3)].map((_, idx) => (
      <div key={idx} className="flex justify-between items-center py-4 animate-pulse border-b last:border-b-0">
        <div className="w-3/4 space-y-2">
          <div className="h-4 bg-gray-300 rounded-md w-2/3"></div>
          <div className="h-3 bg-gray-300 rounded-md w-1/2"></div>
        </div>
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
      </div>
    ))
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg font-sans">
      <h2 className="text-2xl font-bold text-[#1F2937]">Upcoming Deadlines</h2>
      <p className="text-gray-500 mt-1 mb-4 text-sm">Stay on track with your important dates and assignments.</p>

      <div className="space-y-6">
        {loading ? (
          renderSkeleton()
        ) : deadlines.length > 0 ? (
          deadlines.map(task => {
            const dueDateInfo = formatDueDate(task.due_date);
            return (
              <div
                key={`${task.id}-${task.boardName}`}
                className="flex justify-between items-center py-3 px-3 rounded-xl hover:shadow-md transition-shadow border border-gray-100 mb-2"
              >
                <div>
                  <p className="font-semibold text-gray-800">{task.title}</p>
                  <p className="text-gray-400 text-sm">{task.boardName} - {task.columnName}</p>
                </div>
                <div className={`flex items-center gap-2 text-sm ${dueDateInfo.color}`}>
                  {dueDateInfo.icon}
                  <span>{dueDateInfo.text}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No upcoming deadlines. Great job!</p>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link 
          to="/calendar"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform duration-200"
        >
          <FaCalendarAlt />
          View Calendar
        </Link>
      </div>
    </div>
  );
};

export default UpcomingDeadlines;
