import React, { useState, useEffect, useRef } from 'react';
import { searchVerse } from '../api/api';  // Importing the searchVerse function from the API file

export default function ChatUI() {
  const [message, setMessage] = useState("");  // State for holding the current message
  const [messages, setMessages] = useState([  // State for storing all chat messages
    {
      sender: "bot", 
      text: "Radhey Radhey, I am GitaGPT. Ask me anything."
    }
  ]);

  const messagesEndRef = useRef(null);  // Reference for scrolling to the latest message

  const handleSend = async () => {
    if (message.trim() === "") return;  // Prevent empty messages from being sent

    // Add the user's message to the chat
    const newMessages = [...messages, { sender: "user", text: message }];
    setMessages(newMessages);
    setMessage("");  // Reset the message input after sending

    try {
      // Send the user's query to the backend using the API function
      const data = await searchVerse(message);

      if (data.translation) {
        // If the response contains a translation, display it in the chat
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: data.translation },
        ]);
      } else {
        // If no translation is found, send a default message
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: "Sorry, no answer found." },
        ]);
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      // If there’s an error with the request, display an error message
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: "Error contacting server. Please try again later." },
      ]);
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the chat when a new message is added
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col justify-between items-center pt-4 pb-24 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl bg-white shadow-md rounded-2xl p-4 mb-4">
        <div className="flex items-center space-x-3">
          <img
            src="./public/image.jpg"  // Replace with your image path if needed
            alt="GitaGPT"
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h1 className="text-xl font-semibold">GitaGPT</h1>
            <p className="text-sm text-gray-500">
              Get Answers to Life's Questions with GitaGPT - Your AI Spiritual Companion.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Box */}
      <div className="w-full max-w-2xl flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === "bot" ? "items-start" : "items-end justify-end"} space-x-3`}
          >
            {msg.sender === "bot" && (
              <img
                src="./public/image.jpg"  // Replace with your image path if needed
                alt="Bot Icon"
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div
              className={`p-3 rounded-2xl shadow text-sm max-w-xs ${
                msg.sender === "bot"
                  ? "bg-white text-gray-800"
                  : "bg-blue-500 text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="w-full max-w-2xl fixed bottom-4 px-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask your question from the Gita..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}  // Update message state on input change
            onKeyDown={(e) => e.key === "Enter" && handleSend()}  // Send message on Enter key
            className="flex-1 p-3 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="p-3 bg-orange-400 rounded-full hover:bg-orange-500 text-white rotate-180"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12l16.5-9-4.5 9 4.5 9-16.5-9z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Footer (Optional) */}
      <div className="mt-20 text-sm text-gray-400">
        {/* Optional Footer Text */}
      </div>
    </div>
  );
}
