/**
 * Ramer-Douglas-Peucker line simplification algorithm
 * @param {Array<{x: number, y: number}>} points
 * @param {number} tolerance
 * @returns {Array<{x: number, y: number}>}
 */
export function simplifyPoints(points, tolerance = 4) {
  if (!points || points.length <= 2) return points ? [...points] : [];

  function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) {
      const px = point.x - lineStart.x;
      const py = point.y - lineStart.y;
      return Math.sqrt(px * px + py * py);
    }
    return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
  }

  function rdp(pts, tol) {
    if (pts.length <= 2) return pts;

    let maxDist = 0;
    let index = 0;
    const last = pts.length - 1;

    for (let i = 1; i < last; i++) {
      const dist = perpendicularDistance(pts[i], pts[0], pts[last]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > tol) {
      const left = rdp(pts.slice(0, index + 1), tol);
      const right = rdp(pts.slice(index), tol);
      return left.slice(0, -1).concat(right);
    }

    return [pts[0], pts[last]];
  }

  return rdp(points, tolerance);
}

/**
 * Limit point list to at most maxSegments
 * @param {Array<{x: number, y: number}>} points
 * @param {number} maxSegments
 * @returns {Array<{x: number, y: number}>}
 */
export function limitSegments(points, maxSegments = 40) {
  if (!points || points.length <= maxSegments + 1) return points;

  // Evenly sample points keeping first and last
  const result = [points[0]];
  const total = points.length - 1;
  const step = total / maxSegments;

  for (let i = 1; i < maxSegments; i++) {
    const idx = Math.round(i * step);
    result.push(points[idx]);
  }
  result.push(points[total]);
  return result;
}
