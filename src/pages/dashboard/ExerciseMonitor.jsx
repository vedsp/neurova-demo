import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EXERCISES } from '../../data/exercises.js';
import CameraVision from '../../components/rehab/CameraVision.jsx';
import { CheckCircle, AlertTriangle, ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ExerciseMonitor.css';

const REP_GOAL = 5;

export default function ExerciseMonitor() {
  const navigate = useNavigate();
  const [selectedEx, setSelectedEx] = useState(EXERCISES[0]);
  const [side, setSide]             = useState('both');
  const [repCount, setRepCount]     = useState(0);
  const [currentVal, setCurrentVal] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [stage, setStage]           = useState('IDLE');
  const [repLog, setRepLog]         = useState([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [lastSession, setLastSession] = useState(null);
  const [cameraKey, setCameraKey]   = useState(0);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('');

  // Timer
  useEffect(() => {
    if (sessionDone) return;
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [sessionDone]);

  const fmt = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const isNeckFlex = selectedEx.type === 'neck_flex';
  const unit = isNeckFlex ? '' : '°';
  const progress = Math.min((repCount / REP_GOAL) * 100, 100);

  const handleRep = (repData, total) => {
    setRepCount(total);
    setRepLog(prev => [{ ...repData, id: Date.now() }, ...prev]);
  };
  const handleUpdate = (val, st, conf) => {
    if (val !== null) setCurrentVal(val);
    setStage(st);
    setConfidence(conf);
  };
  const handleSessionData = async (data) => {
    setLastSession(data);
    setSessionDone(true);

    if (voiceEnabled) {
      setVoiceStatus('Generating Audio Coach...');
      try {
        const res = await fetch('/api/coach-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionData: data })
        });
        const apiData = await res.json();
        
        if (apiData.reply) {
          setTimeout(() => {
            setVoiceStatus('Speaking...');
            const utterance = new SpeechSynthesisUtterance(apiData.reply);
            // Try to find a good English voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google')));
            if (preferredVoice) utterance.voice = preferredVoice;
            
            utterance.onend = () => setVoiceStatus('');
            utterance.onerror = () => setVoiceStatus('');
            window.speechSynthesis.speak(utterance);
          }, 2000);
        } else {
          setVoiceStatus('');
        }
      } catch (err) {
        console.error('TTS Error', err);
        setVoiceStatus('');
      }
    }
  };
  const reset = () => {
    setRepCount(0); setRepLog([]); setCurrentVal(null);
    setStage('IDLE'); setConfidence(0); setSessionDone(false);
    setLastSession(null); setSessionSecs(0);
    setSide('both'); // Reset side on session reset
    setVoiceStatus('');
    window.speechSynthesis.cancel(); // Stop any playing audio
    setCameraKey(k => k + 1);
  };
  const changeEx = (ex) => { 
    setSelectedEx(ex); 
    reset(); 
  };

  const stageColor = stage === 'FLEXED' ? '#5a7a45' : stage === 'EXTENDED' ? '#2c3a2a' : '#a8b8a2';
  const isUpperBody = ['bicep-curl', 'shoulder-raise'].includes(selectedEx.id);

  return (
    <div className="monitor-wrapper">

      {/* ── TOP BAR ── */}
      <header className="monitor-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18}/> Home
        </button>
        
        <div className="header-center">
          <span className="monitor-brand">Physical Therapy</span>
          
          {/* Side Selector (Only for Upper Body) */}
          {isUpperBody && !sessionDone && (
            <div className="side-selector">
              {['left', 'both', 'right'].map(s => (
                <button key={s} 
                  className={`side-btn ${side === s ? 'active' : ''}`}
                  onClick={() => setSide(s)}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) window.speechSynthesis.cancel();
            }} 
            style={{ background: 'transparent', border: 'none', color: voiceEnabled ? '#5a7a45' : 'var(--text-muted)', cursor: 'pointer' }}
            title={voiceEnabled ? "Mute Coach" : "Unmute Coach"}
          >
            {voiceEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
          </button>
          <span className="session-timer">{fmt(sessionSecs)}</span>
        </div>
      </header>

      <div className="monitor-body">

        {/* ── LEFT: Camera + Exercise Info ── */}
        <div className="monitor-left">

          {/* Exercise selector tabs */}
          <div className="ex-tabs">
            {EXERCISES.map(ex => (
              <button key={ex.id}
                className={`ex-tab ${selectedEx.id === ex.id ? 'active' : ''}`}
                style={selectedEx.id === ex.id ? { borderBottomColor: ex.color, color: ex.color } : {}}
                onClick={() => changeEx(ex)}>
                {ex.name}
              </button>
            ))}
          </div>

          {/* Camera / Session Done */}
          <div className="camera-card">
            {sessionDone ? (
              <div className="done-overlay">
                <div className="done-icon">🎯</div>
                <h2>Session Complete!</h2>
                
                {voiceStatus && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#5a7a45', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Volume2 size={16} className={voiceStatus === 'Speaking...' ? 'pulse-anim' : ''} />
                    {voiceStatus}
                  </motion.div>
                )}

                <div className="done-stats">
                  <div className="done-stat"><span>Reps</span><strong>{lastSession?.total_reps}</strong></div>
                  <div className="done-stat"><span>Goal</span><strong>{REP_GOAL}</strong></div>
                  <div className="done-stat"><span>Duration</span><strong>{lastSession?.total_duration_seconds}s</strong></div>
                  <div className="done-stat"><span>Good Reps</span><strong style={{color:'var(--clr-success)'}}>{lastSession?.good_reps}</strong></div>
                  <div className="done-stat"><span>Bad Form</span><strong style={{color:'var(--clr-error)'}}>{lastSession?.bad_form_reps}</strong></div>
                  <div className="done-stat"><span>Avg Rep</span><strong>{lastSession?.average_rep_duration_seconds}s</strong></div>
                </div>
                <div className="done-actions">
                  <button className="pill-btn primary" onClick={reset}><RotateCcw size={14}/> New Session</button>
                  <button className="pill-btn" onClick={() => navigate('/')}>← Home</button>
                </div>
              </div>
            ) : (
              <CameraVision key={cameraKey} exercise={selectedEx} side={side}
                onRep={handleRep} onUpdate={handleUpdate}
                onSessionData={handleSessionData} repGoal={REP_GOAL}/>
            )}

            {/* Live metric badge */}
            {!sessionDone && (
              <div className="metric-bubble" style={{ borderColor: selectedEx.color }}>
                <span style={{ color: selectedEx.color, fontSize:'1.5rem', fontWeight:800 }}>
                  {currentVal !== null ? currentVal.toFixed(1) : '--'}{unit}
                </span>
                <span style={{ fontSize:'0.6rem', color: stageColor, textTransform:'uppercase', fontWeight:700 }}>
                  {stage}
                </span>
              </div>
            )}
          </div>

          {/* Hint */}
          <div className="hint-bar">
            💡 {selectedEx.hint}
            <span className="conf-pill"
              style={{ background: confidence > 0.7 ? 'rgba(90,122,69,0.15)' : 'rgba(192,98,42,0.12)',
                       color: confidence > 0.7 ? '#5a7a45' : '#c0622a' }}>
              {(confidence*100).toFixed(0)}% conf
            </span>
          </div>

          {/* Progress bar */}
          <div className="prog-row">
            <span className="prog-label">{repCount} / {REP_GOAL} reps</span>
            <div className="prog-track">
              <motion.div className="prog-fill"
                animate={{ width:`${progress}%`, background: sessionDone ? '#5a7a45' : selectedEx.color }}
                transition={{ type:'spring', stiffness:60 }}/>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Stats Sidebar ── */}
        <aside className="monitor-sidebar">

          <div className="side-card">
            <div className="side-stat">
              <span className="side-lbl">Total Reps</span>
              <span className="side-val" style={{ color: selectedEx.color }}>{repCount}</span>
            </div>
            <div className="side-stat">
              <span className="side-lbl">Goal</span>
              <span className="side-val">{REP_GOAL}</span>
            </div>
            <div className="side-stat">
              <span className="side-lbl">Confidence</span>
              <span className="side-val" style={{ color: confidence > 0.7 ? '#5a7a45' : '#c0622a' }}>
                {(confidence*100).toFixed(0)}%
              </span>
            </div>
            <div className="side-stat">
              <span className="side-lbl">Time</span>
              <span className="side-val">{fmt(sessionSecs)}</span>
            </div>
          </div>

          <div className="side-label">Rep History</div>
          <div className="history-scroll">
            <AnimatePresence>
              {repLog.length === 0
                ? <p className="empty-hist">Start moving to record reps</p>
                : repLog.map(rep => (
                  <motion.div key={rep.id}
                    layout initial={{ x: 20, opacity: 0 }}
                    animate={{ x:0, opacity:1 }} exit={{ opacity:0 }}
                    className={`rep-row ${rep.status === 'Bad Form' ? 'bad' : ''}`}>
                    <div className="rep-left">
                      {rep.status === 'Bad Form'
                        ? <AlertTriangle size={13} style={{color:'#c0622a'}}/>
                        : <CheckCircle size={13} style={{color:'#5a7a45'}}/>}
                      <div className="rep-info">
                        <span className="rep-num">Rep {rep.repNumber} <small>({rep.side})</small></span>
                        <span className="rep-peak">{rep.peakValue}{unit}</span>
                      </div>
                    </div>
                    <div className="rep-right">
                      <span>{rep.duration}s</span>
                      {rep.status === 'Bad Form' && (
                        <span className="form-tag" title={rep.badFormNotes?.join(', ')}>
                          {rep.badFormNotes?.[0] || 'Form'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {!sessionDone && repCount > 0 && (
            <button className="pill-btn reset" onClick={reset}>
              <RotateCcw size={13}/> Reset
            </button>
          )}
        </aside>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="monitor-bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>Home</button>
        <button className="nav-item active">Physical</button>
        <button className="nav-item" onClick={() => navigate('/chat')}>AI Coach</button>
      </nav>

    </div>
  );
}
