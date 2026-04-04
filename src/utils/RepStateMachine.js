export class RepStateMachine {
  constructor(extendedThresh, flexedThresh, sustainFrames = 2, minRepDuration = 0.5, isAscending = false) {
    this.extendedThresh = extendedThresh;
    this.flexedThresh = flexedThresh;
    this.sustainFrames = sustainFrames;
    this.minRepDuration = minRepDuration;
    this.isAscending = isAscending;

    this.state = "IDLE"; // IDLE -> EXTENDED -> FLEXED -> EXTENDED (=1 rep)
    this.sustainCount = 0;
    this.pendingState = null;
    this.repStartTime = 0;
    this.flexedStartTime = 0;
    this.counter = 0;

    // Stats for current rep
    this.currentRepPeak = isAscending ? 0 : 1000;
    this.badFormReasons = [];
  }

  update(value) {
    let inExtendedZone, inFlexedZone;
    if (this.isAscending) {
      inExtendedZone = value < this.extendedThresh;
      inFlexedZone = value > this.flexedThresh;
    } else {
      inExtendedZone = value > this.extendedThresh;
      inFlexedZone = value < this.flexedThresh;
    }

    let result = {
      newRep: false,
      repData: null,
      state: this.state
    };

    let target;
    if (inExtendedZone) {
      target = "EXTENDED";
    } else if (inFlexedZone) {
      target = "FLEXED";
    } else {
      // In mid/dead zone
      if (this.sustainCount > 0) this.sustainCount--;
      if (this.state !== "IDLE") {
        if (this.isAscending) {
          this.currentRepPeak = Math.max(this.currentRepPeak, value);
        } else {
          this.currentRepPeak = Math.min(this.currentRepPeak, value);
        }
      }
      return result;
    }

    // Sustain logic
    if (target === this.pendingState) {
      this.sustainCount++;
    } else {
      this.pendingState = target;
      this.sustainCount = 1;
    }

    if (this.sustainCount >= this.sustainFrames) {
      const now = Date.now() / 1000;

      if (this.state === "IDLE" && target === "EXTENDED") {
        this.state = "EXTENDED";
        this.repStartTime = now;
        this.currentRepPeak = value;
      } else if (this.state === "EXTENDED" && target === "FLEXED") {
        this.state = "FLEXED";
        this.flexedStartTime = now;
        if (this.repStartTime === 0) this.repStartTime = now;
      } else if (this.state === "FLEXED" && target === "EXTENDED") {
        const duration = now - this.repStartTime;
        const holdTime = this.flexedStartTime > 0 ? (now - this.flexedStartTime) : 0;

        if (duration >= 0.3) {
          this.counter++;
          this.badFormReasons = [];
          if (duration < this.minRepDuration) {
            this.badFormReasons.push("Rep too fast");
          }

          result.newRep = true;
          result.repData = {
            repNumber: this.counter,
            duration: Number(duration.toFixed(2)),
            holdTime: Number(holdTime.toFixed(2)),
            peakValue: Number(this.currentRepPeak.toFixed(2)),
            status: this.badFormReasons.length === 0 ? "Good" : "Bad Form",
            badFormNotes: [...this.badFormReasons]
          };
        }

        // Reset for next rep
        this.state = "EXTENDED";
        this.repStartTime = now;
        this.flexedStartTime = 0;
        this.currentRepPeak = value;
      } else if (this.state === "IDLE" && target === "FLEXED") {
        this.state = "FLEXED";
        this.repStartTime = now;
        this.flexedStartTime = now;
        this.currentRepPeak = value;
      }
    }

    if (this.state !== "IDLE") {
      if (this.isAscending) {
        this.currentRepPeak = Math.max(this.currentRepPeak, value);
      } else {
        this.currentRepPeak = Math.min(this.currentRepPeak, value);
      }
    }

    result.state = this.state;
    return result;
  }
}
