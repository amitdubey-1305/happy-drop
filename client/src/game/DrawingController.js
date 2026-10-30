import Matter from 'matter-js';
import { STROKE, STROKE_MODE } from '../physics/constants';
import { simplifyPoints, limitSegments } from '../utils/rdp';

const { Bodies, Body, Composite } = Matter;

export class DrawingController {
  constructor(canvas, renderer, world, options = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.world = world;

    // Ink settings
    this.maxInk = options.maxInk || 600;
    this.inkUsed = 0;
    this.isEnabled = true;

    // Drawing state
    this.isDrawing = false;
    this.activePointerId = null;
    this.currentPoints = [];
    this.strokes = []; // { id, body, points, inkCost }
    this.hasNotifiedNoInk = false;

    // Callbacks
    this.callbacks = {
      onInkChange: null,
      onStrokeAdded: null,
      onNoInk: null,
    };

    // Ensure CSS touch-action is none and disable callout/selection
    this.canvas.style.touchAction = 'none';
    this.canvas.style.userSelect = 'none';
    this.canvas.style.webkitUserSelect = 'none';

    // Bind event handlers
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handleContextMenu = (e) => e.preventDefault();

    this.attachEvents();
  }

  attachEvents() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  detachEvents() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  handlePointerDown(e) {
    if (!this.isEnabled) return;
    if (this.isDrawing) return;

    this.activePointerId = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails on some devices
    }

