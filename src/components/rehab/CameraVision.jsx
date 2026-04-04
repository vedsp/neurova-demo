import React, { useRef, useEffect, useCallback } from 'react';
import {
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { RepStateMachine } from '../../utils/RepStateMachine.js';
import { SessionLogger } from '../../utils/SessionLogger.js';
import {
  calcAngle,
  calcNeckTiltAngle,
  calcNeckFlexOffset,
  calcAvgFingerCurl,
  LandmarkSmoother,
} from '../../utils/angleUtils.js';

const VISIBILITY_THRESHOLD = 0.45;
const EMA_ALPHA = 0.4;

const CameraVision = ({ exercise, onRep, onUpdate, onSessionData, repGoal = 15, side = "both" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const stateMachineRef = useRef(null);
  const loggerRef = useRef(null);
  const smootherRef = useRef(new LandmarkSmoother(EMA_ALPHA));
  const handSmootherRef = useRef(new LandmarkSmoother(EMA_ALPHA));
  const requestRef = useRef(null);
  const exerciseRef = useRef(exercise); // live ref avoids stale closures
  const sideRef = useRef(side);
  const repCountRef = useRef(0);
  const sessionDoneRef = useRef(false);

  // Update live ref when exercise or side prop changes
  useEffect(() => {
    exerciseRef.current = exercise;
    sideRef.current = side;
    // Reset state machine and logger for new exercise
    const isAscending = exercise.direction === "increase";
    stateMachineRef.current = new RepStateMachine(
      exercise.thresholds[0],
      exercise.thresholds[1],
      2,
      0.5,
      isAscending
    );
    loggerRef.current = new SessionLogger(exercise.name);
    smootherRef.current.reset();
    handSmootherRef.current.reset();
    repCountRef.current = 0;
    sessionDoneRef.current = false;
  }, [exercise, side]);

  // One-time init: load models and start camera
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // Load Pose model
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      // Load Hand model
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      if (cancelled) return;

      // Start webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      if (videoRef.current && !cancelled) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          requestRef.current = requestAnimationFrame(predict);
        };
      }
    };

    init().catch(console.error);

    return () => {
      cancelled = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []); // eslint-disable-line

  const predict = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !poseLandmarkerRef.current) {
      requestRef.current = requestAnimationFrame(predict);
      return;
    }

    const ex = exerciseRef.current;
    const curSide = sideRef.current;
    const sm = stateMachineRef.current;
    const logger = loggerRef.current;
    const smoother = smootherRef.current;
    const handSmoother = handSmootherRef.current;

    const nowMs = performance.now();

    // Run models
    const poseResults = poseLandmarkerRef.current.detectForVideo(video, nowMs);
    let handResults = null;
    if (ex.type === "finger_curl" && handLandmarkerRef.current) {
      handResults = handLandmarkerRef.current.detectForVideo(video, nowMs);
    }

    // Setup canvas — mirror drawing to match mirrored video
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mirrored video frame
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const drawingUtils = new DrawingUtils(ctx);

    let metricValue = null;
    let confidence = 0;
    let isLowVis = false;
    let detectedSide = null;

    // ---- POSE-BASED EXERCISES ----
    if (ex.type !== "finger_curl") {
      const poseLMs = poseResults.landmarks?.[0];

      if (poseLMs) {
        // Draw mirrored skeleton
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        drawingUtils.drawConnectors(poseLMs, PoseLandmarker.POSE_CONNECTIONS, {
          color: "rgba(233,69,96,0.6)",
          lineWidth: 2,
        });
        drawingUtils.drawLandmarks(poseLMs, {
          color: "#e94560",
          fillColor: "#1a1a2e",
          lineWidth: 1,
          radius: 4,
        });
        ctx.restore();

        // Smooth landmarks helper
        const getSmooth = (idx) => {
          const lm = poseLMs[idx];
          if (!lm || lm.visibility < VISIBILITY_THRESHOLD) return null;
          return smoother.smooth(`p${idx}`, lm);
        };

        const calculateMetricForSide = (lmIds) => {
          if (ex.type === "angle") {
            const [idA, idB, idC] = lmIds;
            const ptA = getSmooth(idA);
            const ptB = getSmooth(idB);
            const ptC = getSmooth(idC);
            if (ptA && ptB && ptC) {
              return {
                val: calcAngle(ptA, ptB, ptC),
                vis: (poseLMs[idA].visibility + poseLMs[idB].visibility + poseLMs[idC].visibility) / 3
              };
            }
          }
          return null;
        };

        logger.incrementFrame();

        if (ex.type === "angle") {
          // Check if landmarks are split by side
          if (ex.landmarks.left && ex.landmarks.right) {
            const leftData = curSide === "both" || curSide === "left" ? calculateMetricForSide(ex.landmarks.left) : null;
            const rightData = curSide === "both" || curSide === "right" ? calculateMetricForSide(ex.landmarks.right) : null;

            // Best side logic if 'both'; otherwise use requested side
            if (curSide === "both") {
              if (leftData && rightData) {
                if (leftData.vis >= rightData.vis) {
                  metricValue = leftData.val;
                  confidence = leftData.vis;
                  detectedSide = "Left";
                } else {
                  metricValue = rightData.val;
                  confidence = rightData.vis;
                  detectedSide = "Right";
                }
              } else if (leftData) {
                metricValue = leftData.val;
                confidence = leftData.vis;
                detectedSide = "Left";
              } else if (rightData) {
                metricValue = rightData.val;
                confidence = rightData.vis;
                detectedSide = "Right";
              }
            } else if (curSide === "left" && leftData) {
              metricValue = leftData.val;
              confidence = leftData.vis;
              detectedSide = "Left";
            } else if (curSide === "right" && rightData) {
              metricValue = rightData.val;
              confidence = rightData.vis;
              detectedSide = "Right";
            }

            if (metricValue === null) {
              isLowVis = true;
              logger.skipFrame();
            }
          } else {
            // Fallback for single side (legacy)
            const data = calculateMetricForSide(ex.landmarks);
            if (data) {
              metricValue = data.val;
              confidence = data.vis;
            } else {
              isLowVis = true;
              logger.skipFrame();
            }
          }
        } else if (ex.type === "neck_tilt") {
          const [lsIdx, rsIdx, noseIdx] = ex.landmarks;
          const ptLS = getSmooth(lsIdx);
          const ptRS = getSmooth(rsIdx);
          const ptNose = getSmooth(noseIdx);
          if (ptLS && ptRS && ptNose) {
            metricValue = calcNeckTiltAngle(ptLS, ptRS, ptNose);
            confidence = (poseLMs[lsIdx].visibility + poseLMs[rsIdx].visibility + poseLMs[noseIdx].visibility) / 3;
          } else {
            isLowVis = true;
            logger.skipFrame();
          }
        } else if (ex.type === "neck_flex") {
          const [lsIdx, rsIdx, noseIdx] = ex.landmarks;
          const ptLS = getSmooth(lsIdx);
          const ptRS = getSmooth(rsIdx);
          const ptNose = getSmooth(noseIdx);
          if (ptLS && ptRS && ptNose) {
            metricValue = calcNeckFlexOffset(ptLS, ptRS, ptNose);
            confidence = (poseLMs[lsIdx].visibility + poseLMs[rsIdx].visibility + poseLMs[noseIdx].visibility) / 3;
          } else {
            isLowVis = true;
            logger.skipFrame();
          }
        }
      }
    }


    // ---- HAND EXERCISE: finger_curl ----
    if (ex.type === "finger_curl" && handResults) {
      // Draw hand landmarks
      if (handResults.landmarks?.length > 0) {
        for (const hLMs of handResults.landmarks) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          drawingUtils.drawConnectors(hLMs, HandLandmarker.HAND_CONNECTIONS, {
            color: "rgba(15,236,125,0.7)",
            lineWidth: 2,
          });
          drawingUtils.drawLandmarks(hLMs, {
            color: "#0fec7d",
            fillColor: "#1a1a2e",
            lineWidth: 1,
            radius: 4,
          });
          ctx.restore();
        }
      }

      // Pick the correct hand (right hand in MediaPipe is labelled "Right" with flipped camera)
      const handedness = handResults.handedness || [];
      const handLMs = handResults.landmarks || [];
      let targetHand = null;

      for (let i = 0; i < handedness.length; i++) {
        const label = handedness[i][0]?.categoryName;
        // Camera is mirrored: "Left" in detection = right hand of user
        if (ex.hand === "right" && label === "Left") {
          targetHand = handLMs[i];
          break;
        } else if (ex.hand === "left" && label === "Right") {
          targetHand = handLMs[i];
          break;
        }
      }

      // Fallback: use first available hand
      if (!targetHand && handLMs.length > 0) targetHand = handLMs[0];

      if (targetHand) {
        // Smooth hand landmarks
        const smoothedHand = targetHand.map((lm, idx) =>
          handSmoother.smooth(`h${idx}`, lm)
        );
        metricValue = calcAvgFingerCurl(smoothedHand);
        confidence = 0.8;
        logger.incrementFrame();
      } else {
        isLowVis = true;
        logger.skipFrame();
      }
    }

    // ---- State Machine + Logging ----
    if (metricValue !== null && !isLowVis && sm && !sessionDoneRef.current) {
      const { newRep, repData, state } = sm.update(metricValue);
      onUpdate(metricValue, state, confidence);
      logger.logAngleSample(metricValue, confidence);

      if (newRep && repData) {
        // Enforce side in repData
        repData.side = detectedSide || curSide;
        logger.logRep(repData);
        repCountRef.current = sm.counter;
        onRep(repData, sm.counter);

        // Auto-stop at goal
        if (sm.counter >= repGoal) {
          sessionDoneRef.current = true;
          const sessionData = await logger.saveToServer();
          onSessionData(sessionData);
          return;
        }
      }
    } else if (metricValue === null && !isLowVis) {
      onUpdate(null, "IDLE", 0);
    }

    // Draw HUD overlay on canvas
    drawHUD(ctx, canvas, ex, metricValue, sm?.state || "IDLE", sm?.counter || 0, confidence, isLowVis, detectedSide);

    requestRef.current = requestAnimationFrame(predict);
  }, []); // eslint-disable-line

  function drawHUD(ctx, canvas, ex, value, state, reps, confidence, lowVis, currentSide) {
    const w = canvas.width;
    // Semi-transparent top bar
    ctx.fillStyle = "rgba(10, 10, 30, 0.7)";
    ctx.fillRect(0, 0, 340, 125);

    // Exercise name + Active Side
    ctx.fillStyle = "#e94560";
    ctx.font = "bold 18px Inter, sans-serif";
    const sideInfo = currentSide ? ` (${currentSide})` : "";
    ctx.fillText(`${ex.name}${sideInfo}`, 12, 28);

    // Rep count
    ctx.fillStyle = "#0fec7d";
    ctx.font = "bold 22px Inter, sans-serif";
    ctx.fillText(`Reps: ${reps}`, 12, 58);

    // Stage
    const stageColor = state === "FLEXED" ? "#0fec7d" : state === "EXTENDED" ? "#fff" : "#888";
    ctx.fillStyle = stageColor;
    ctx.font = "16px Inter, sans-serif";
    ctx.fillText(`Stage: ${state}`, 12, 85);

    // Metric value
    if (value !== null) {
      ctx.fillStyle = "#ccc";
      ctx.font = "14px monospace";
      ctx.fillText(`Value: ${value.toFixed(1)}`, 12, 110);
    }

    // Confidence bar (top right)
    const barW = 110;
    const barX = w - barW - 12;
    const confFill = confidence > 0.7 ? "#0fec7d" : confidence > 0.5 ? "#f9a825" : "#e94560";
    ctx.fillStyle = "rgba(50,50,50,0.8)";
    ctx.fillRect(barX, 10, barW, 18);
    ctx.fillStyle = confFill;
    ctx.fillRect(barX, 10, barW * Math.min(confidence, 1), 18);
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Conf: ${(confidence * 100).toFixed(0)}%`, barX + 4, 24);

    // Low visibility warning
    if (lowVis) {
      ctx.fillStyle = "rgba(233,69,96,0.8)";
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠ LOW VISIBILITY — ADJUST POSITION", w / 2, canvas.height - 15);
      ctx.textAlign = "left";
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: "inherit",
        background: "#000",
      }}
    >
      {/* Hidden video element — camera stream source */}
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      {/* Canvas renders mirrored video + landmarks + HUD */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
};

export default CameraVision;
