/**
 * Pure scoring calculation functions for Happy Drop (no database calls).
 */

/**
 * Calculates the number of stars awarded based on ink efficiency ratio.
 * - ratio <= 0.40 -> 3 stars
 * - ratio <= 0.70 -> 2 stars
 * - otherwise     -> 1 star
 *
 * @param {number} inkUsed - Total ink length drawn
 * @param {number} maxInk - Maximum ink allowance for the level
 * @returns {number} 1, 2, or 3 stars
 */
const starsFromInk = (inkUsed, maxInk) => {
  if (!maxInk || maxInk <= 0) {
    return 1;
  }

  const ratio = Math.max(0, inkUsed) / maxInk;

  if (ratio <= 0.4) {
    return 3;
  }
  if (ratio <= 0.7) {
    return 2;
  }
  return 1;
};

/**
 * Calculates the total score for a completed game run.
 * Formula:
 *   500 (base)
 *   + 300 (if stars is 3)
 *   + round(200 * (1 - ratio)) clamped to 0..200
 *   + 100 (if completionTime <= parTime)
 *
 * @param {Object} params
 * @param {number} params.stars - Stars earned (1 to 3)
 * @param {number} params.inkUsed - Total ink drawn
 * @param {number} params.maxInk - Level's ink limit
 * @param {number} params.completionTime - Time taken to complete (seconds or ms)
 * @param {number} params.parTime - Target par time
 * @returns {number} Final computed score
 */
const scoreFor = ({ stars, inkUsed, maxInk, completionTime, parTime }) => {
  const base = 500;
  const starBonus = stars === 3 ? 300 : 0;

  const ratio = maxInk > 0 ? Math.max(0, inkUsed) / maxInk : 1;
  const rawInkBonus = Math.round(200 * (1 - ratio));
  const inkBonus = Math.max(0, Math.min(200, rawInkBonus));

  const hasParTime = typeof parTime === 'number' && typeof completionTime === 'number';
  const timeBonus = hasParTime && completionTime <= parTime ? 100 : 0;

  return base + starBonus + inkBonus + timeBonus;
};

module.exports = {
  starsFromInk,
  scoreFor,
};
