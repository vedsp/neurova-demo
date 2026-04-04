import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Chatbot.css';

export default function Chatbot() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: "Hi Vedant! I'm Neurova, your physical therapy AI. I've reviewed your recent rehab sessions. How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'bot', 
        text: data.reply || "Sorry, I couldn't process that request." 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'bot', 
        text: "Sorry, I'm having trouble connecting to the server. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-wrapper">
      {/* ── TOP BAR ── */}
      <header className="chat-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18}/> Home
        </button>
        <span className="chat-brand">Neurova AI Coach</span>
        <div style={{width: 70}}></div> {/* Spacer to align brand center */}
      </header>

      {/* ── CHAT HISTORY LOG ── */}
      <main className="chat-body">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`chat-bubble-container ${m.role}`}
            >
              <div className={`chat-bubble ${m.role}`}>
                {m.text}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="chat-bubble-container bot"
            >
              <div className="chat-bubble bot typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      {/* ── INPUT AREA ── */}
      <footer className="chat-footer">
        <form onSubmit={handleSend} className="chat-input-row">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Ask about your form, progress, or advice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="chat-send-btn" disabled={!input.trim() || isLoading}>
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
