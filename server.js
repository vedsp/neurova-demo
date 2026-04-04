// Simple Express backend — saves session JSON to rehab_logs folder
// Runs on port 3001 alongside Vite dev server (port 5173)
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3001;

// rehab_logs folder is in the root
const LOGS_DIR = path.join(__dirname, 'rehab_logs');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// POST /api/save-session — receives session JSON, writes to rehab_logs/
app.post('/api/save-session', (req, res) => {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const sessionData = req.body;
    const safe = (sessionData.exercise || 'session')
      .replace(/\s+/g, '_')
      .replace(/[/()]/g, '');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `session_${safe}_${ts}.json`;
    const filepath = path.join(LOGS_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2), 'utf8');
    console.log(`✅ Session saved: ${filename}`);
    res.json({ success: true, filename, path: filepath });
  } catch (err) {
    console.error('❌ Save error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sessions — list all saved sessions
app.get('/api/sessions', (req, res) => {
  try {
    if (!fs.existsSync(LOGS_DIR)) return res.json({ sessions: [] });
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    const sessions = files.map(f => {
      try {
        const raw = fs.readFileSync(path.join(LOGS_DIR, f), 'utf8');
        return JSON.parse(raw);
      } catch { return null; }
    }).filter(Boolean);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat — RAG endpoint using Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // 1. Retrieval: Read recent sessions
    let recentSessions = [];
    if (fs.existsSync(LOGS_DIR)) {
      const files = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort().reverse().slice(0, 5); // get last 5 sessions
      
      recentSessions = files.map(f => {
        try {
          const raw = fs.readFileSync(path.join(LOGS_DIR, f), 'utf8');
          const data = JSON.parse(raw);
          // Create a brief text summary of the session to save tokens
          return `Date: ${data.start_time.slice(0,10)}
Exercise: ${data.exercise}
Total Reps: ${data.total_reps} (${data.good_reps} good, ${data.bad_form_reps} bad)
Avg Rep Time: ${data.average_rep_duration_seconds}s
Details: ${data.rep_log.map(r => `Rep ${r.rep_number} (${r.side || 'both'}): ${r.status}${r.status === 'Bad Form' ? ' - ' + r.bad_form_notes.join(',') : ''}`).slice(0, 10).join('; ')}`;
        } catch { return null; }
      }).filter(Boolean);
    }

    // 2. Augmentation & Generation: Build Context and Prompt
    const contextString = recentSessions.length > 0 
      ? `=== RECENT SESSION HISTORY ===\n${recentSessions.join('\n\n')}\n=====================`
      : `No recent session history found.`;

    const systemPrompt = `You are 'Neurova', an empathetic and expert physical therapy assistant AI.
The user is recovering from an injury and performing rehab exercises.
Using the provided session history context below, answer their question. 
Be concise, encouraging, and offer specific form corrections if you see 'Bad Form' in their history.
If the context doesn't contain the answer to their specific query, rely on general physical therapy best practices.

${contextString}

User Question: ${message}`;

    // Call Gemini URL securely
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    res.json({ reply: aiResponse.text });
  } catch (err) {
    if (err.status === 429 || err?.message?.includes('429')) {
      console.warn('⚠️ Gemini API Quota Exceeded. Returning mock response.');
      return res.json({ 
        reply: "It looks like your Gemini API key has run out of quota (429 Error). Until you update your billing, here's a mock analysis: Your recent bicep curls look solid, but try to slow down on the eccentric (lowering) phase for better muscle engagement!" 
      });
    }
    console.error('❌ Chat API error:', err);
    res.status(500).json({ error: 'Failed to generate response', details: err.message });
  }
});

// POST /api/coach-voice — Generates a 2-sentence spoken feedback script
app.post('/api/coach-voice', async (req, res) => {
  try {
    const { sessionData } = req.body;
    if (!sessionData) return res.status(400).json({ error: 'sessionData required' });

    const systemPrompt = `You are 'Neurova', a physical therapist providing live voice coaching.
The user just completed a set. Based on this session data:
Exercise: ${sessionData.exercise}
Total Reps: ${sessionData.total_reps} (${sessionData.good_reps} good, ${sessionData.bad_form_reps} bad)
Avg Rep Time: ${sessionData.average_rep_duration_seconds}s
Bad Form Notes: ${sessionData.rep_log.filter(r => r.status === 'Bad Form').map(r => r.bad_form_notes).flat().join(', ')}

Provide a SINGLE encouraging observation or form correction. 
CRITICAL RULES:
- MUST be exactly 1 or 2 short sentences.
- MUST be conversational, as if spoken out loud (do not use lists, markdown, or symbols).
- Sound energetic and empathetic.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    res.json({ reply: aiResponse.text });
  } catch (err) {
    console.error('❌ Voice Coach API error:', err);
    if (err.status === 429 || err?.message?.includes('429')) {
      return res.json({ reply: "Great job completing your set! Make sure to stay hydrated." }); // safe fallback
    }
    res.status(500).json({ error: 'Failed to generate voice script' });
  }
});

app.listen(PORT, () => {

  console.log(`🏥 Rehab API server running at http://localhost:${PORT}`);
});
