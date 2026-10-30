import { WORLD, WATER, WATER_GOOEY_EFFECT } from '../physics/constants';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Check if Canvas 2D filter is supported (falls back cleanly for older Safari)
    this.supportsFilter = typeof this.ctx.filter === 'string';

    // Dedicated offscreen canvas for gooey water liquid effect
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = WORLD.width;
    this.offscreenCanvas.height = WORLD.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: false });

    // Glass animation states (smooth easing & mood bounce)
    this.displayFillPercent = 0;
    this.lastMood = 'SAD';
    this.moodTransitionTime = 0;

    // Performance tracking for 250 particles measurement
    this.renderTimes = [];
    this.measuredAvgMs = null;

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
  }

  resize() {
    if (!this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const containerWidth = parent ? parent.clientWidth : window.innerWidth;
    const containerHeight = parent ? parent.clientHeight : window.innerHeight;

    // Display resolution
    this.canvas.width = containerWidth * dpr;
    this.canvas.height = containerHeight * dpr;
    this.canvas.style.width = `${containerWidth}px`;
    this.canvas.style.height = `${containerHeight}px`;

    // Reset transform and apply DPR
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Letterbox scale for 600x800 world
    const scaleX = containerWidth / WORLD.width;
    const scaleY = containerHeight / WORLD.height;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (containerWidth - WORLD.width * this.scale) / 2;
    this.offsetY = (containerHeight - WORLD.height * this.scale) / 2;
  }

  // Convert client pointer coordinate to 600x800 world space
  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.offsetX;
    const y = clientY - rect.top - this.offsetY;

    return {
      x: x / this.scale,
      y: y / this.scale,
    };
  }

  clear() {
    const ctx = this.ctx;
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // Fill letterbox container with soft background
    ctx.fillStyle = '#EAF6FF';
    ctx.fillRect(0, 0, w, h);
  }

  render(waterParticles, staticBodies = [], tap = null, strokes = [], livePreview = null, obstacles = [], glass = null, splashes = [], fillPercent = 0, activeHint = null, devOverlay = null) {
    this.clear();
    const ctx = this.ctx;

    ctx.save();
    // Move to letterbox offset and scale to world
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 1. Draw World Canvas Background & Border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Subtle Grid pattern
    ctx.strokeStyle = 'rgba(43, 167, 240, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }

    // Dev Overlay Grid: major grid every 50 world units with coordinate labels
    if (devOverlay && devOverlay.enabled) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)'; // visible reddish grid
      ctx.lineWidth = 1;
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      for (let x = 0; x <= WORLD.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD.height);
        ctx.stroke();
        if (x > 0 && x < WORLD.width) {
          ctx.fillText(`${x}`, x + 2, 4);
        }
      }
      for (let y = 0; y <= WORLD.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.width, y);
        ctx.stroke();
        if (y > 0 && y < WORLD.height) {
          ctx.fillText(`${y}`, 4, y + 2);
        }
      }
      ctx.restore();
    }

    // World Border
    ctx.strokeStyle = '#12355B';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height);

    // 2. Draw Static World Bodies (Boundaries, Platforms)
    ctx.fillStyle = '#12355B';
    ctx.strokeStyle = '#0B223B';
    ctx.lineWidth = 2;

    for (const body of staticBodies) {
      // Don't draw internal sensor
      if (body.isSensor || body.label === 'glass-sensor') continue;
      if (!body.vertices || body.vertices.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
      for (let j = 1; j < body.vertices.length; j++) {
        ctx.lineTo(body.vertices[j].x, body.vertices[j].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3. Draw Level Obstacles with colorful, rounded styles
    for (const obs of (obstacles || [])) {
      const body = obs.body || obs;
      const meta = obs.meta || body.obstacleMeta || {};
      const type = (meta.type || 'platform').toLowerCase();

      ctx.save();
      if (!body.vertices || body.vertices.length === 0) {
        ctx.restore();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
      for (let j = 1; j < body.vertices.length; j++) {
        ctx.lineTo(body.vertices[j].x, body.vertices[j].y);
      }
      ctx.closePath();

      switch (type) {
        case 'spike':
          // Bright Coral/Red Warning Spike
          ctx.fillStyle = '#FF5252';
          ctx.strokeStyle = '#D32F2F';
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();
          break;

        case 'moving':
          // Sleek Purple/Violet Kinematic Slider
          ctx.fillStyle = '#8B5CF6';
          ctx.strokeStyle = '#6D28D9';
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();

          // Motion track indicator dots on body
          if (body.position) {
            ctx.fillStyle = '#DDD6FE';
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case 'rotating':
          // Vibrant Amber/Orange Kinematic Spinner
          ctx.fillStyle = '#F59E0B';
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();

          // Center pivot hub
          if (body.position) {
            ctx.fillStyle = '#FEF3C7';
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          break;

        case 'wall':
        case 'platform':
        case 'box':
        case 'beam':
        default:
          // Modern Slate Blue / Teal Block
          ctx.fillStyle = '#3B82F6';
          ctx.strokeStyle = '#1D4ED8';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          break;
      }

      ctx.restore();
    }

    // 4. Draw Original Glass Character with Face & Moods
    if (glass) {
      const { x, y, width = 70, height = 100 } = glass;
      const thickness = 10;
      const halfW = width / 2;
      const halfH = height / 2;

      // Smooth water level animation: ease display level toward target fillPercent
      this.displayFillPercent += (fillPercent - this.displayFillPercent) * 0.08;

      // Handle eye blinking every ~3.5 seconds
      const now = performance.now();
      const blinkCycle = now % 3500;
      const isBlinking = blinkCycle < 160;

      // Determine mood & bounce offset
      // Moods: SAD (empty), SMILE (filling), HAPPY (full, big smile, small bounce)
      let mood = 'SAD';
      if (this.displayFillPercent >= 0.98 || fillPercent >= 1) {
        mood = 'HAPPY';
      } else if (this.displayFillPercent > 0.04 || fillPercent > 0.05) {
        mood = 'SMILE';
      }

      // Face change trigger with small bounce
      if (this.lastMood !== mood) {
        this.lastMood = mood;
        this.moodTransitionTime = now;
      }

      let moodBounceY = 0;
      if (this.moodTransitionTime && now - this.moodTransitionTime < 350) {
        const progress = (now - this.moodTransitionTime) / 350;
        moodBounceY = -Math.sin(progress * Math.PI) * 6; // cute transition hop
      }

      // Idle happy bounce when full
      const happyBounceY = mood === 'HAPPY' ? Math.sin(now * 0.008) * 3 : 0;
      const totalBounceY = happyBounceY + moodBounceY;

      ctx.save();
      ctx.translate(0, totalBounceY);

      // Glass body inner tint
      ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.fillRect(x - halfW + thickness, y - halfH, width - thickness * 2, height - thickness);

      // --- Smooth Water Level Animation inside the Glass ---
      if (this.displayFillPercent > 0.01) {
        const maxWaterH = height - thickness - 8;
        const currentWaterH = Math.min(maxWaterH, maxWaterH * this.displayFillPercent);
        const waterTopY = y + halfH - thickness - currentWaterH;
        const wave = Math.sin(now * 0.006) * 1.5;

        ctx.save();
        // Clip to inner glass chamber
        ctx.beginPath();
        ctx.rect(x - halfW + thickness, y - halfH, width - thickness * 2, height - thickness);
        ctx.clip();

        // Water liquid body with smooth gradient
        const waterGrad = ctx.createLinearGradient(0, waterTopY, 0, y + halfH);
        waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.88)');
        ctx.fillStyle = waterGrad;

        ctx.beginPath();
        ctx.moveTo(x - halfW + thickness, y + halfH);
        ctx.lineTo(x - halfW + thickness, waterTopY + wave);
        ctx.quadraticCurveTo(x, waterTopY - wave, x + halfW - thickness, waterTopY + wave);
        ctx.lineTo(x + halfW - thickness, y + halfH);
        ctx.closePath();
        ctx.fill();

        // Water surface line with foam highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - halfW + thickness, waterTopY + wave);
        ctx.quadraticCurveTo(x, waterTopY - wave, x + halfW - thickness, waterTopY + wave);
        ctx.stroke();

        ctx.restore();
      }

      // Glass U-shape outline with cute rounded bottom
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#0284C7';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(x - halfW, y - halfH);
      ctx.lineTo(x - halfW, y + halfH - 8);
      ctx.quadraticCurveTo(x - halfW, y + halfH, x - halfW + 8, y + halfH);
      ctx.lineTo(x + halfW - 8, y + halfH);
      ctx.quadraticCurveTo(x + halfW, y + halfH, x + halfW, y + halfH - 8);
      ctx.lineTo(x + halfW, y - halfH);
      ctx.stroke();

      // Target water fill dashed measurement line
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x - halfW + thickness, y - halfH * 0.2);
      ctx.lineTo(x + halfW - thickness, y - halfH * 0.2);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // --- Draw Original Cute Glass Character Face ---
      const faceY = y + 10;
      const eyeSpacing = Math.min(16, width * 0.25);

      // Draw Eyes
      ctx.fillStyle = '#0F172A';
      if (isBlinking) {
        // Closed / Blinking eyes (horizontal curves)
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        // Left eye
        ctx.beginPath();
        ctx.arc(x - eyeSpacing, faceY - 6, 4, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        // Right eye
        ctx.beginPath();
        ctx.arc(x + eyeSpacing, faceY - 6, 4, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      } else if (mood === 'HAPPY') {
        // Happy inverted arc eyes ^_^
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x - eyeSpacing, faceY - 4, 5, 1.1 * Math.PI, 1.9 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + eyeSpacing, faceY - 4, 5, 1.1 * Math.PI, 1.9 * Math.PI);
        ctx.stroke();
      } else {
        // Round open eyes with white specular catchlights
        ctx.beginPath();
        ctx.arc(x - eyeSpacing, faceY - 6, 3.5, 0, Math.PI * 2);
        ctx.arc(x + eyeSpacing, faceY - 6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x - eyeSpacing - 1, faceY - 7, 1.2, 0, Math.PI * 2);
        ctx.arc(x + eyeSpacing - 1, faceY - 7, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Cheeks for Smile and Happy
      if (mood === 'SMILE' || mood === 'HAPPY') {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.55)'; // cute soft pink blush
        ctx.beginPath();
        ctx.arc(x - eyeSpacing - 4, faceY, 3, 0, Math.PI * 2);
        ctx.arc(x + eyeSpacing + 4, faceY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Mouth based on Mood
      ctx.strokeStyle = '#0F172A';
      ctx.fillStyle = '#0F172A';
      ctx.lineWidth = 2;

      if (mood === 'HAPPY') {
        // Big open joyful smile with tongue
        ctx.beginPath();
        ctx.arc(x, faceY + 1, 7, 0, Math.PI);
        ctx.closePath();
        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.stroke();

        // Little pink tongue inside
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, faceY + 1, 7, 0, Math.PI);
        ctx.clip();
        ctx.fillStyle = '#FB7185';
        ctx.beginPath();
        ctx.arc(x, faceY + 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (mood === 'SMILE') {
        // Sweet cheerful smile
        ctx.beginPath();
        ctx.arc(x, faceY + 1, 6, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        // SAD: slight downturned pout :(
        ctx.beginPath();
        ctx.arc(x, faceY + 7, 5, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 5. Draw Committed Strokes (Bodies)
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;

    for (const stroke of (strokes || [])) {
      if (!stroke.body) continue;
      const parts = stroke.body.parts && stroke.body.parts.length > 1 ? stroke.body.parts.slice(1) : [stroke.body];
      for (const part of parts) {
        if (!part.vertices || part.vertices.length === 0) continue;
        ctx.beginPath();
        ctx.moveTo(part.vertices[0].x, part.vertices[0].y);
        for (let j = 1; j < part.vertices.length; j++) {
          ctx.lineTo(part.vertices[j].x, part.vertices[j].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 6. Draw Live Drawing Preview Line
    if (livePreview && livePreview.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(74, 144, 226, 0.75)'; // rounded line, width 10, soft color

      ctx.beginPath();
      ctx.moveTo(livePreview[0].x, livePreview[0].y);
      for (let i = 1; i < livePreview.length; i++) {
        ctx.lineTo(livePreview[i].x, livePreview[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 7. Draw Tiny Splash Particle Bursts (spikes and glass entry)
    for (const splash of (splashes || [])) {
      const alpha = Math.max(0, Math.min(1, splash.life));
      const r = splash.radius || (6 * (1.5 - alpha));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = splash.color || '#38BDF8';
      ctx.beginPath();
      ctx.arc(splash.x, splash.y, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Draw Animated Ghost Hint Line with "Try drawing here" label
    if (activeHint && activeHint.points && activeHint.points.length >= 2) {
      const pts = activeHint.points;
      const now = performance.now();
      const dashOffset = (now * 0.02) % 20;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)'; // glowing soft amber
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -dashOffset;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Outer soft glow
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.stroke();
      ctx.setLineDash([]);

      // "Try drawing here" label near midpoint
      const midIdx = Math.floor(pts.length / 2);
      const midPt = pts[midIdx] || pts[0];
      const labelY = Math.max(25, midPt.y - 14);

      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labelText = 'Try drawing here';
      const textMetrics = ctx.measureText(labelText);
      const bgW = textMetrics.width + 16;
      const bgH = 20;

      // Label badge
      ctx.fillStyle = 'rgba(18, 53, 91, 0.85)';
      ctx.beginPath();
      ctx.roundRect(midPt.x - bgW / 2, labelY - bgH / 2, bgW, bgH, 10);
      ctx.fill();
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labelText, midPt.x, labelY);

      ctx.restore();
    }

    // 9. Draw Water Particles with Gooey Liquid Filter
    const renderStart = performance.now();

    if (WATER_GOOEY_EFFECT && this.supportsFilter && waterParticles.length > 0) {
      // 9a. Render particles to offscreen canvas
      this.offscreenCtx.clearRect(0, 0, WORLD.width, WORLD.height);
      this.offscreenCtx.fillStyle = '#2BA7F0';

      for (let i = 0; i < waterParticles.length; i++) {
        const { x, y } = waterParticles[i].position;
        this.offscreenCtx.beginPath();
        // Slightly larger radius so adjacent drops blend
        this.offscreenCtx.arc(x, y, WATER.radius * 2.2, 0, Math.PI * 2);
        this.offscreenCtx.fill();
      }

      // 9b. Render gooey liquid to world canvas with blur & contrast
      ctx.save();
      ctx.filter = 'blur(6px) contrast(18) brightness(1.05)';
      ctx.drawImage(this.offscreenCanvas, 0, 0);
      ctx.restore();

      // 9c. Draw lighter specular highlight over the liquid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      const hr = WATER.radius * 0.45;
      for (let i = 0; i < waterParticles.length; i++) {
        const { x, y } = waterParticles[i].position;
        ctx.beginPath();
        ctx.arc(x - WATER.radius * 0.35, y - WATER.radius * 0.35, hr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Fallback for Safari without ctx.filter support or when switched off in constants.js
      for (let i = 0; i < waterParticles.length; i++) {
        const { x, y } = waterParticles[i].position;
        const r = WATER.radius;

        // Base Blue Drop
        ctx.fillStyle = '#2BA7F0';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Performance measurement logging when close to full capacity (250 particles)
    if (waterParticles.length >= 240) {
      const renderDuration = performance.now() - renderStart;
      this.renderTimes.push(renderDuration);
      if (this.renderTimes.length >= 60) {
        const sum = this.renderTimes.reduce((a, b) => a + b, 0);
        this.measuredAvgMs = (sum / this.renderTimes.length).toFixed(2);
        console.log(
          `[HAPPY DROP PERF] Water gooey effect with ${waterParticles.length} particles: avg render time ${this.measuredAvgMs}ms (~${Math.round(1000 / Number(this.measuredAvgMs))} FPS cap capability, solid 60 FPS capped by RAF). Filter enabled: ${WATER_GOOEY_EFFECT && this.supportsFilter}`
        );
        this.renderTimes = [];
      }
    }

    // 9. Draw Tap if provided
    if (tap) {
      this.drawTap(ctx, tap.x, tap.y);
    }

    // 10. Dev Overlay Annotations (Obstacle IDs, Tap position, Glass sensor, Pointer position, Level hint line)
    if (devOverlay && devOverlay.enabled) {
      ctx.save();

      // (a) Tap Position Crosshair & Label
      if (tap) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tap.x, tap.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tap.x - 12, tap.y);
        ctx.lineTo(tap.x + 12, tap.y);
        ctx.moveTo(tap.x, tap.y - 12);
        ctx.lineTo(tap.x, tap.y + 12);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`TAP (${Math.round(tap.x)}, ${Math.round(tap.y)})`, tap.x + 14, tap.y - 6);
      }

      // (b) Glass Sensor Boundary
      if (devOverlay.glassSensor) {
        const s = devOverlay.glassSensor;
        if (s.bounds) {
          const minX = s.bounds.min.x;
          const minY = s.bounds.min.y;
          const w = s.bounds.max.x - minX;
          const h = s.bounds.max.y - minY;
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(minX, minY, w, h);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.fillRect(minX, minY, w, h);
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`GLASS SENSOR (${Math.round(s.position.x)}, ${Math.round(s.position.y)})`, minX, minY - 4);
        }
      }

      // (c) Obstacle IDs & Bounds
      for (const obs of (obstacles || [])) {
        const body = obs.body || obs;
        const meta = obs.meta || body.obstacleMeta || {};
        const id = meta.id || obs.id || body.label || 'obstacle';
        if (body.position) {
          ctx.fillStyle = '#8B5CF6';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`ID: ${id}`, body.position.x - 20, body.position.y - 4);
        }
      }

      // (d) Pointer / Tap position in World Units
      if (devOverlay.pointerWorld) {
        const { x, y } = devOverlay.pointerWorld;
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(x + 10, y - 22, 110, 18);
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`X:${Math.round(x)} Y:${Math.round(y)}`, x + 14, y - 9);
      }

      // (e) Last Tapped / Clicked Canvas Point
      if (devOverlay.lastTapWorld) {
        const { x, y } = devOverlay.lastTapWorld;
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#EC4899';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`CLICKED (${Math.round(x)}, ${Math.round(y)})`, x + 12, y + 14);
      }

      // (f) Level Hint Line (Always visible when dev overlay enabled)
      if (devOverlay.hintLine && devOverlay.hintLine.length >= 2) {
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(devOverlay.hintLine[0].x, devOverlay.hintLine[0].y);
        for (let k = 1; k < devOverlay.hintLine.length; k++) {
          ctx.lineTo(devOverlay.hintLine[k].x, devOverlay.hintLine[k].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#EA580C';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('REF / HINT LINE', devOverlay.hintLine[0].x, devOverlay.hintLine[0].y - 8);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  drawTap(ctx, x, y) {
    // Metal nozzle body
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.roundRect(x - 22, y - 26, 44, 22, 6);
    ctx.fill();

    // Valve nozzle tip
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 4, 24, 18, [0, 0, 6, 6]);
    ctx.fill();

    // Blue indicator
    ctx.fillStyle = '#2BA7F0';
    ctx.beginPath();
    ctx.arc(x, y - 15, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
  }
}
