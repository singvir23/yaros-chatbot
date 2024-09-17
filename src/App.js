import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function Chat() {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!prompt) return;
    setError(null);
    setIsLoading(true);
  
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString();
    const enhancedPrompt = `Current date and time: ${formattedDate}. User query: ${prompt}`;
  
    try {
      const response = await axios.post('http://localhost:5001/chat', { prompt: enhancedPrompt }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const assistantResponse = response.data.assistant_response;
      const gifUrl = response.data.gifUrl;
  
      setResponses([...responses, { user: prompt, assistant: assistantResponse, gif: gifUrl }]);
      setPrompt('');
    } catch (error) {
      console.error('Error fetching assistant response:', error);
      setError(error.response?.data?.error || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  return (
    <div className="chat-container">
      <div className="chat-box">
        <div className="messages">
          {responses.map((res, index) => (
            <div key={index} className="message-row">
              <div className="assistant-message">
                <img src="/yaros.jpg" alt="assistant" className="avatar" />
                <div className="message-content">
                  <p className="assistant-text"><strong>Professor Yaros:</strong> {res.assistant}</p>
                  {res.gif && (
                    <div className="gif-container">
                      <img src={res.gif} alt="response-gif" className="response-gif" />
                    </div>
                  )}
                </div>
              </div>
              <div className="user-message">
                <p className="user-text"><strong>You:</strong> {res.user}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          )}
          <div ref={messagesEndRef}></div>
        </div>

        <form onSubmit={handleSubmit} className="input-area">
          <input
            type="text"
            value={prompt}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Ask something..."
            className="input-box"
          />
          <button type="submit" className="send-button" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        {error && <p className="error-message">Error: {error}</p>}
      </div>
    </div>
  );
}

export default Chat;
