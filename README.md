# GitaGPT ( Avdhesh Bhadoriya, Nikhil Sharma )

An AI-powered application that provides insights and answers questions about the Bhagavad Gita using Google's Gemini AI.

## Project Structure

```
GitaGPT/
├── backend/              # Backend server
│   ├── server.js        # Express server
│   ├── gita_verses.json # Gita verses data
│   └── package.json     # Backend dependencies
├── src/                 # Frontend source code
│   ├── App.jsx         # Main React component
│   └── ...
├── public/             # Static files
└── package.json        # Frontend dependencies
```

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=5002
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. From the root directory, install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Features
- Ask questions about the Bhagavad Gita
- Get AI-powered responses with relevant verses and explanations
- Clean and responsive UI
- Real-time interaction with Gemini AI
# GitaGPT