    const pt = this.renderer.screenToWorld(e.clientX, e.clientY);
    this.isDrawing = true;
    this.currentPoints = [pt];
    this.hasNotifiedNoInk = false;
  }

  handlePointerMove(e) {
    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    const pt = this.renderer.screenToWorld(e.clientX, e.clientY);
    const lastPt = this.currentPoints[this.currentPoints.length - 1];
    if (!lastPt) return;

    const dx = pt.x - lastPt.x;
    const dy = pt.y - lastPt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < STROKE.minPointDistance) {
      return;
    }

    // Step 3: Insert intermediate points if pointer moved far between events so no holes appear
    const stepSize = STROKE.minPointDistance;
    const steps = Math.floor(dist / stepSize);
    let reachedInkLimit = false;

    for (let i = 1; i <= steps; i++) {
      const interpX = lastPt.x + (dx * (i * stepSize)) / dist;
      const interpY = lastPt.y + (dy * (i * stepSize)) / dist;
      const subDist = stepSize;

      if (this.inkUsed + subDist > this.maxInk) {
        reachedInkLimit = true;
        break;
      }

      this.inkUsed += subDist;
      this.currentPoints.push({ x: interpX, y: interpY });
      this.notifyInkChange();
    }

    // Process remaining distance to destination point if not limited
    if (!reachedInkLimit) {
      const currentLast = this.currentPoints[this.currentPoints.length - 1];
      const remDx = pt.x - currentLast.x;
      const remDy = pt.y - currentLast.y;
      const remDist = Math.sqrt(remDx * remDx + remDy * remDy);

      if (remDist >= STROKE.minPointDistance) {
        if (this.inkUsed + remDist > this.maxInk) {
          reachedInkLimit = true;
        } else {
          this.inkUsed += remDist;
          this.currentPoints.push(pt);
          this.notifyInkChange();
        }
      }
    }

    // If out of ink, stop adding points, trigger onNoInk once, and keep what is already drawn
    if (reachedInkLimit && !this.hasNotifiedNoInk) {
      this.hasNotifiedNoInk = true;
      if (this.callbacks.onNoInk) {
        this.callbacks.onNoInk();
      }
    }
  }

  handlePointerUp(e) {
    if (!this.isDrawing || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
      return;
    }
    this.releasePointer(e.pointerId);
    this.finishStroke();
  }

  handlePointerCancel(e) {
    if (!this.isDrawing || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
      return;
    }
    this.releasePointer(e.pointerId);
    this.finishStroke();
  }

  releasePointer(pointerId) {
    try {
      if (pointerId !== null && this.canvas.hasPointerCapture(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release errors
    }
    this.isDrawing = false;
    this.activePointerId = null;
  }

  finishStroke() {
    const rawPoints = this.currentPoints;
    this.currentPoints = [];

    // Step 4: Ignore strokes with fewer than 2 points
    if (rawPoints.length < 2) {
      return;
    }

    // Simplify points using RDP and limit to at most 40 segments
    const simplified = simplifyPoints(rawPoints, 4);
    const finalPoints = limitSegments(simplified, 40);

    if (finalPoints.length < 2) {
      return;
    }

    // Calculate actual ink cost of this stroke
    let strokeInkCost = 0;
    for (let i = 0; i < rawPoints.length - 1; i++) {
      const dX = rawPoints[i + 1].x - rawPoints[i].x;
      const dY = rawPoints[i + 1].y - rawPoints[i].y;
      strokeInkCost += Math.sqrt(dX * dX + dY * dY);
    }

    // Build compound Matter.js body
    const compoundBody = this.createCompoundBody(finalPoints);
    if (!compoundBody) return;

    Composite.add(this.world, compoundBody);

    const strokeRecord = {
      id: Date.now() + Math.random(),
      body: compoundBody,
      points: finalPoints,
      rawPoints,
      inkCost: strokeInkCost,
    };

    this.strokes.push(strokeRecord);

    if (this.callbacks.onStrokeAdded) {
      this.callbacks.onStrokeAdded(strokeRecord);
    }
  }

  createCompoundBody(points) {
    const parts = [];
    const radius = STROKE.thickness / 2;
    const isStatic = STROKE_MODE === 'static';

    const partOptions = {
      isStatic,
      friction: 0.5,
      density: 0.002,
      restitution: 0.1,
      label: 'stroke-part',
    };

    // Circles at every joint so no gaps
    for (let i = 0; i < points.length; i++) {
      const circle = Bodies.circle(points[i].x, points[i].y, radius, partOptions);
      parts.push(circle);
    }

    // Thin rectangles for each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) continue;

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const angle = Math.atan2(dy, dx);

      const rect = Bodies.rectangle(midX, midY, len, STROKE.thickness, {
        ...partOptions,
        angle,
      });
      parts.push(rect);
    }

    if (parts.length === 0) return null;

    const compound = Body.create({
      parts,
      isStatic,
      friction: 0.5,
      density: 0.002,
      restitution: 0.1,
      label: 'drawn-stroke',
    });

    return compound;
  }

  // Draw an arbitrary set of points programmatically (used for Replaying reference solutions)
  autoDrawStroke(points) {
    if (!points || points.length < 2) return null;

    let cost = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      cost += Math.sqrt(dx * dx + dy * dy);
    }

    this.inkUsed += cost;
    const body = this.createCompoundBody(points);
    if (!body) return null;

    Composite.add(this.world, body);
    const strokeRecord = {
      id: Date.now() + Math.random(),
      body,
      points,
      rawPoints: points,
      inkCost: cost,
    };
    this.strokes.push(strokeRecord);
    this.notifyInkChange();

    if (this.callbacks.onStrokeAdded) {
      this.callbacks.onStrokeAdded(strokeRecord);
    }
    return strokeRecord;
  }

  // Live preview points currently being drawn
  getLivePreview() {
    return this.isDrawing ? this.currentPoints : null;
  }

  // Step 6: Undo removes the last stroke and returns its ink
  undo() {
    if (this.strokes.length === 0) return null;

    const removed = this.strokes.pop();
    if (removed && removed.body) {
      Composite.remove(this.world, removed.body);
    }

    // Return ink
    this.inkUsed = Math.max(0, this.inkUsed - removed.inkCost);
    this.notifyInkChange();

    return removed;
  }

  // Step 6: clearStrokes() removes all
  clearStrokes() {
    for (const stroke of this.strokes) {
      if (stroke.body) {
        Composite.remove(this.world, stroke.body);
      }
    }
    this.strokes = [];
    this.inkUsed = 0;
    this.currentPoints = [];
    this.isDrawing = false;
    this.notifyInkChange();
  }

  // Step 7: API
  getInkLeft() {
    return Math.max(0, this.maxInk - this.inkUsed);
  }

  getInkUsed() {
    return this.inkUsed;
  }

  onInkChange(cb) {
    this.callbacks.onInkChange = cb;
  }

  onStrokeAdded(cb) {
    this.callbacks.onStrokeAdded = cb;
  }

  onNoInk(cb) {
    this.callbacks.onNoInk = cb;
  }

  setEnabled(bool) {
    this.isEnabled = bool;
    if (!bool && this.isDrawing) {
      this.releasePointer(this.activePointerId);
      this.currentPoints = [];
    }
  }

  notifyInkChange() {
    if (this.callbacks.onInkChange) {
      this.callbacks.onInkChange({
        inkUsed: Math.round(this.inkUsed),
        inkLeft: Math.round(this.getInkLeft()),
        maxInk: this.maxInk,
        percentage: Math.max(0, Math.min(100, Math.round((this.getInkLeft() / this.maxInk) * 100))),
      });
    }
  }

  destroy() {
    this.detachEvents();
    this.callbacks = {
      onInkChange: null,
      onStrokeAdded: null,
      onNoInk: null,
    };
    this.clearStrokes();
  }
}
