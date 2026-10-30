import Matter from 'matter-js';

export class FillDetector {
  /**
   * @param {Object} options
   * @param {Matter.Body} options.sensorBody - The invisible sensor inside the glass
   * @param {number} options.waterAmount - Total drops to spawn
   * @param {number} options.targetFill - Ratio of water required (defaults to 0.6 if missing)
   */
  constructor({ sensorBody, waterAmount = 35, targetFill = 0.6 } = {}) {
    this.sensorBody = sensorBody;
    this.waterAmount = waterAmount;
    this.targetFill = targetFill || 0.6;

    // requiredCount = round(waterAmount x glass.targetFill)
    this.requiredCount = Math.max(1, Math.round(this.waterAmount * this.targetFill));

    this.currentCount = 0;
    this.fillPercent = 0;

    // Timers (ms)
    this.winHoldTimer = 0;
    this.failStillTimer = 0;

    this.isSettled = false;
  }

  setSensor(sensorBody, waterAmount, targetFill) {
    this.sensorBody = sensorBody;
    if (waterAmount !== undefined) this.waterAmount = waterAmount;
    if (targetFill !== undefined) this.targetFill = targetFill || 0.6;
    this.requiredCount = Math.max(1, Math.round(this.waterAmount * this.targetFill));
    this.reset();
  }

  reset() {
    this.currentCount = 0;
    this.fillPercent = 0;
    this.winHoldTimer = 0;
    this.failStillTimer = 0;
    this.isSettled = false;
  }

  /**
   * Evaluates fill condition on each fixed step
   * @param {number} deltaMs - Step duration in milliseconds
   * @param {Array<Matter.Body>} waterParticles - Active water drop bodies
   * @param {boolean} allWaterSpawned - Whether all water drops from tap have finished spawning
   * @returns {{ status: 'NONE' | 'WON' | 'FAILED', count: number, requiredCount: number, fillPercent: number }}
   */
  update(deltaMs, waterParticles, allWaterSpawned) {
    if (!this.sensorBody || !waterParticles) {
      return { status: 'NONE', count: 0, requiredCount: this.requiredCount, fillPercent: 0 };
    }

    // 1. Count particles inside the glass sensor
    let insideCount = 0;
    const sensorBounds = this.sensorBody.bounds;
    const sensorVertices = this.sensorBody.vertices;

    for (let i = 0; i < waterParticles.length; i++) {
      const drop = waterParticles[i];
      if (Matter.Bounds.overlaps(sensorBounds, drop.bounds)) {
        if (Matter.Vertices.contains(sensorVertices, drop.position)) {
          insideCount++;
        }
      }
    }

    this.currentCount = insideCount;
    this.fillPercent = Math.min(1, insideCount / this.requiredCount);

    // 2. WON when count >= requiredCount continuously for 1.5 seconds (resets if count drops)
    if (insideCount >= this.requiredCount) {
      this.winHoldTimer += deltaMs;
      this.failStillTimer = 0; // cannot fail while meeting requirement

      if (this.winHoldTimer >= 1500) {
        return {
          status: 'WON',
          count: insideCount,
          requiredCount: this.requiredCount,
          fillPercent: this.fillPercent,
        };
      }
    } else {
      // Hold timer resets if the count drops
      this.winHoldTimer = 0;
    }

    // 3. FAILED when all water has spawned, no particle moves faster than a small threshold
    // (or particles are out of the world) for 1 second, and the count is below requiredCount.
    if (allWaterSpawned && insideCount < this.requiredCount) {
      // Check if any particle is still moving fast (velocity magnitude > 0.4)
      const thresholdSq = 0.4 * 0.4;
      let anyMovingFast = false;

      for (let i = 0; i < waterParticles.length; i++) {
        const vel = waterParticles[i].velocity;
        if (vel.x * vel.x + vel.y * vel.y > thresholdSq) {
          anyMovingFast = true;
          break;
        }
      }

      if (!anyMovingFast) {
        this.failStillTimer += deltaMs;
        if (this.failStillTimer >= 1000) {
          return {
            status: 'FAILED',
            count: insideCount,
            requiredCount: this.requiredCount,
            fillPercent: this.fillPercent,
          };
        }
      } else {
        this.failStillTimer = 0;
      }
    } else {
      this.failStillTimer = 0;
    }

    return {
      status: 'NONE',
      count: insideCount,
      requiredCount: this.requiredCount,
      fillPercent: this.fillPercent,
    };
  }
}
