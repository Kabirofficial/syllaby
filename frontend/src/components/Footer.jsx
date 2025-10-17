import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#1F2937] text-white py-10 font-sans">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center">
        
        <div className="mb-6 md:mb-0 text-center md:text-left">
          <Link
            to="/"
            className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8DD0F3] to-[#7A54C9] hover:scale-105 transition-transform duration-300 inline-block"
          >
            Syllaby
          </Link>
          <p className="text-sm text-gray-400 mt-2">
            &copy; {new Date().getFullYear()} Syllaby. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-8 text-gray-300 text-sm">
          <Link
            to="/about"
            className="hover:text-[#8DD0F3] hover:underline transition-all duration-200"
          >
            About Us
          </Link>
          <Link
            to="/features"
            className="hover:text-[#8DD0F3] hover:underline transition-all duration-200"
          >
            Features
          </Link>
          <Link
            to="/privacy"
            className="hover:text-[#8DD0F3] hover:underline transition-all duration-200"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="hover:text-[#8DD0F3] hover:underline transition-all duration-200"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
