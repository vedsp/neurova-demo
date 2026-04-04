// ==============================
// Session Logger — mirrors physical.py SessionLogger
// Stores per-rep data for AI RAG system
// ==============================

export class SessionLogger {
  constructor(exerciseName) {
    this.exerciseName = exerciseName;
    this.startTime = Date.now();
    this.repLog = [];
    this.angleSamples = [];
    this.lastSampleTime = 0;
    this.sampleInterval = 500; // ms
    this.framesProcessed = 0;
    this.framesSkipped = 0;
  }

  logRep(repData) {
    this.repLog.push({
      rep_number: repData.repNumber,
      timestamp: new Date().toISOString(),
      elapsed_seconds: ((Date.now() - this.startTime) / 1000).toFixed(2),
      duration: repData.duration,
      hold_time: repData.holdTime,
      peak_value: repData.peakValue,
      status: repData.status,
      bad_form_notes: repData.badFormNotes,
      side: repData.side || 'unknown'
    });
  }

  logAngleSample(metricValue, confidence) {
    const now = Date.now();
    if (now - this.lastSampleTime >= this.sampleInterval) {
      this.angleSamples.push({
        elapsed_seconds: ((now - this.startTime) / 1000).toFixed(2),
        metric_value: parseFloat(metricValue.toFixed(2)),
        confidence: parseFloat(confidence.toFixed(2)),
      });
      this.lastSampleTime = now;
    }
  }

  incrementFrame() { this.framesProcessed++; }
  skipFrame() { this.framesSkipped++; }

  getSessionData() {
    const endTime = Date.now();
    const totalReps = this.repLog.length;
    const badFormReps = this.repLog.filter(r => r.status === "Bad Form").length;
    const durations = this.repLog.map(r => r.duration);
    const avgDuration = durations.length > 0
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)
      : 0;

    return {
      session_id: `${this.exerciseName.replace(/\s+/g, '_')}_${new Date(this.startTime).toISOString().replace(/[:.]/g, '-')}`,
      exercise: this.exerciseName,
      start_time: new Date(this.startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      total_duration_seconds: ((endTime - this.startTime) / 1000).toFixed(2),
      total_reps: totalReps,
      good_reps: totalReps - badFormReps,
      bad_form_reps: badFormReps,
      average_rep_duration_seconds: parseFloat(avgDuration),
      frames_processed: this.framesProcessed,
      frames_skipped: this.framesSkipped,
      rep_log: this.repLog,
      angle_samples: this.angleSamples,
    };
  }

  async saveToServer() {
    const data = this.getSessionData();
    try {
      const res = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        console.log(`✅ Session saved to rehab_logs/${result.filename}`);
      }
    } catch (err) {
      console.error('❌ Could not save session to server:', err);
    }
    return data;
  }
}
