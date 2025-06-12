import { useState } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('http://localhost:5002/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to get response');
      }

      setResponse(data.response);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatResponse = (text) => {
    // Split the text into lines
    const lines = text.split('\n');
    
    // Process each line
    return lines.map((line, index) => {
      // Check if the line is a heading (starts with a number or is in all caps)
      if (/^\d+\./.test(line) || /^[A-Z\s]+$/.test(line)) {
        return <h3 key={index} className="text-xl font-semibold text-indigo-600 mt-6 mb-3">{line}</h3>;
      }
      // Check if the line is a subheading (starts with a dash)
      else if (line.startsWith('-')) {
        return <h4 key={index} className="text-lg font-medium text-gray-800 mt-4 mb-2">{line.substring(1).trim()}</h4>;
      }
      // Regular paragraph
      else if (line.trim()) {
        return <p key={index} className="text-gray-700 leading-relaxed mb-3">{line}</p>;
      }
      // Empty line
      return <br key={index} />;
    });
  };

  return (
    <div className="app">
      <div className="container">
        <div className="content">
          <div className="header">
            <h1>GitaGPT</h1>
            <p className="subtitle">Discover wisdom from the Bhagavad Gita</p>
          </div>
          
          <form onSubmit={handleSubmit} className="form-group">
            <div className="input-wrapper">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="query-input"
                rows="3"
                placeholder="Ask anything about life, karma, dharma, or spirituality..."
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className={`submit-button ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <span className="button-content">
                  <span className="loading-spinner"></span>
                  <span>Seeking Wisdom...</span>
                </span>
              ) : (
                <span className="button-content">
                  <span className="button-icon">🕉️</span>
                  <span>Get Divine Insight</span>
                </span>
              )}
            </button>
          </form>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {response && (
            <div className="response-card">
              <div className="response-header">
                <span className="response-icon">✨</span>
                <h2>Divine Wisdom</h2>
              </div>
              <div className="response-content">
                {response.split('\n').map((line, index) => (
                  <p key={index} className="response-paragraph">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
