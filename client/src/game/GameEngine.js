import Matter from 'matter-js';
import { WORLD, FIXED_STEP, WATER } from '../physics/constants';
import { WaterSystem } from './WaterSystem';
import { Renderer } from './Renderer';
import { DrawingController } from './DrawingController';
import { LevelLoader } from './LevelLoader';
import { FillDetector } from './FillDetector';
import { GameState, STATES } from './GameState';

const { Engine, Composite, Bodies, Body } = Matter;

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.onParticleCountChange = options.onParticleCountChange || null;

    // 1. Initialize Matter.js Engine & World
    this.engine = Engine.create({
      enableSleeping: false,
    });
    this.engine.gravity.y = 1.0;
    this.engine.gravity.x = 0;
    this.world = this.engine.world;

    // 2. Initialize Subsystems & State
    this.gameState = new GameState(STATES.IDLE);
    this.waterSystem = new WaterSystem(this.world);
    this.renderer = new Renderer(canvas);
    this.levelLoader = new LevelLoader(this.world);
    this.fillDetector = new FillDetector();
    this.drawingController = new DrawingController(
      canvas,
      this.renderer,
      this.world,
      { maxInk: options.maxInk || 600 }
    );

    // 3. Connect First Stroke Release -> Transition from IDLE to SIMULATING (water starts)
    this.drawingController.onStrokeAdded(() => {
      if (this.gameState.is(STATES.IDLE)) {
        this.gameState.transitionTo(STATES.SIMULATING);
        this.start();
      }
    });

    // 4. Loop & Time Accumulator state
    this.isRunning = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.rafId = null;

    // 5. Tap Spawner state & drops limit
    this.tap = options.tap || { x: WORLD.width / 2, y: 70 };
    this.isSpawning = false;
    this.spawnTimer = 0;
    this.dropsRemaining = Infinity;
    this.totalDropsToSpawn = Infinity;
    this.splashes = []; // { x, y, life }
    this.fillPercent = 0;
    this.activeHint = null; // { points: [...] }
    this.hintTimer = null;

    // Dev overlay state
    this.devOverlay = {
      enabled: false,
      pointerWorld: null,
      lastTapWorld: null,
      glassSensor: null,
      hintLine: null,
    };

    // 6. Static world bodies
    this.staticBodies = [];

    // 7. Bind methods & visibility with dev event listener counter
    if (typeof window !== 'undefined') {
      window.__HAPPY_DROP_DEV__ = window.__HAPPY_DROP_DEV__ || {
        listenersCount: 0,
        restartCount: 0,
      };
      window.__HAPPY_DROP_DEV__.listenersCount += 1;
      console.log(`[HAPPY DROP DEV] Engine initialized. Active GameEngine listeners: ${window.__HAPPY_DROP_DEV__.listenersCount}`);
    }

    this.loop = this.loop.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.lastTime = 0;
      // Auto-pause if actively simulating or drawing
      if (this.gameState.is(STATES.SIMULATING) || this.gameState.is(STATES.DRAWING)) {
        this.gameState.transitionTo(STATES.PAUSED);
        this.stop();
      }
    }
  }

  // Setup static boundaries: left wall, right wall, top ceiling (NO floor so water drains out)
  setupSandboxBoundaries() {
    const wallOpts = { isStatic: true, friction: 0.1, restitution: 0.2, label: 'wall' };
    const thickness = 40;

    // Left wall
    const leftWall = Bodies.rectangle(
      -thickness / 2,
      WORLD.height / 2,
      thickness,
      WORLD.height * 2,
      wallOpts
    );

    // Right wall
    const rightWall = Bodies.rectangle(
      WORLD.width + thickness / 2,
      WORLD.height / 2,
      thickness,
      WORLD.height * 2,
      wallOpts
    );

    // Slanted platform in middle
    const platform = Bodies.rectangle(WORLD.width / 2, 400, 260, 24, {
      isStatic: true,
      friction: 0.05,
      restitution: 0.2,
      angle: (18 * Math.PI) / 180, // 18 degrees slope
      chamfer: { radius: 6 },
      label: 'platform',
    });

    this.staticBodies = [leftWall, rightWall, platform];
    Composite.add(this.world, this.staticBodies);
  }

  // Load a real level from JSON
  loadLevel(levelJson) {
    const loaded = this.levelLoader.load(levelJson);
    this.tap = loaded.tap;
    this.dropsRemaining = loaded.waterAmount;
    this.totalDropsToSpawn = loaded.waterAmount;
    this.drawingController.maxInk = loaded.maxInk;
    this.drawingController.clearStrokes();

    // Setup FillDetector with glass sensor and level requirements
    const targetFillRatio = levelJson.glass?.targetFill || (levelJson.targetWater ? levelJson.targetWater / loaded.waterAmount : 0.6);
    this.fillDetector.setSensor(
      this.levelLoader.glassSensor,
      loaded.waterAmount,
      targetFillRatio
    );
    this.fillPercent = 0;
    this.gameState.reset();

    // Re-render level initial state
    this.renderer.render(
      [],
      this.levelLoader.walls,
      this.tap,
      this.drawingController.strokes,
      null,
      this.levelLoader.obstacles,
      this.levelLoader.glass,
      [],
      0
    );

    return loaded;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isSpawning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    this.isSpawning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset() {
    // Clear all water particles & simulation timers
    this.stop();
    this.waterSystem.clear();
    this.spawnTimer = 0;
    this.accumulator = 0;
    this.splashes = [];
    this.fillPercent = 0;
    this.lastInsideCount = 0;
    this.fillDetector.reset();
    this.gameState.reset();

    if (this.levelLoader.tap) {
      this.dropsRemaining = this.levelLoader.waterAmount;
    }

    if (this.onParticleCountChange) {
      this.onParticleCountChange(0);
    }

    // Dev-only Matter.js body count logger to verify memory cleanliness
    const allBodies = Composite.allBodies(this.world);
    console.log(
      `[HAPPY DROP DEV] Engine reset. Total active Matter bodies in world: ${allBodies.length} (Static: ${this.levelLoader.walls.length + this.levelLoader.obstacles.length + this.levelLoader.glassBodies.length}, Water: ${this.waterSystem.count})`
    );

    // Re-render empty state
    const staticBodies = this.levelLoader.walls.length > 0 ? this.levelLoader.walls : this.staticBodies;
    this.renderer.render(
      [],
      staticBodies,
      this.tap,
      this.drawingController.strokes,
      this.drawingController.getLivePreview(),
      this.levelLoader.obstacles,
      this.levelLoader.glass,
      [],
      0,
      this.activeHint,
      this.devOverlay
    );
  }

  setDevOverlay(overlayConfig) {
    this.devOverlay = {
      ...this.devOverlay,
      ...overlayConfig,
    };
    // Re-render if engine is not running to immediately show toggle updates
    if (!this.isRunning) {
      const staticBodies = this.levelLoader.walls.length > 0 ? this.levelLoader.walls : this.staticBodies;
      this.renderer.render(
        this.waterSystem.particles,
        staticBodies,
        this.tap,
        this.drawingController.strokes,
        this.drawingController.getLivePreview(),
        this.levelLoader.obstacles,
        this.levelLoader.glass,
        this.splashes,
        this.fillPercent,
        this.activeHint,
        this.devOverlay
      );
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    if (document.hidden) {
      this.lastTime = currentTime;
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    if (!this.lastTime) {
      this.lastTime = currentTime;
    }

    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap spiral of death on lag spikes
    if (frameTime > 100) {
      frameTime = 100;
    }

    this.accumulator += frameTime;

    // Fixed timestep updates
    while (this.accumulator >= FIXED_STEP) {
      this.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    // Update splash particle bursts with physics
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      if (s.vx !== undefined) s.x += s.vx;
      if (s.vy !== undefined) {
        s.y += s.vy;
        s.vy += 0.22; // gentle gravity
      }
      s.life -= (s.decay || 0.04);
      if (s.life <= 0) {
        this.splashes.splice(i, 1);
      }
    }

    // Render current frame with committed strokes, obstacles, glass, live preview, fillPercent, and activeHint
    const staticBodies = this.levelLoader.walls.length > 0 ? this.levelLoader.walls : this.staticBodies;
    this.renderer.render(
      this.waterSystem.particles,
      staticBodies,
      this.tap,
      this.drawingController.strokes,
      this.drawingController.getLivePreview(),
      this.levelLoader.obstacles,
      this.levelLoader.glass,
      this.splashes,
      this.fillPercent,
      this.activeHint,
      this.devOverlay
    );

    if (this.onParticleCountChange) {
      this.onParticleCountChange(this.waterSystem.count);
    }

    this.rafId = requestAnimationFrame(this.loop);
  }

  showHint(points, durationMs = 4000) {
    if (!points || points.length < 2) return;
    this.activeHint = { points };

    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
    }

    this.hintTimer = setTimeout(() => {
      this.activeHint = null;
      this.hintTimer = null;
    }, durationMs);
  }

  step(delta) {
    // 1. Spawning water drops
    if (this.isSpawning && this.tap && this.dropsRemaining > 0) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= WATER.spawnEveryMs) {
        this.spawnTimer = 0;
        this.waterSystem.spawn(this.tap.x, this.tap.y + 12);
        if (Number.isFinite(this.dropsRemaining)) {
          this.dropsRemaining--;
          if (this.dropsRemaining <= 0) {
            this.isSpawning = false;
          }
        }
      }
    }

    // 2. Update Kinematic Obstacles (moving & rotating bodies with velocity)
    this.levelLoader.update(delta);

    // 3. Step physics simulation
    Engine.update(this.engine, delta);

    // 4. Handle Spikes vs Water collisions (particle burst with warning color)
    const removedBySpikes = this.levelLoader.handleWaterSpikeCollisions(
      this.waterSystem.particles,
      (pos) => {
        // Burst of 6-8 tiny droplets radiating outward
        for (let k = 0; k < 7; k++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
          const speed = Math.random() * 4 + 1.5;
          this.splashes.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#FF5252',
            radius: Math.random() * 2 + 1.2,
            life: 1.0,
            decay: 0.045,
          });
        }
      }
    );

    if (removedBySpikes.length > 0) {
      for (const drop of removedBySpikes) {
        Composite.remove(this.world, drop);
        const idx = this.waterSystem.particles.indexOf(drop);
        if (idx !== -1) {
          this.waterSystem.particles.splice(idx, 1);
        }
      }
    }

    // 5. Update particles (cap velocity & cull drops below world)
    this.waterSystem.update();

    // 6. Evaluate FillDetector rules & GameState transitions
    if (this.gameState.is(STATES.SIMULATING) || this.gameState.is(STATES.DRAWING)) {
      const allWaterSpawned = this.dropsRemaining <= 0;
      const fillResult = this.fillDetector.update(delta, this.waterSystem.particles, allWaterSpawned);
      this.fillPercent = fillResult.fillPercent;
      this.gameState.notifyFill(fillResult);

      // Splash particle burst when new water drops enter the glass
      if (fillResult.count > (this.lastInsideCount || 0)) {
        const glass = this.levelLoader.glass;
        const burstX = glass ? glass.x + (Math.random() - 0.5) * (glass.width - 24) : WORLD.width / 2;
        const burstY = glass ? glass.y - glass.height / 2 + 10 : 400;

        for (let k = 0; k < 3; k++) {
          this.splashes.push({
            x: burstX + (Math.random() - 0.5) * 6,
            y: burstY,
            vx: (Math.random() - 0.5) * 2.4,
            vy: -Math.random() * 2.8 - 1.2,
            color: '#38BDF8',
            radius: Math.random() * 1.5 + 1.2,
            life: 1.0,
            decay: 0.05,
          });
        }
      }
      this.lastInsideCount = fillResult.count;

      if (fillResult.status === 'WON' && !this.gameState.is(STATES.WON)) {
        this.gameState.transitionTo(STATES.WON, {
          inkUsed: this.drawingController.getInkUsed(),
          maxInk: this.drawingController.maxInk,
          fillPercent: this.fillPercent,
        });
      } else if (fillResult.status === 'FAILED' && !this.gameState.is(STATES.FAILED)) {
        this.gameState.transitionTo(STATES.FAILED, {
          count: fillResult.count,
          requiredCount: fillResult.requiredCount,
          fillPercent: this.fillPercent,
        });
      }
    }
  }

  screenToWorld(x, y) {
    return this.renderer.screenToWorld(x, y);
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (typeof window !== 'undefined' && window.__HAPPY_DROP_DEV__) {
      window.__HAPPY_DROP_DEV__.listenersCount = Math.max(0, window.__HAPPY_DROP_DEV__.listenersCount - 1);
      console.log(`[HAPPY DROP DEV] Engine destroyed. Active GameEngine listeners: ${window.__HAPPY_DROP_DEV__.listenersCount}`);
    }

    if (this.drawingController) {
      this.drawingController.destroy();
    }

    if (this.levelLoader) {
      this.levelLoader.destroy();
    }

    this.waterSystem.clear();
    Composite.clear(this.world, false);
    Engine.clear(this.engine);

    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}
