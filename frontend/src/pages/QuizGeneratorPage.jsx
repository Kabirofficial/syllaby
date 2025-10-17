import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";

const QuizGeneratorPage = () => {
  const navigate = useNavigate(); // ✅
  const [syllabyList, setSyllabyList] = useState([]);
  const [noteList, setNoteList] = useState([]);
  const [selectedSyllabyIds, setSelectedSyllabyIds] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [questionType, setQuestionType] = useState("multiple_choice");

  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [quizMode, setQuizMode] = useState("generate"); 
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);

  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [error, setError] = useState("");

  const formatErrorMessage = (err) => {
    let errorMessage = "An unexpected error occurred. Please try again.";
    if (err.response && err.response.data) {
      if (Array.isArray(err.response.data.detail)) {
        errorMessage = err.response.data.detail
          .map((e) => {
            const field = e.loc && e.loc.length > 1 ? e.loc[1] : "unknown field";
            return `${field}: ${e.msg}`;
          })
          .join("; ");
      } else if (typeof err.response.data.detail === "string") {
        errorMessage = err.response.data.detail;
      } else {
        errorMessage = JSON.stringify(err.response.data.detail);
      }
    } else if (err.message) {
      errorMessage = `Network error or unexpected response: ${err.message}`;
    }
    return errorMessage;
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
        console.error("Failed to fetch content sources:", err);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContentSources();
  }, []);

  const handleSyllabyToggle = (id) => {
    setSelectedSyllabyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNoteToggle = (id) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerateQuiz = async () => {
    setError("");
    setGeneratedQuiz(null);
    setQuizMode("generate");
    setUserAnswers({});
    setQuizResults(null);

    if (selectedSyllabyIds.length === 0 && selectedNoteIds.length === 0) {
      setError("Please select at least one Syllaby or Note to generate a quiz.");
      return;
    }

    setLoadingQuiz(true);
    try {
      const quizInput = {
        syllaby_ids: selectedSyllabyIds,
        note_ids: selectedNoteIds,
        num_questions: numQuestions,
        difficulty: difficulty,
        question_type: questionType,
      };
      const response = await api.post("/ai/generate-quiz", quizInput);
      setGeneratedQuiz(response.data.quiz);
      setQuizMode("review");
    } catch (err) {
      setError(formatErrorMessage(err));
      console.error("Quiz generation error:", err.response?.data || err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleUserAnswerChange = (questionIndex, value) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
  };

  const handleSubmitQuiz = async () => {
    setError("");
    setSubmittingQuiz(true);
    try {
      const userAnswersPayload = Object.keys(userAnswers).map((index) => ({
        question_index: parseInt(index),
        user_answer: userAnswers[index] || "",
      }));

      const submissionPayload = {
        quiz_questions: generatedQuiz,
        user_answers: userAnswersPayload,
        fuzzy_match_threshold: 70,
      };

      const response = await api.post("/ai/submit-quiz", submissionPayload);
      setQuizResults(response.data);
      setQuizMode("results");
    } catch (err) {
      setError(formatErrorMessage(err));
      console.error("Quiz submission error:", err.response?.data || err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetakeQuiz = () => {
    setUserAnswers({});
    setQuizResults(null);
    setQuizMode("take");
  };

  const handleStartQuiz = () => {
    setUserAnswers({});
    setQuizResults(null);
    setQuizMode("take");
  };

  const handleGenerateNewQuiz = () => {
    setGeneratedQuiz(null);
    setSelectedSyllabyIds([]);
    setSelectedNoteIds([]);
    setUserAnswers({});
    setQuizResults(null);
    setQuizMode("generate");
  };

  if (loadingContent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-300 via-blue-300 to-cyan-300">
        <div className="flex flex-col items-center p-8 bg-white/80 rounded-lg shadow-md backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">Loading content...</p>
        </div>
      </div>
    );
  }

  const getQuestionResult = (qIndex) => {
    return quizResults?.results_detail.find((res) => res.question_index === qIndex);
  };

  const getOptionPrefix = (index) => String.fromCharCode(65 + index);

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="bg-white/90 p-8 rounded-xl shadow-lg backdrop-blur-sm">
          <h1 className="text-4xl font-extrabold text-center text-[#1F2937] mb-6">
            AI Quiz Generator
          </h1>
          <p className="text-lg text-gray-600 text-center mb-8">
            Select syllaby and/or notes to generate a custom quiz using AI.
          </p>

          {error && (
            <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-center">
              {error}
            </p>
          )}

          {quizMode === "generate" && (
            <>
              <div className="mb-8 p-6 border rounded-lg bg-white/80 backdrop-blur-sm shadow-sm">
                <h2 className="text-2xl font-bold text-[#1F2937] mb-4">
                  Select Content Sources
                </h2>

                {syllabyList.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-[#1F2937] mb-3">
                      Your Syllaby
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {syllabyList.map((syllaby) => (
                        <label
                          key={syllaby.id}
                          className={`flex items-center p-3 rounded-md border transition-all duration-200 ${
                            selectedSyllabyIds.includes(syllaby.id)
                              ? "bg-[#8DD0F3]/30 border-[#4A74C4]"
                              : "bg-white border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-[#4A74C4] rounded focus:ring-[#4A74C4]"
                            checked={selectedSyllabyIds.includes(syllaby.id)}
                            onChange={() => handleSyllabyToggle(syllaby.id)}
                            disabled={loadingQuiz}
                          />
                          <span className="ml-3 text-[#1F2937] font-medium">
                            {syllaby.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {noteList.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-[#1F2937] mb-3">
                      Your Notes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {noteList.map((note) => (
                        <label
                          key={note.id}
                          className={`flex items-center p-3 rounded-md border transition-all duration-200 ${
                            selectedNoteIds.includes(note.id)
                              ? "bg-[#7A54C9]/30 border-[#5E40B7]"
                              : "bg-white border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-[#5E40B7] rounded focus:ring-[#5E40B7]"
                            checked={selectedNoteIds.includes(note.id)}
                            onChange={() => handleNoteToggle(note.id)}
                            disabled={loadingQuiz}
                          />
                          <span className="ml-3 text-[#1F2937] font-medium">
                            {note.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {syllabyList.length === 0 && noteList.length === 0 && (
                  <p className="text-gray-700 text-center py-4">
                    No syllaby or notes found. Please create some content first!
                  </p>
                )}
              </div>

              <div className="mb-8 p-6 border rounded-lg bg-white/80 backdrop-blur-sm shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label
                    htmlFor="numQuestions"
                    className="block text-sm font-medium text-[#1F2937] mb-2"
                  >
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    id="numQuestions"
                    min="1"
                    max="10"
                    value={numQuestions}
                    onChange={(e) =>
                      setNumQuestions(
                        Math.max(1, Math.min(10, Number(e.target.value)))
                      )
                    }
                    className="shadow-sm block w-full border-gray-300 rounded-md p-3 text-[#1F2937]"
                    disabled={loadingQuiz}
                  />
                </div>
                <div>
                  <label
                    htmlFor="difficulty"
                    className="block text-sm font-medium text-[#1F2937] mb-2"
                  >
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="shadow-sm block w-full border-gray-300 rounded-md p-3 text-[#1F2937]"
                    disabled={loadingQuiz}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="questionType"
                    className="block text-sm font-medium text-[#1F2937] mb-2"
                  >
                    Question Type
                  </label>
                  <select
                    id="questionType"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="shadow-sm block w-full border-gray-300 rounded-md p-3 text-[#1F2937]"
                    disabled={loadingQuiz}
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={handleGenerateQuiz}
                  className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    loadingQuiz ||
                    (selectedSyllabyIds.length === 0 && selectedNoteIds.length === 0)
                  }
                >
                  {loadingQuiz ? "Generating..." : "Generate Quiz"}
                </button>
              </div>
            </>
          )}

          {generatedQuiz &&
            (quizMode === "review" || quizMode === "take" || quizMode === "results") && (
              <div className="mt-12 p-8 border rounded-xl bg-white/80 backdrop-blur-sm shadow-inner">
                <h2 className="text-3xl font-bold text-[#1F2937] mb-6 text-center">
                  {quizMode === "review" ? "Quiz Ready!" : "Take Your Quiz!"}
                </h2>

                {quizMode === "results" && quizResults && (
                  <div className="text-center mb-8 p-4 bg-green-100/30 rounded-md border border-green-400">
                    <p className="text-2xl font-bold text-[#1F2937]">
                      You scored {quizResults.score}%
                    </p>
                    <p className="text-lg text-gray-700">
                      {quizResults.total_correct} out of {quizResults.total_questions} correct!
                    </p>
                  </div>
                )}

                <div className="space-y-8">
                  {generatedQuiz.map((q, qIndex) => {
                    const result = getQuestionResult(qIndex);
                    const isCorrect =
                      quizMode === "results" && result ? result.is_correct : null;
                    const userAnswerDisplay =
                      quizMode === "results" && result
                        ? result.user_answer
                        : userAnswers[qIndex];

                    return (
                      <div
                        key={qIndex}
                        className={`bg-white p-6 rounded-lg shadow-md border ${
                          quizMode === "results"
                            ? isCorrect
                              ? "border-green-500 bg-green-50/50"
                              : "border-red-500 bg-red-50/50"
                            : "border-gray-200"
                        }`}
                      >
                        <p className="text-xl font-semibold text-[#1F2937] mb-3">
                          {qIndex + 1}. {q.question}
                        </p>

                        {quizMode !== "review" && (
                          <>
                            {q.question_type === "multiple_choice" &&
                              q.options?.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {q.options.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center">
                                      <input
                                        type="radio"
                                        id={`q${qIndex}-mc-opt${optIndex}`}
                                        name={`question-${qIndex}`}
                                        value={option}
                                        className="form-radio h-4 w-4 text-[#4A74C4]"
                                        onChange={() =>
                                          handleUserAnswerChange(qIndex, option)
                                        }
                                        checked={userAnswerDisplay === option}
                                        disabled={
                                          quizMode === "results" || submittingQuiz
                                        }
                                      />
                                      <label
                                        htmlFor={`q${qIndex}-mc-opt${optIndex}`}
                                        className={`ml-2 text-gray-700 ${
                                          quizMode === "results" &&
                                          option === q.correct_answer
                                            ? "font-bold text-green-700"
                                            : ""
                                        } ${
                                          quizMode === "results" &&
                                          userAnswerDisplay === option &&
                                          !isCorrect
                                            ? "text-red-700 line-through"
                                            : ""
                                        }`}
                                      >
                                        {getOptionPrefix(optIndex)}. {option}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {q.question_type === "true_false" && (
                              <div className="space-x-4">
                                {["True", "False"].map((val) => (
                                  <label key={val} className="inline-flex items-center">
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value={val}
                                      className="form-radio h-4 w-4 text-[#4A74C4]"
                                      onChange={() =>
                                        handleUserAnswerChange(qIndex, val)
                                      }
                                      checked={userAnswerDisplay === val}
                                      disabled={
                                        quizMode === "results" || submittingQuiz
                                      }
                                    />
                                    <span className="ml-2 text-gray-700">{val}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center space-x-4 mt-8 flex-wrap">
                  {quizMode === "review" && (
                    <button
                      onClick={handleStartQuiz}
                      className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-6 rounded-lg shadow hover:shadow-xl transform hover:scale-105 transition duration-300"
                    >
                      Start Quiz
                    </button>
                  )}

                  {quizMode === "take" && (
                    <button
                      onClick={handleSubmitQuiz}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:shadow-xl transform hover:scale-105 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submittingQuiz}
                    >
                      {submittingQuiz ? "Submitting..." : "Submit Quiz"}
                    </button>
                  )}

                  {quizMode === "results" && (
                    <>
                      <button
                        onClick={handleRetakeQuiz}
                        className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-6 rounded-lg shadow hover:shadow-xl transform hover:scale-105 transition duration-300"
                      >
                        Retake Quiz
                      </button>
                      <button
                        onClick={handleGenerateNewQuiz}
                        className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:shadow-xl transform hover:scale-105 transition duration-300"
                      >
                        Generate New Quiz
                      </button>
                      <button
                        onClick={() => navigate("/")}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:shadow-xl transform hover:scale-105 transition duration-300"
                      >
                        Back to Homepage
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuizGeneratorPage;
