import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bg-gradient-to-r from-[#8DD0F3] to-[#5E40B7] p-4 shadow-md font-sans sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto flex justify-between items-center px-4 md:px-8">
        
        {/* Logo */}
        <Link
          to="/"
          className="text-white text-2xl md:text-3xl font-bold tracking-wide hover:text-white/90 transition-all duration-300"
        >
          Syllaby
        </Link>

        {/* Navigation */}
        <ul className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-2 md:space-y-0">
          {!isAuthenticated() ? (
            <>
              <li>
                <Link
                  to="/login"
                  className="text-white hover:text-[#F0F9FF] transition duration-300 px-3 py-2 rounded-md"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="bg-white text-[#5E40B7] hover:bg-[#F0F9FF] font-semibold py-2 px-4 rounded-md shadow-md transition duration-300"
                >
                  Register
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/home"
                  className="text-white hover:text-[#F0F9FF] transition duration-300 px-3 py-2 rounded-md"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/kanban"
                  className="text-white hover:text-[#F0F9FF] transition duration-300 px-3 py-2 rounded-md"
                >
                  Kanban Boards
                </Link>
              </li>
              {user && (
                <li className="text-[#F0F9FF] italic text-sm md:text-base">
                  Welcome, {user.username}!
                </li>
              )}
              <li>
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-300"
                >
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
