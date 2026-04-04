// ==============================
// Angle / Metric Calculation Utils
// Ported from physical.py
// ==============================

/**
 * Calculate angle at point b given three 2D points (normalized coords).
 */
export function calcAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBa = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBc = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  const cosine = Math.max(-1.0, Math.min(1.0, dot / (magBa * magBc + 1e-8)));
  return (Math.acos(cosine) * 180.0) / Math.PI;
}

/**
 * Neck tilt angle relative to vertical.
 * ~90 = upright, deviates on tilt.
 */
export function calcNeckTiltAngle(lShoulder, rShoulder, nose) {
  const midX = (lShoulder.x + rShoulder.x) / 2;
  const midY = (lShoulder.y + rShoulder.y) / 2;
  const vecX = nose.x - midX;
  const vecY = nose.y - midY;
  const angleRad = Math.atan2(vecX, -vecY); 
  const angleDeg = (angleRad * 180.0) / Math.PI + 90; // Upright ≈ 90
  return Math.abs(angleDeg - 90.0); // Deviation: 0 = upright, >0 = tilted
}

/**
 * Neck flex offset: how far the nose is from the shoulder midpoint,
 * normalized by shoulder width (scale-invariant).
 */
export function calcNeckFlexOffset(lShoulder, rShoulder, nose) {
  const midX = (lShoulder.x + rShoulder.x) / 2;
  const shWidth = Math.sqrt(
    Math.pow(lShoulder.x - rShoulder.x, 2) + Math.pow(lShoulder.y - rShoulder.y, 2)
  );
  if (shWidth < 0.02) return 0;
  return Math.abs(nose.x - midX) / shWidth;
}

/**
 * Average finger curl angle for all 4 fingers (MCP -> PIP -> TIP).
 * Higher = extended (open), Lower = curled (closed).
 * Hand landmarks from MediaPipe Tasks Vision HandLandmarker.
 */
export function calcAvgFingerCurl(handLandmarks) {
  if (!handLandmarks || handLandmarks.length === 0) return null;
  const lm = handLandmarks;

  // [MCP, PIP, TIP] for each finger
  const fingerChains = [
    [5, 6, 8],   // Index
    [9, 10, 12], // Middle
    [13, 14, 16], // Ring
    [17, 18, 20], // Pinky
  ];

  const angles = [];
  for (const [mcp, pip, tip] of fingerChains) {
    angles.push(calcAngle(lm[mcp], lm[pip], lm[tip]));
  }
  return angles.length > 0 ? angles.reduce((a, b) => a + b, 0) / angles.length : null;
}

// ==============================
// EMA Landmark Smoother
// ==============================
export class LandmarkSmoother {
  constructor(alpha = 0.4) {
    this.alpha = alpha;
    this.smoothed = {};
  }

  smooth(id, raw) {
    if (!(id in this.smoothed)) {
      this.smoothed[id] = { x: raw.x, y: raw.y, z: raw.z || 0 };
    } else {
      this.smoothed[id].x = this.alpha * raw.x + (1 - this.alpha) * this.smoothed[id].x;
      this.smoothed[id].y = this.alpha * raw.y + (1 - this.alpha) * this.smoothed[id].y;
      this.smoothed[id].z = this.alpha * (raw.z || 0) + (1 - this.alpha) * this.smoothed[id].z;
    }
    return this.smoothed[id];
  }

  reset() {
    this.smoothed = {};
  }
}
