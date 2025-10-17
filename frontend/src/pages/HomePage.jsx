import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axiosConfig";
import { Link, useLocation } from "react-router-dom";
import UpcomingDeadlines from "../components/UpcomingDeadlines";
import CurrentWeekCard from "../components/CurrentWeekCard";
import toast, { Toaster } from "react-hot-toast";

const HomePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [homepageData, setHomepageData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState("");

  const formatErrorMessage = (err) => {
    let errorMessage = "An unexpected error occurred. Please try again.";
    if (err.response?.data) {
      if (Array.isArray(err.response.data.detail)) {
        errorMessage = err.response.data.detail
          .map((e) => `${e.loc?.[1] || "field"}: ${e.msg}`)
          .join("; ");
      } else if (typeof err.response.data.detail === "string") {
        errorMessage = err.response.data.detail;
      }
    } else if (err.message) {
      errorMessage = `Network error: ${err.message}`;
    }
    return errorMessage;
  };

  useEffect(() => {
    if (location.state?.fromLogin) toast.success("Logged in successfully!");

    const fetchHomepageData = async () => {
      setLoadingContent(true);
      setError("");
      try {
        const response = await api.get("/homepage-data");
        setHomepageData(response.data);
      } catch (err)
      {
        setError(formatErrorMessage(err));
        console.error("Homepage data fetch error:", err);
      } finally {
        setLoadingContent(false);
      }
    };

    if (user) fetchHomepageData();
    else setLoadingContent(false);
  }, [user, location.state]);

  if (loadingContent) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] font-sans">
        <div className="flex flex-col items-center p-8 bg-white rounded-3xl shadow-2xl">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">
            Loading your personalized dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] overflow-auto font-sans">
      <Toaster position="top-right" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
        <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      </div>
      <div className="relative z-10 w-full h-full px-6 md:px-12 py-12">
        <div className="w-full text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A74C4] to-[#5E40B7]">
              {user?.username || "User"}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mt-3">
            Your personalized study journey continues.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-center shadow-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          <div className="lg:col-span-2 space-y-8">
            {homepageData?.current_week && (
              <CurrentWeekCard current_week={homepageData.current_week} />
            )}

            <section className="w-full">
              <h2 className="text-2xl font-bold text-white mb-6">
                Quick Actions
              </h2>
              <div className="grid md:grid-cols-2 gap-6 w-full">
                <ActionCard
                  color="from-[#4A74C4] to-[#5E40B7]"
                  icon="📘"
                  title="Create New Syllaby"
                  desc="Generate a smart study plan with AI."
                  link="/syllaby/new"
                  cta="Generate"
                />
                <ActionCard
                  color="from-[#5E40B7] to-[#7A54C9]"
                  icon="📂"
                  title="My Syllaby Collection"
                  desc="View and manage your study plans."
                  link="/syllaby"
                  cta="View Plans"
                />
              </div>
            </section>

            <section className="w-full mt-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                AI Free-Form Quiz
              </h2>
              <FreeFormQuizCard />
            </section>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <UpcomingDeadlines />
          </div>
        </div>

        <section className="mt-12 w-full">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Tools & Resources
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <MiniCard
              icon="🤖"
              title="Ask Syllaby AI"
              desc="Interactive tutoring."
              link="/ai-chatbot"
            />
            <MiniCard
              icon="📝"
              title="My Smart Notes"
              desc="View AI-powered notes."
              link="/notes"
            />
            <MiniCard
              icon="❓"
              title="Generate Quizzes"
              desc="Create custom quizzes."
              link="/quiz/generate"
            />
            <MiniCard
              icon="📊"
              title="Progress Dashboard"
              desc="Visualize your journey."
              link="/progress-dashboard"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const ActionCard = ({ color, icon, title, desc, link, cta }) => (
  <div
    className={`bg-white/90 rounded-3xl shadow-xl p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 w-full border-t-8 border-transparent`}
  >
    <div
      className={`mb-4 text-4xl bg-gradient-to-r ${color} text-white w-16 h-16 rounded-full flex items-center justify-center shadow-md transform hover:scale-110 transition-transform duration-300`}
    >
      {icon}
    </div>
    <h3 className="text-xl font-bold text-[#1F2937] mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{desc}</p>
    <Link
      to={link}
      className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-semibold py-2 px-6 rounded-full shadow hover:scale-105 transition-transform duration-300"
    >
      {cta}
    </Link>
  </div>
);

const MiniCard = ({ icon, title, desc, link }) => (
  <div className="bg-white/90 rounded-3xl shadow-xl p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 border-t-4 border-transparent w-full">
    <div className="mb-3 text-3xl">{icon}</div>
    <h3 className="text-lg font-bold text-[#1F2937] mb-2">{title}</h3>
    <p className="text-gray-600 mb-4 text-sm">{desc}</p>
    <Link
      to={link}
      className="text-[#5E40B7] hover:text-[#7A54C9] font-semibold transition duration-200"
    >
      Open →
    </Link>
  </div>
);

const FreeFormQuizCard = () => (
  <Link
    to="/quiz/freeform"
    className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center hover:shadow-3xl hover:scale-105 transition-all duration-300 w-full"
  >
    <div className="mb-4 text-5xl p-4 bg-white rounded-full text-[#4A74C4] shadow-md animate-bounce">
      ❓
    </div>
    <h3 className="text-xl font-bold text-white mb-2">AI Free-Form Quiz</h3>
    <p className="text-white text-sm mb-4">
      Generate open-ended questions from your study materials and get AI
      feedback on your answers.
    </p>
    <span className="bg-white text-[#5E40B7] font-semibold py-2 px-5 rounded-full shadow hover:scale-105 transition-transform duration-300">
      Start Quiz
    </span>
  </Link>
);

export default HomePage;