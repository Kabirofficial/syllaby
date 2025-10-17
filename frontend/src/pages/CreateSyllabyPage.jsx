import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import toast, { Toaster } from "react-hot-toast";

const CreateSyllabyPage = () => {
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [rawInputOutline, setRawInputOutline] = useState("");
  const [durationValue, setDurationValue] = useState(12);
  const [durationUnit, setDurationUnit] = useState("weeks");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const formatError = (err) => {
    if (err.response?.data?.detail) {
      if (Array.isArray(err.response.data.detail)) {
        const firstError = err.response.data.detail[0];
        return `Error in '${firstError.loc[1]}': ${firstError.msg}`;
      }
      return typeof err.response.data.detail === "string"
        ? err.response.data.detail
        : JSON.stringify(err.response.data.detail);
    }
    return err.message || "Failed to generate Syllaby. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (rawInputOutline.trim().length < 0) {
      const message = "Please provide a more detailed course outline (at least 50 characters).";
      setError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/syllaby", {
        title,
        course_code: courseCode,
        raw_input_outline: rawInputOutline,
        duration: parseInt(durationValue, 10),
        unit: durationUnit,
      });

      const newSyllabusId = response.data?.id;
      if (newSyllabusId) {
        toast.success("Syllaby generated successfully!");
        navigate(`/syllaby/${newSyllabusId}`);
      } else {
        setError("Syllaby created, but could not redirect. Find it in your list.");
        navigate('/syllaby');
      }
    } catch (err) {
      const formattedError = formatError(err);
      setError(formattedError);
      toast.error(formattedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center py-12 px-4 md:px-8 font-sans overflow-hidden bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <Toaster position="top-right" />
      <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
      <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      <span className="absolute w-72 h-72 bg-pink-300 rounded-full opacity-20 -bottom-16 left-20 animate-pulseSlow"></span>

      <div className="bg-white/90 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-4xl relative z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-[#1F2937] mb-4">
          Generate New Syllaby
        </h1>
        <p className="text-lg md:text-xl text-gray-600 text-center mb-8">
          Enter your course outline, and Syllaby AI will create a personalized study plan for you.
        </p>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[#1F2937] mb-2">
                Syllaby Title
              </label>
              <input
                type="text"
                id="title"
                placeholder="e.g., Introduction to Python Programming"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] shadow-sm text-[#1F2937]"
              />
            </div>
            <div>
              <label htmlFor="courseCode" className="block text-sm font-medium text-[#1F2937] mb-2">
                Course Code (Optional)
              </label>
              <input
                type="text"
                id="courseCode"
                placeholder="e.g., CS101, MATH205"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                disabled={loading}
                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] shadow-sm text-[#1F2937]"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-[#1F2937] mb-2">
              Course Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="duration"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                required
                min="1"
                max="52"
                disabled={loading}
                className="w-24 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] shadow-sm text-[#1F2937]"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                disabled={loading}
                className="flex-1 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] shadow-sm text-[#1F2937]"
              >
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rawInputOutline" className="block text-sm font-medium text-[#1F2937] mb-2">
              Course Outline / Key Topics
            </label>
            <textarea
              id="rawInputOutline"
              rows="10"
              placeholder="Provide a detailed outline of your course, including main topics, sub-topics, assessment types, and learning objectives."
              value={rawInputOutline}
              onChange={(e) => setRawInputOutline(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] shadow-sm text-[#1F2937]"
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Spinner />}
            <span>{loading ? "Generating Syllaby..." : "Generate My Syllaby"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default CreateSyllabyPage;