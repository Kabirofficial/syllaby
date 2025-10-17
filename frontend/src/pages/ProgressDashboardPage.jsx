import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import UpcomingDeadlines from '../components/UpcomingDeadlines'; 

ChartJS.register(ArcElement, Tooltip, Legend);

const DashboardCard = ({ title, icon, children }) => (
  <div className="bg-white/90 rounded-3xl shadow-xl p-6 flex flex-col hover:shadow-2xl transition-shadow duration-300 w-full h-full">
    <div className="flex items-center mb-4">
      <span className="text-2xl mr-3">{icon}</span>
      <h3 className="text-xl font-bold text-[#1F2937]">{title}</h3>
    </div>
    <div className="flex-grow">{children}</div>
  </div>
);

const AIInsightCard = ({ insight }) => {
  const severityStyles = {
    low: { icon: "💡", borderColor: "border-green-400", textColor: "text-green-800", bgColor: "bg-green-50" },
    medium: { icon: "⚠️", borderColor: "border-yellow-400", textColor: "text-yellow-800", bgColor: "bg-yellow-50" },
    high: { icon: "🔥", borderColor: "border-red-400", textColor: "text-red-800", bgColor: "bg-red-50" },
  };
  const style = severityStyles[insight.severity] || severityStyles.low;

  return (
    <div className={`p-4 rounded-2xl border-l-8 ${style.borderColor} ${style.bgColor} ${style.textColor} shadow-md`}>
      <div className="flex items-start">
        <span className="text-2xl mr-3">{style.icon}</span>
        <div>
          <h4 className="font-bold text-lg">AI-Powered Insight</h4>
          <p className="mt-1">{insight.insight_text}</p>
        </div>
      </div>
    </div>
  );
};

const StreakTracker = ({ streaks }) => (
  <DashboardCard title="Study Streak" icon="🔥">
    <div className="flex justify-around items-center text-center h-full">
      <div>
        <p className="text-5xl font-extrabold text-[#7A54C9]">{streaks.current_streak}</p>
        <p className="text-gray-600 font-medium">Current Streak</p>
      </div>
      <div className="h-16 w-px bg-gray-200"></div>
      <div>
        <p className="text-3xl font-bold text-gray-700">{streaks.longest_streak}</p>
        <p className="text-gray-600">Longest Streak</p>
      </div>
    </div>
  </DashboardCard>
);

const TaskProgressChart = ({ completed, total }) => {
  const pending = total - completed;
  const completionPercentage = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  const data = {
    labels: ['Completed', 'Pending'],
    datasets: [{ data: [completed, pending], backgroundColor: ['#4A74C4', '#D8B4FE'], borderColor: ['#FFFFFF'], borderWidth: 4 }],
  };
  const options = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };

  return (
    <DashboardCard title="Task Completion" icon="✅">
      <div className="relative h-48 w-full flex items-center justify-center">
        <Doughnut data={data} options={options} />
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-[#1F2937]">{completionPercentage}%</span>
          <span className="text-sm text-gray-500">Done</span>
        </div>
      </div>
      <p className="text-center mt-4 font-semibold text-gray-700">{completed} of {total} tasks completed</p>
    </DashboardCard>
  );
};

const ActiveChallenges = ({ challenges }) => (
    <DashboardCard title="Active Challenges" icon="🏆">
        {challenges.length > 0 ? (
            <ul className="space-y-4">
                {challenges.map(challenge => (
                    // Make the entire card a link to the Kanban boards
                    <Link to="/kanban" key={challenge.id} className="block hover:scale-[1.02] transition-transform duration-200">
                        <li className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-bold text-gray-800">{challenge.title}</p>
                                <p className="text-sm font-semibold text-gray-600">
                                    {challenge.completed_tasks} / {challenge.total_tasks}
                                </p>
                            </div>

                            {/* --- NEW: The Progress Bar --- */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                    className="bg-gradient-to-r from-[#4A74C4] to-[#7A54C9] h-2.5 rounded-full" 
                                    style={{ width: `${challenge.completion_percentage}%` }}
                                ></div>
                            </div>

                            <p className="text-xs text-gray-500 text-right mt-1">
                                Ends on: {new Date(challenge.end_date).toLocaleDateString()}
                            </p>
                        </li>
                    </Link>
                ))}
            </ul>
        ) : (
            <div className="text-center text-gray-500 py-4 h-full flex flex-col justify-center items-center">
                <p>No active challenges. Why not start one?</p>
                <p className="text-sm mt-1">Group tasks together to focus on a goal!</p>
                <Link to="/kanban" className="text-[#5E40B7] font-semibold mt-3 inline-block">Go to Boards</Link>
            </div>
        )}
    </DashboardCard>
);

const RecentQuizzes = ({ quizzes }) => (
    <DashboardCard title="Recent Quiz Scores" icon="❓">
        {quizzes.length > 0 ? (
             <ul className="space-y-2">
                {quizzes.map(quiz => (
                    <li key={quiz.id} className="flex justify-between items-center p-2 border-b">
                        <span className="text-gray-700 truncate pr-2">{quiz.quiz_topic}</span>
                        <span className={`font-bold text-lg ${quiz.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>{quiz.score}%</span>
                    </li>
                ))}
            </ul>
        ) : (
             <div className="text-center text-gray-500 py-4">
                <p>No recent quiz attempts.</p>
                <Link to="/quiz/generate" className="text-[#5E40B7] font-semibold mt-2 inline-block">Take a Quiz</Link>
            </div>
        )}
    </DashboardCard>
);

const ProgressDashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/progress/dashboard');
        setDashboardData(response.data);
      } catch (err) {
        const errorMessage = err.response?.data?.detail || "Failed to load progress data.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] font-sans">
        <div className="flex flex-col items-center p-8 bg-white rounded-3xl shadow-2xl">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">Analyzing your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] overflow-auto font-sans">
      <Toaster position="top-right" />
      <div className="relative z-10 w-full min-h-full px-6 md:px-12 py-12">
        <div className="w-full text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">Your Progress Dashboard</h1>
          <p className="text-lg md:text-xl text-gray-200 mt-3">Track your habits, celebrate milestones, and stay motivated.</p>
        </div>

        {error && !dashboardData && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-center shadow-md">
            {error}
          </div>
        )}
        
        {dashboardData && (
          <div className="max-w-7xl mx-auto space-y-8">
            {dashboardData.ai_insight && (
              <div><AIInsightCard insight={dashboardData.ai_insight} /></div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2"><StreakTracker streaks={dashboardData.streaks} /></div>
              <div className="lg:col-span-2"><TaskProgressChart completed={dashboardData.completed_tasks} total={dashboardData.total_tasks} /></div>
              <div className="lg:col-span-2"><ActiveChallenges challenges={dashboardData.active_challenges} /></div>
              <div className="lg:col-span-2"><RecentQuizzes quizzes={dashboardData.recent_quiz_scores} /></div>
            </div>

            <div>
              <UpcomingDeadlines tasks={dashboardData.upcoming_tasks} loading={loading} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboardPage;