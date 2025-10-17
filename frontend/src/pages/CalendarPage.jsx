import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import api from "../api/axiosConfig";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAndFormatTasks = async () => {
      try {
        const { data: allTasks } = await api.get("/kanban/tasks/all");

        const formattedEvents = allTasks
          .filter((task) => task.due_date)
          .map((task) => ({
            title: task.title,
            start: new Date(task.due_date),
            end: new Date(task.due_date),
            allDay: true,
            resource: task,
          }));

        setEvents(formattedEvents);
      } catch (err) {
        console.error("Failed to load tasks for calendar:", err);
        setError("⚠️ Failed to load tasks. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndFormatTasks();
  }, []);

  const eventStyleGetter = (event) => {
    const backgroundColor = event.resource.priority === "high" ? "#F87171" : "#60A5FA"; // red or blue
    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        color: "#fff",
        padding: "4px",
        border: "none",
      },
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
        <p className="text-lg text-white animate-pulse">Loading calendar events…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] py-10 px-4 md:px-8 font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
        <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="w-full mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            Your Study Calendar
          </h1>
          <p className="text-gray-200 mt-3 text-lg">
            Keep track of all your task deadlines at a glance.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl w-full">
          {events.length === 0 ? (
            <p className="text-center text-gray-600 py-10">
              🎉 No tasks found! Start adding tasks to see them on your calendar.
            </p>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "80vh", width: "100%" }}
              views={["month", "week", "day"]}
              eventPropGetter={eventStyleGetter}
              tooltipAccessor={(event) => `${event.title}\nPriority: ${event.resource.priority || "normal"}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
