import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";

const EditSyllabyPage = () => {
  const { syllabyId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [rawInputOutline, setRawInputOutline] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSyllaby = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/syllaby/${syllabyId}`);
        const data = response.data;
        setTitle(data.title);
        setCourseCode(data.course_code || "");
        setRawInputOutline(data.raw_input_outline);
        setGeneratedContent(data.generated_content);
      } catch (err) {
        setError(
          err.response?.data?.detail || "Failed to load syllaby for editing."
        );
        console.error("Fetch syllaby error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSyllaby();
  }, [syllabyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.put(`/syllaby/${syllabyId}`, {
        title,
        course_code: courseCode,
      });
      alert("Syllaby updated successfully!");
      navigate(`/syllaby/${syllabyId}`);
    } catch (err) {
      let errorMessage = "Failed to update syllaby. Please try again.";
      if (err.response && err.response.data) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail
            .map((e) => {
              const field =
                e.loc && e.loc.length > 1 ? e.loc[1] : "unknown field";
              return `${field}: ${e.msg}`;
            })
            .join("; ");
        } else if (typeof err.response.data.detail === "string") {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        errorMessage = `Network error: ${err.message}`;
      }
      setError(errorMessage);
      console.error("Update syllaby error:", err.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] font-sans">
        <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">
            Loading syllaby for editing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center py-12 px-4 md:px-8 font-sans bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] overflow-hidden">
      
      <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
      <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      <span className="absolute w-72 h-72 bg-pink-300 rounded-full opacity-20 -bottom-16 left-20 animate-pulseSlow"></span>

      <div className="bg-white/90 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-4xl relative z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-[#1F2937] mb-6">
          Edit Syllaby: {title}
        </h1>
        <p className="text-lg md:text-xl text-gray-600 text-center mb-8">
          Update the basic information for your syllaby.
        </p>

        {error && submitting && (
          <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              Syllaby Title
            </label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] focus:border-[#4A74C4] shadow-sm text-[#1F2937]"
              placeholder="e.g., Introduction to Python Programming"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              Course Code (Optional)
            </label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#4A74C4] focus:border-[#4A74C4] shadow-sm text-[#1F2937]"
              placeholder="e.g., CS101, MATH205"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">Original Outline (Read Only)</h3>
            <pre className="whitespace-pre-wrap text-gray-800 text-sm">{rawInputOutline}</pre>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">AI Generated Content (Read Only)</h3>
            <pre className="whitespace-pre-wrap text-gray-800 text-sm">{generatedContent}</pre>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Spinner />}
            <span>{submitting ? "Updating Syllaby..." : "Save Changes"}</span>
          </button>

          <Link
            to={`/syllaby/${syllabyId}`}
            className="block text-center text-[#4A74C4] hover:text-[#5E40B7] font-semibold mt-4 py-2 px-4 transition duration-200"
          >
            Cancel
          </Link>
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

export default EditSyllabyPage;
