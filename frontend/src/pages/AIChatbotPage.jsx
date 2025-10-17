/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import api from "../api/axiosConfig";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import toast, { Toaster } from "react-hot-toast";

const ThinkingIndicator = () => (
  <div className="flex justify-start">
    <div className="max-w-[70%] p-3 rounded-2xl shadow bg-white/90 border border-gray-200 text-[#1F2937] flex items-center gap-3">
      <div className="flex space-x-1 p-2">
        <span className="sr-only">Thinking...</span>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  </div>
);

const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] p-4 rounded-2xl shadow-md prose prose-sm ${
          isUser
            ? "bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white prose-invert"
            : "bg-white/90 text-[#1F2937] border border-gray-200"
        }`}
      >
        <p className="font-semibold text-xs mb-1 opacity-80">
          {isUser ? "You" : "Syllaby AI"}
        </p>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
};

const AIChatbotPage = () => {
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [loadingChatStart, setLoadingChatStart] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const formatErrorMessage = (err) => {
    if (err.response?.data?.detail) return err.response.data.detail;
    if (err.message) return `Network error: ${err.message}`;
    return "An unexpected error occurred. Please try again.";
  };
  
  const startChat = async () => {
    setLoadingChatStart(true);
    setChatHistory([]);
    setChatSessionId(null);
    try {
      const { data } = await api.post("/ai/chat/start", {}); 
      setChatSessionId(data.session_id);
      setChatHistory([{ role: "assistant", content: data.initial_message }]);
    } catch (err) {
      toast.error(formatErrorMessage(err));
    } finally {
      setLoadingChatStart(false);
    }
  };

  useEffect(() => {
    startChat();
  }, []);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatHistory]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [userMessage]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userMessage.trim() || !chatSessionId) return;

    const messageToSend = userMessage.trim();
    setUserMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: messageToSend }]);
    setLoadingMessage(true);

    try {
      const { data } = await api.post(`/ai/chat/${chatSessionId}/message`, {
        user_message: messageToSend,
      });
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.assistant_message },
      ]);
    } catch (err) {
      toast.error(formatErrorMessage(err));
      setChatHistory((prev) => prev.slice(0, -1)); 
    } finally {
      setLoadingMessage(false);
    }
  };
  
  const handleResetChat = () => {
    startChat();
  };

  if (loadingChatStart) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] font-sans">
        <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#7A54C9] mb-4"></div>
          <p className="text-lg text-[#1F2937] font-semibold">Connecting to Syllaby AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative bg-gradient-to-br from-[#D8B4FE] via-[#818CF8] to-[#60A5FA] font-sans flex flex-col">
      <Toaster position="top-right" />

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <span className="absolute w-96 h-96 bg-purple-300 rounded-full opacity-30 -top-20 -left-20 animate-pulseSlow"></span>
        <span className="absolute w-80 h-80 bg-blue-300 rounded-full opacity-20 top-40 right-0 animate-pulseSlow"></span>
      </div>

      <div className="flex-1 flex w-full max-w-[1400px] mx-auto px-4 py-10 flex-col lg:flex-row gap-6 z-10 min-h-0">
        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/30 min-h-0">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-center text-[#1F2937] mb-4">
            Syllaby AI Chat
          </h1>
          <p className="text-gray-700 text-center mb-6">
            This is a general-purpose AI assistant. For contextual help based on your documents, try the <Link to="/study-assistant" className="font-bold text-[#5E40B7] hover:underline">Study Assistant</Link>.
          </p>

          <div className="flex-1 flex flex-col p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-gray-200 shadow-inner min-h-0">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))}
              {loadingMessage && <ThinkingIndicator />}
            </div>

            <form onSubmit={handleSendMessage} className="flex mt-4 gap-3 items-end">
              <textarea
                ref={textareaRef}
                rows="1"
                className="flex-grow border-gray-300 rounded-2xl p-3 focus:ring-[#4A74C4] focus:border-[#4A74C4] transition duration-200 resize-none shadow-sm max-h-40"
                placeholder="Type your message..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={loadingMessage}
              />
              <button
                type="submit"
                disabled={loadingMessage || !userMessage.trim()}
                className="bg-gradient-to-r from-[#4A74C4] to-[#5E40B7] text-white font-bold p-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed self-stretch flex items-center"
              >
                Send
              </button>
            </form>
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={handleResetChat}
              disabled={loadingMessage || loadingChatStart}
              className="bg-gray-400 text-white font-bold py-2 px-5 rounded-2xl shadow-md hover:bg-gray-500 transform hover:scale-105 transition duration-300"
            >
              New Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatbotPage;