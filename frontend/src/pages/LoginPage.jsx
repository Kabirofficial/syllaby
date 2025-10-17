import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import loginhero from '../assets/login.jpg';
import toast, { Toaster } from 'react-hot-toast';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(identifier, password);
      toast.success('Logged in successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      <Toaster position="top-right" />

      <div
        className="hidden md:flex md:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${loginhero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#5E40B7]/60 to-[#8DD0F3]/40 flex flex-col justify-center items-center p-8 text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4 animate-fadeIn">
            Unlock Your Learning Potential
          </h2>
          <p className="text-lg font-light animate-fadeIn delay-200">
            Personalized study plans, right at your fingertips.
          </p>
        </div>
      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center bg-[#F5F7FA] p-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transition-transform transform hover:scale-105">
          <h2 className="text-3xl font-bold text-center text-[#1F2937] mb-6">Login to Syllaby</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-[#1F2937] text-sm font-semibold mb-2">
                Username or Email
              </label>
              <input
                type="text"
                id="identifier"
                placeholder="Your username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4A74C4] transition duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[#1F2937] text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4A74C4] transition duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center bg-gradient-to-r from-[#5E40B7] to-[#7A54C9] text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-transform duration-200 disabled:opacity-50"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#1F2937]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#4A74C4] hover:text-[#5E40B7] font-semibold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;