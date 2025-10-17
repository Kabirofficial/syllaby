import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import toast, { Toaster } from "react-hot-toast";
import {
  FaArrowLeft,
  FaChevronDown,
  FaChevronUp,
  FaYoutube,
  FaNewspaper,
  FaBook,
  FaLink,
  FaSync,
} from "react-icons/fa";

const resourceIcons = {
  Video: <FaYoutube className="text-red-500" />,
  Article: <FaNewspaper className="text-blue-500" />,
  "Book Chapter": <FaBook className="text-yellow-600" />,
};

const SyllabusDetailPage = () => {
  const { id } = useParams();
  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const fetchSyllabus = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/syllaby/${id}`);
        setSyllabus(response.data);

        if (response.data?.current_week_number) {
          setExpandedWeeks({ [response.data.current_week_number]: true });
        }
      } catch (err) {
        setError("Failed to fetch syllabus details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSyllabus();
  }, [id]);

  const toggleWeek = (weekNumber) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekNumber]: !prev[weekNumber],
    }));
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    toast.loading("Regenerating content with AI...", { id: "regen-toast" });
    try {
      const response = await api.post(`/syllaby/${id}/regenerate`);
      setSyllabus(response.data); 
      toast.success("Syllabus content regenerated successfully!", {
        id: "regen-toast",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Regeneration failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage, { id: "regen-toast" });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        <p className="ml-4 text-gray-700">Loading syllabus...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">{error}</div>;
  }
  
  if (!syllabus) {
    return <div className="text-center p-10">Syllabus not found.</div>;
  }

  const isCorrupted = syllabus.introduction?.startsWith("[Error:");

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto">
        <Link
          to="/syllaby"
          className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 font-medium transition-colors"
        >
          <FaArrowLeft className="mr-2" />
          Back to My Syllaby
        </Link>

        <div className="bg-white p-8 rounded-2xl shadow-lg w-full">
          <h1 className="text-4xl font-extrabold text-gray-900">
            {syllabus.title}
          </h1>
          {syllabus.course_code && (
            <p className="text-lg text-gray-500 mt-2">
              {syllabus.course_code}
            </p>
          )}
        </div>

        {isCorrupted ? (
          <div className="mt-8 p-6 bg-yellow-50 border border-yellow-300 rounded-2xl shadow-lg w-full text-center">
            <h2 className="text-2xl font-bold text-yellow-800 mb-3">
              Content Error
            </h2>
            <p className="text-yellow-700 leading-relaxed mb-6">
              The detailed content for this syllabus is corrupted. You can try to
              regenerate it using the original outline.
            </p>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center justify-center px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <FaSync
                className={`mr-2 ${isRegenerating ? "animate-spin" : ""}`}
              />
              {isRegenerating ? "Regenerating..." : "Regenerate Content"}
            </button>
          </div>
        ) : (
          <>
            {syllabus.introduction && (
              <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg w-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Introduction
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {syllabus.introduction}
                </p>
              </div>
            )}

            <div className="mt-8 space-y-4">
              {syllabus.weeks.map((week) => {
                const isCurrentWeek =
                  week.week_number === syllabus.current_week_number;
                const isExpanded = !!expandedWeeks[week.week_number];

                return (
                  <div
                    key={week.week_number}
                    className={`rounded-2xl border transition-all duration-300 ${
                      isCurrentWeek
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 bg-white shadow-md"
                    }`}
                  >
                    <div
                      className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleWeek(week.week_number)}
                    >
                      <h3 className="text-xl font-bold text-gray-900">
                        Week {week.week_number}: {week.title}
                      </h3>
                      <div className="flex items-center gap-4">
                        {isCurrentWeek && (
                          <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                            Current
                          </span>
                        )}
                        <span className="text-gray-400">
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? "max-h-[2000px]" : "max-h-0"
                      }`}
                    >
                      <div className="px-6 pb-6 border-t border-gray-200">
                        <div className="mt-4 space-y-6 text-gray-700 leading-relaxed">
                          {week.learning_objectives?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">
                                Learning Objectives:
                              </h4>
                              <ul className="list-disc list-inside space-y-1 pl-2">
                                {week.learning_objectives.map((obj, idx) => (
                                  <li key={idx}>{obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {week.daily_tasks?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">
                                Suggested Tasks:
                              </h4>
                              <div className="space-y-3 pl-2">
                                {week.daily_tasks.map((daySchedule, idx) => (
                                  <div key={idx}>
                                    <p className="font-semibold">
                                      {daySchedule.day}
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 pl-4">
                                      {daySchedule.tasks.map(
                                        (task, taskIdx) => (
                                          <li key={taskIdx}>{task}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {week.quiz_topics?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">
                                Quiz & Self-Assessment:
                              </h4>
                              <ul className="list-disc list-inside space-y-1 pl-2">
                                {week.quiz_topics.map((quiz, idx) => (
                                  <li key={idx}>{quiz}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {week.resources?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">
                                Recommended Resources:
                              </h4>
                              <ul className="space-y-3 pl-2">
                                {week.resources.map((res, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span
                                      className="mr-3 text-lg pt-1"
                                      title={res.type}
                                    >
                                      {resourceIcons[res.type] || (
                                        <FaLink className="text-gray-400" />
                                      )}
                                    </span>
                                    <div>
                                      {res.link ? (
                                        <a
                                          href={res.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-blue-600 hover:underline"
                                        >
                                          {res.description}
                                        </a>
                                      ) : (
                                        <span className="font-medium text-gray-800">
                                          {res.description}
                                        </span>
                                      )}
                                      <span className="text-sm text-gray-500 block">
                                        Source: {res.source}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SyllabusDetailPage;