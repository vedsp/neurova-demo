export const EXERCISES = [
  {
    id: "bicep-curl",
    name: "Bicep Curl",
    type: "angle",
    landmarks: {
      right: [12, 14, 16], // R Shoulder, Elbow, Wrist
      left: [11, 13, 15]   // L Shoulder, Elbow, Wrist
    },
    thresholds: [150, 50],
    direction: "decrease",
    region: "Arm",
    hint: "Curl either arm. Stand sideways for better tracking.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1a3B1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMt1VVNkKR2V96/giphy.gif",
    color: "#5a7a45"
  },
  {
    id: "shoulder-raise",
    name: "Shoulder Raise",
    type: "angle",
    landmarks: {
      right: [24, 12, 14], // R Hip, Shoulder, Elbow
      left: [23, 11, 13]   // L Hip, Shoulder, Elbow
    },
    thresholds: [30, 140],
    direction: "increase",
    region: "Shoulder",
    hint: "Raise either arm sideways. Keep arm straight.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1a3B1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/vO89hFGJLvXvG/giphy.gif",
    color: "#e94560"
  },
  {
    id: "squat",
    name: "Squat",
    type: "angle",
    landmarks: {
      right: [24, 26, 28], // R Hip, Knee, Ankle
      left: [23, 25, 27]   // L Hip, Knee, Ankle
    },
    thresholds: [160, 100],
    direction: "decrease",
    region: "Leg",
    hint: "Stand sideways. Lower your hips until knees are at 100°.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1a3B1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMt1VVNkKR2V96/giphy.gif",
    color: "#29b6f6"
  },
  {
    id: "neck-tilt",
    name: "Neck Tilt",
    type: "neck_tilt",
    landmarks: [11, 12, 0], // L Sh, R Sh, Nose
    thresholds: [5, 25],     // Now uses deviation from 90°: 5° (extended), 25° (flexed)
    direction: "increase",
    region: "Neck",
    hint: "Tilt your head slowly to either side.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1a3B1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/LXLm3RId2SkgE/giphy.gif",
    color: "#ff7043"
  },
  {
    id: "neck-flexion",
    name: "Neck Flexion",
    type: "neck_flex",
    landmarks: [11, 12, 0], // L Sh, R Sh, Nose
    thresholds: [0.12, 0.32], // Normalized offset: <0.12 (upright), >0.32 (nodded)
    direction: "increase",
    region: "Neck",
    hint: "Stand sideways. Nod your head forward toward your chest.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1a3B1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/LXLm3RId2SkgE/giphy.gif",
    color: "#ab47bc"
  },
  {
    id: "hand-open-close",
    name: "Hand Open/Close",
    type: "finger_curl",
    hand: "right",
    thresholds: [160, 90],
    direction: "decrease",
    region: "Hand",
    hint: "Open and close either hand clearly in front of camera.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1a3B1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6NHp1eXZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMt1VVNkKR2V96/giphy.gif",
    color: "#0fec7d"
  }
];
