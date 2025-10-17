import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaLock, FaEnvelope } from 'react-icons/fa';
import registerHero from '../assets/registerbg.jpg';
import toast, { Toaster } from 'react-hot-toast';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      toast.error('Username must be at least 3 characters long.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      toast.error('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      
      toast.success('Registration successful! Please log in.');
      navigate('/login');
    } catch (err) {
      let displayMessage = 'Registration failed. Please try again.';
      const errorDetail = err.response?.data?.detail;

      if (errorDetail) {
        if (Array.isArray(errorDetail)) {
          displayMessage = `Error in ${errorDetail[0].loc[1]}: ${errorDetail[0].msg}`;
        } else {
          displayMessage = errorDetail;
        }
      }
      
      setError(displayMessage);
      toast.error(displayMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans relative bg-cover bg-center"
      style={{ backgroundImage: `url(${registerHero})` }}
    >
      <Toaster position="top-right" />

      <div className="absolute inset-0 bg-gradient-to-t from-[#5E40B7]/60 to-[#8DD0F3]/40"></div>

      <div className="relative z-10 bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md transform hover:scale-105 transition duration-300">
        <h2 className="text-3xl font-extrabold text-center text-[#1F2937] mb-6">
          Create Your Account
        </h2>

        {error && (
          <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Username"
              className="pl-10 py-3 w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4A74C4] shadow-sm transition duration-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="relative">
            <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email Address"
              className="pl-10 py-3 w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4A74C4] shadow-sm transition duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              className="pl-10 py-3 w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4A74C4] shadow-sm transition duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              placeholder="Confirm Password"
              className="pl-10 py-3 w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4A74C4] shadow-sm transition duration-200"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center bg-gradient-to-r from-[#5E40B7] to-[#7A54C9] text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#5E40B7] underline font-semibold hover:text-[#7A54C9]"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;