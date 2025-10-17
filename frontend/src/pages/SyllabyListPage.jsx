import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";

const SyllabyListPage = () => {
  const [syllabyList, setSyllabyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSyllabyList = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/syllaby");
        setSyllabyList(response.data);
      } catch (err) {
        const errorMessage =
          err.response?.data?.detail || "Failed to fetch syllabi.";
        setError(errorMessage);
        console.error("Syllaby list fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSyllabyList();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Syllaby?")) {
      try {
        await api.delete(`/syllaby/${id}`);
        setSyllabyList((prevList) =>
          prevList.filter((syllaby) => syllaby.id !== id)
        );
        alert("Syllaby deleted successfully!");
      } catch (err) {
        const errorMessage =
          err.response?.data?.detail || "Failed to delete syllaby.";
        setError(errorMessage);
        console.error("Syllaby deletion error:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 font-sans">
        <div className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-700 font-semibold">
            Loading your syllabi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans py-10 px-4 bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA]">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-4xl font-extrabold text-gray-900">
            My Syllaby Collection
          </h1>
          <Link
            to="/syllaby/new"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:shadow-xl transform hover:scale-105 transition duration-300 flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Generate New Syllaby
          </Link>
        </div>
        <p className="text-gray-600 text-center mb-8 text-lg">
          Manage your AI-generated study plans here.
        </p>

        {error && (
          <p
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-center"
            role="alert"
          >
            {error}
          </p>
        )}

        {syllabyList.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <p className="text-xl text-gray-700 mb-4">
              You haven't created any syllabi yet!
            </p>
            <Link
              to="/syllaby/new"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-xl transform hover:scale-105 transition duration-300"
            >
              Generate Your First Syllaby
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {syllabyList.map((syllaby) => (
              <div
                key={syllaby.id}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col justify-between hover:shadow-lg transform hover:-translate-y-1 transition duration-300"
              >
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 truncate">
                    {syllaby.title}
                  </h2>
                  <p className="text-gray-500 text-sm mb-3">
                    {syllaby.course_code || "No Course Code"}
                  </p>
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                    {syllaby.raw_input_outline}
                  </p>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Link
                    to={`/syllaby/${syllaby.id}`}
                    className="flex-grow bg-blue-600 text-white text-center py-2 px-4 rounded-md text-sm font-semibold hover:bg-purple-600 transition duration-200"
                  >
                    View Plan
                  </Link>
                  <button
                    onClick={() => handleDelete(syllaby.id)}
                    className="bg-red-500 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-red-600 transition duration-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyllabyListPage;
