import React, { useState, useEffect } from "react";
import api from "../api/axiosConfig";

const Spinner = ({ size = "6", className = "text-white" }) => (
  <svg
    className={`animate-spin h-${size} w-${size} ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const CheckboxItem = ({ label, checked, onChange, color }) => {
  const colorClasses = {
    bg: `bg-${color}-100`,
    border: `border-${color}-500`,
    text: `text-${color}-500`,
    focusRing: `focus:ring-${color}-500`,
  };

  return (
    <label
      className={`flex items-center p-3 rounded-md border transition-all duration-200 cursor-pointer ${
        checked
          ? `${colorClasses.bg} ${colorClasses.border}`
          : "bg-white border-gray-300 hover:border-gray-400"
      }`}
    >
      <input
        type="checkbox"
        className={`form-checkbox h-5 w-5 rounded ${colorClasses.text} ${colorClasses.focusRing}`}
        checked={checked}
        onChange={onChange}
      />
      <span className="ml-3 text-[#1F2937] font-medium">{label}</span>
    </label>
  );
};

const FeedbackCard = ({ feedback }) => {
  const colorClass = feedback.is_correct
    ? "bg-green-100 border-green-400 text-green-800"
    : "bg-red-100 border-red-400 text-red-800";
  return (
    <div className={`mb-4 p-3 rounded-md border ${colorClass}`}>
      <p className="font-semibold text-lg">
        Status: {feedback.is_correct ? "Correct!" : "Needs Improvement"}
      </p>
      <p className="font-semibold">Score: {feedback.score_percentage}%</p>
      <p className="text-gray-800 whitespace-pre-wrap mt-2">
        {feedback.feedback}
      </p>
    </div>
  );
};

const FreeFormQuizPage = () => {
  const [syllabyList, setSyllabyList] = useState([]);
  const [noteList, setNoteList] = useState([]);
  const [selectedSyllabyIds, setSelectedSyllabyIds] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [difficulty, setDifficulty] = useState("medium");
  
  const [currentQuestion, setCurrentQuestion] = useState(null); 
  
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState("");

  const formatErrorMessage = (err) => {
    if (err.response?.data?.detail) {
      return typeof err.response.data.detail === "string"
        ? err.response.data.detail
        : JSON.stringify(err.response.data.detail);
    }
    return err.message || "An unexpected error occurred. Please try again.";
  };

  useEffect(() => {
    const fetchContentSources = async () => {
      setLoadingContent(true);
      setError("");
      try {
        const [syllabyRes, notesRes] = await Promise.all([
          api.get("/syllaby"),
          api.get("/notes"),
        ]);
        setSyllabyList(syllabyRes.data);
        setNoteList(notesRes.data);
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContentSources();
  }, []);

  const handleSyllabyToggle = (id) => {
    setSelectedSyllabyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleNoteToggle = (id) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerateQuestion = async () => {
    setError("");
    setUserAnswer("");
    setAiFeedback(null);
    setCurrentQuestion(null);

    if (selectedSyllabyIds.length === 0 && selectedNoteIds.length === 0) {
      setError("Please select at least one Syllaby or Note.");
      return;
    }

    setLoadingQuestion(true);
    try {
      const response = await api.post("/ai/generate-freeform-question", {
        syllaby_ids: selectedSyllabyIds,
        note_ids: selectedNoteIds,
        difficulty,
      });

      const { question, question_id } = response.data;
      if (!question?.trim() || !question_id?.trim()) {
        setError("AI failed to generate a valid question. Try selecting more content or a different difficulty.");
        return;
      }
      
      setCurrentQuestion(response.data);

    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    setError("");
    if (!userAnswer.trim()) {
      setError("Please provide an answer before submitting.");
      return;
    }
    if (!currentQuestion?.question_id) {
      setError("Missing question ID. Please generate a new question.");
      return;
    }

    setLoadingScore(true);
    try {
      const response = await api.post("/ai/score-freeform-answer", {
        question_id: currentQuestion.question_id, 
        user_answer: userAnswer,
      });
      setAiFeedback(response.data);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoadingScore(false);
    }
  };

  const handleStartOver = () => {
    setCurrentQuestion(null);
    setUserAnswer("");
    setAiFeedback(null);
    setError("");
    setSelectedSyllabyIds([]);
    setSelectedNoteIds([]);
  };

  if (loadingContent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center p-8">
          <Spinner size="12" className="text-blue-500" />
          <p className="text-lg text-gray-700 font-semibold mt-4">
            Loading your content...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center py-10 px-4 font-sans bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] overflow-hidden">
      <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
      <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      <span className="absolute w-72 h-72 bg-pink-300 rounded-full opacity-20 -bottom-16 left-20 animate-pulseSlow"></span>

      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-5xl relative z-10">
        <h1 className="text-4xl font-extrabold text-center text-[#1F2937] mb-6">
          AI Free-Form Questions
        </h1>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-center"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {!currentQuestion ? (
          <div>
            <div className="mb-8 p-6 border rounded-lg bg-gray-50">
              <h2 className="text-2xl font-bold text-[#1F2937] mb-4">1. Select Content Sources</h2>
              {syllabyList.length === 0 && noteList.length === 0 ? (
                <p className="text-center text-gray-600 p-4 bg-gray-100 rounded-md">
                  You don't have any Syllaby or Notes yet. Create some content first to generate questions!
                </p>
              ) : (
                <>
                  {syllabyList.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-[#1F2937] mb-3">Your Syllaby</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {syllabyList.map((s) => <CheckboxItem key={s.id} label={s.title} checked={selectedSyllabyIds.includes(s.id)} onChange={() => handleSyllabyToggle(s.id)} color="blue"/>)}
                      </div>
                    </div>
                  )}
                  {noteList.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-[#1F2937] mb-3">Your Notes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {noteList.map((note) => <CheckboxItem key={note.id} label={note.title} checked={selectedNoteIds.includes(note.id)} onChange={() => handleNoteToggle(note.id)} color="purple"/>)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mb-8 p-6 border rounded-lg bg-gray-50">
              <h2 className="text-2xl font-bold text-[#1F2937] mb-4">2. Choose Difficulty</h2>
              <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="shadow-sm block w-full border-gray-300 rounded-md p-3 text-[#1F2937] focus:ring-[#4A74C4] focus:border-[#4A74C4] transition duration-200" disabled={loadingQuestion}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="flex justify-center mt-8">
              <button onClick={handleGenerateQuestion} className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                disabled={loadingQuestion || (selectedSyllabyIds.length === 0 && selectedNoteIds.length === 0)}>
                {loadingQuestion ? <><Spinner size="5" /> <span className="ml-2">Generating...</span></> : "Generate Question"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 p-6 border rounded-xl bg-gray-50 shadow-inner">
            <h2 className="text-3xl font-bold text-[#1F2937] mb-6 text-center">Your Question</h2>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
              <p className="text-xl font-semibold text-[#1F2937] mb-4">{currentQuestion.question}</p>
              <label htmlFor="userAnswer" className="block text-lg font-medium text-[#1F2937] mb-2">Your Answer:</label>
              <textarea id="userAnswer" rows="8" className="shadow-sm block w-full border-gray-300 rounded-md p-3 text-[#1F2937] focus:ring-[#4A74C4] focus:border-[#4A74C4] transition duration-200 resize-y"
                placeholder="Type your answer here..." value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={loadingScore || aiFeedback} />
            </div>

            {!aiFeedback ? (
              <div className="flex justify-center mt-8">
                <button onClick={handleSubmitAnswer} className="bg-gradient-to-r from-[#5E40B7] to-[#7A54C9] text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loadingScore || !userAnswer.trim()}>
                  {loadingScore ? <><Spinner size="5" /><span className="ml-2">Getting Feedback...</span></> : "Submit for Feedback"}
                </button>
              </div>
            ) : (
              <div className="mt-8 p-6 rounded-lg shadow-md border-2 border-dashed bg-white">
                <h3 className="text-2xl font-bold text-[#1F2937] mb-4">AI Feedback</h3>
                <FeedbackCard feedback={aiFeedback} />
                <div className="flex flex-col md:flex-row justify-center mt-8 space-y-4 md:space-y-0 md:space-x-4">
                  <button onClick={handleGenerateQuestion} className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300">
                    Next Question (Same Settings)
                  </button>
                  <button onClick={handleStartOver} className="bg-gray-400 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-gray-500 transform hover:scale-105 transition duration-300">
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeFormQuizPage;