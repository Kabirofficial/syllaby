import React from "react";
import { Link } from "react-router-dom";
import { FaBookOpen, FaClipboardList } from "react-icons/fa";

const CurrentWeekCard = ({ current_week }) => {
  if (!current_week) {
    return (
      <div className="bg-white/90 rounded-3xl shadow-xl p-6 text-center">
        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">
          Ready to Start Learning?
        </h2>
        <p className="text-gray-600 mb-6">
          Generate your first Syllaby to see your weekly plan here!
        </p>
        <Link
          to="/syllaby/new"
          className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-semibold py-2 px-6 rounded-full shadow hover:scale-105 transition-transform duration-300"
        >
          Create a Syllaby
        </Link>
      </div>
    );
  }

  return (
    <section className="bg-white/90 rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937]">
            This Week's Focus
          </h2>
          <p className="text-gray-500">
            Week {current_week.week_number}: {current_week.week_title}
          </p>
        </div>
        <Link
          to={`/syllaby/${current_week.syllabus_id}`}
          className="text-white bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] rounded-full p-3 shadow-md hover:scale-110 transition-transform"
          title="Go to full syllabus"
        >
          <FaBookOpen size={20} />
        </Link>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
          <FaClipboardList className="mr-2 text-[#5E40B7]" />
          Key Tasks:
        </h3>
        <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
          {current_week.daily_tasks.map((daySchedule, index) => (
            <div key={index}>
              <p className="font-bold text-gray-800">{daySchedule.day}</p>
              <ul className="list-disc list-inside pl-4 text-gray-600 space-y-1">
                {daySchedule.tasks.map((task, taskIndex) => (
                  <li key={taskIndex}>{task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurrentWeekCard;