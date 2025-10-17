import React from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  BarChart2,
  Calendar,
  Zap,
  BookOpen,
  Sparkles,
  Layers,
  MessageSquare,
} from "lucide-react";
import Footer from "../components/Footer";
import heroimg from "../assets/hero.jpg";

const features = [
  {
    icon: <Zap className="w-12 h-12 text-purple-600" />,
    title: "Adaptive Pacing & Difficulty",
    desc: "AI adjusts the pace based on your performance, recommending extra resources or advanced topics.",
  },
  {
    icon: <BarChart2 className="w-12 h-12 text-purple-600" />,
    title: "Predictive Analytics",
    desc: "Get AI-powered insights into potential challenges based on your study habits and upcoming topics.",
  },
  {
    icon: <Brain className="w-12 h-12 text-purple-600" />,
    title: "Smart Notes & Summarization",
    desc: "Take notes inside Syllaby and let AI summarize key points or extract tasks automatically.",
  },
  {
    icon: <Layers className="w-12 h-12 text-purple-600" />,
    title: "Flashcard Generation",
    desc: "Instantly generate flashcards from your syllabus or uploaded materials for quick revision.",
  },
  {
    icon: <MessageSquare className="w-12 h-12 text-purple-600" />,
    title: "AI-Powered Tutor",
    desc: "Get interactive tutoring, in-depth explanations, and even Socratic questioning to deepen understanding.",
  },
  {
    icon: <Sparkles className="w-12 h-12 text-purple-600" />,
    title: "Streaks & Challenges",
    desc: "Stay motivated with daily streaks and topic-based challenges to build consistent study habits.",
  },
  {
    icon: <BarChart2 className="w-12 h-12 text-purple-600" />,
    title: "Progress Visualizations",
    desc: "View beautiful dashboards showing completed tasks, milestones, and upcoming goals.",
  },
  {
    icon: <Calendar className="w-12 h-12 text-purple-600" />,
    title: "Calendar Sync",
    desc: "Sync your Syllaby plan with Google or Outlook calendars for seamless scheduling.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F7FA] text-[#1F2937] w-full">
      <section
        className="relative w-full flex-grow flex flex-col justify-center items-center px-6 py-20 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroimg})`,
        }}
      >
        <div className="relative z-10 text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 text-white">
            Welcome to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF69B4] drop-shadow-lg">
              Syllaby
            </span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-12 text-white">
            Your syllabus, supercharged. Let AI turn your course outline into a
            complete study plan with daily tasks, quizzes, video lessons, and
            resources.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-[#5E40B7] to-[#7A54C9] text-white font-bold py-3 px-10 rounded-full shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 text-lg"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white hover:bg-white hover:text-[#5E40B7] font-bold py-3 px-10 rounded-full shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 text-lg"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-[#1F2937]">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {features.map((f, index) => (
              <div
                key={index}
                className="bg-[#F9FAFB] rounded-2xl shadow-md p-8 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center"
              >
                <div className="flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
