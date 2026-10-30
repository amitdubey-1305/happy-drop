/**
 * Client-side Star Calculator (matches server-side rule in server/services/scoreService.js)
 *
 * NOTE: The server always recalculates and verifies the real star rating
 * upon session completion to prevent client tampering.
 *
 * @param {number} inkUsed - Total ink length drawn
 * @param {number} maxInk - Maximum ink allowance for the level
 * @returns {number} 1, 2, or 3 stars
 */
export function calculateStars(inkUsed, maxInk) {
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
}
