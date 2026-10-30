import Matter from 'matter-js';
import { WORLD } from '../physics/constants';

const { Bodies, Composite, Body } = Matter;

/**
 * Factory for creating different obstacle types
 * Types: wall, platform (or box/beam), spike, moving, rotating
 */
export function createObstacle(type, data) {
  const normType = (type || 'platform').toLowerCase();
  const x = data.x ?? 300;
  const y = data.y ?? 400;
  const width = data.width ?? 100;
  const height = data.height ?? 20;
  const rotationDeg = data.rotation ?? data.angle ?? 0;
  const angleRad = (rotationDeg * Math.PI) / 180;

  let body = null;
  let customData = {
    type: normType,
    id: data.id || `obs-${Date.now()}-${Math.random()}`,
    original: { ...data },
    x,
    y,
    width,
    height,
    angle: angleRad,
  };

  switch (normType) {
    case 'wall':
    case 'platform':
    case 'box':
    case 'beam': {
      body = Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        friction: 0.1,
        restitution: 0.2,
        chamfer: { radius: Math.min(6, Math.min(width, height) / 4) },
        angle: angleRad,
        label: 'obstacle-static',
      });
      break;
    }

    case 'spike': {
      // Static triangle with base width and height
      // Matter.Bodies.polygon(x, y, 3, radius) or trapezoid/vertices
      const r = Math.max(width, height) / 2;
      body = Bodies.polygon(x, y, 3, r, {
        isStatic: true,
        friction: 0.1,
        restitution: 0.2,
        angle: angleRad,
        label: 'obstacle-spike',
      });
      break;
    }

    case 'moving': {
      // Kinematic body moving between two points or along an axis
      body = Bodies.rectangle(x, y, width, height, {
        isStatic: false,
        isSensor: false,
        friction: 0.1,
        restitution: 0.2,
        chamfer: { radius: Math.min(6, Math.min(width, height) / 4) },
        angle: angleRad,
        label: 'obstacle-moving',
      });

      // Kinematic setup: infinite mass/inertia so it does not get knocked away by water/strokes
      Body.setInertia(body, Infinity);
      Body.setMass(body, Infinity);

      // Motion configuration
      const motion = data.motion || {};
      const axis = (motion.axis || 'x').toLowerCase();
      const distance = motion.distance ?? 100;
      const speed = motion.speed ?? 1.5; // radians/second or frequency
      const startX = data.startX ?? x;
      const startY = data.startY ?? y;

      customData.motion = {
        axis,
        distance,
        speed,
        startX,
        startY,
        time: 0,
        targetA: motion.pointA || (axis === 'x' ? { x: startX - distance / 2, y: startY } : { x: startX, y: startY - distance / 2 }),
        targetB: motion.pointB || (axis === 'x' ? { x: startX + distance / 2, y: startY } : { x: startX, y: startY + distance / 2 }),
      };
      break;
    }

    case 'rotating': {
      // Kinematic body rotating at constant speed
      body = Bodies.rectangle(x, y, width, height, {
        isStatic: false,
        isSensor: false,
        friction: 0.1,
        restitution: 0.2,
        chamfer: { radius: Math.min(6, Math.min(width, height) / 4) },
        angle: angleRad,
        label: 'obstacle-rotating',
      });

      Body.setInertia(body, Infinity);
      Body.setMass(body, Infinity);

      const angularSpeed = data.angularSpeed ?? data.speed ?? 1.5; // rad/sec
      customData.rotating = {
        speed: angularSpeed,
        originX: x,
        originY: y,
      };
      break;
    }

    default: {
      body = Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        friction: 0.1,
        restitution: 0.2,
        angle: angleRad,
        label: 'obstacle-static',
      });
      break;
    }
  }

  body.obstacleMeta = customData;
  return { body, meta: customData };
}

export class LevelLoader {
  constructor(world) {
    this.world = world;
    this.walls = [];
    this.glassBodies = [];
    this.glassSensor = null;
    this.obstacles = []; // array of { body, meta }
    this.tap = null;
    this.glass = null;
    this.waterAmount = 35;
    this.maxInk = 400;
    this.currentLevel = null;
  }

  load(levelJson) {
    this.destroy(); // Clear existing objects if any
    this.currentLevel = levelJson;

    const worldWidth = levelJson.world?.width || WORLD.width;
    const worldHeight = levelJson.world?.height || WORLD.height;

    // 1. Build Side Walls (No bottom floor so extra water drains away)
    const wallThickness = 40;
    const wallOptions = { isStatic: true, friction: 0.1, restitution: 0.2, label: 'boundary-wall' };

    const leftWall = Bodies.rectangle(
      -wallThickness / 2,
      worldHeight / 2,
      wallThickness,
      worldHeight * 2,
      wallOptions
    );
    const rightWall = Bodies.rectangle(
      worldWidth + wallThickness / 2,
      worldHeight / 2,
      wallThickness,
      worldHeight * 2,
      wallOptions
    );

    this.walls = [leftWall, rightWall];
    Composite.add(this.world, this.walls);

    // 2. Tap position & Water drops
    this.tap = {
      x: levelJson.tap?.x ?? worldWidth / 2,
      y: levelJson.tap?.y ?? 80,
      waterDrops: levelJson.tap?.waterDrops ?? levelJson.waterAmount ?? 35,
    };
    this.waterAmount = this.tap.waterDrops;
    this.maxInk = levelJson.maxInk ?? 400;

    // 3. Build U-Shaped Glass: two static side walls, static floor, and an invisible sensor inside
    if (levelJson.glass) {
      this.glass = levelJson.glass;
      const { x, y, width = 70, height = 100 } = levelJson.glass;
      const thickness = 10;
      const halfW = width / 2;
      const halfH = height / 2;

      const glassOpts = {
        isStatic: true,
        friction: 0.05,
        restitution: 0.1,
        label: 'glass-wall',
      };

      // Bottom floor
      const bottom = Bodies.rectangle(
        x,
        y + halfH - thickness / 2,
        width,
        thickness,
        glassOpts
      );

      // Left wall
      const left = Bodies.rectangle(
        x - halfW + thickness / 2,
        y,
        thickness,
        height,
        glassOpts
      );

      // Right wall
      const right = Bodies.rectangle(
        x + halfW - thickness / 2,
        y,
        thickness,
        height,
        glassOpts
      );

      // Invisible sensor rectangle inside for counting water
      const sensorHeight = height - thickness - 4;
      const sensorWidth = width - thickness * 2 - 4;
      this.glassSensor = Bodies.rectangle(
        x,
        y - thickness / 2,
        Math.max(10, sensorWidth),
        Math.max(10, sensorHeight),
        {
          isStatic: true,
          isSensor: true,
          label: 'glass-sensor',
        }
      );

      this.glassBodies = [bottom, left, right, this.glassSensor];
      Composite.add(this.world, this.glassBodies);
    }

    // 4. Build Obstacles from level
    const rawObstacles = levelJson.obstacles || [];
    for (const obsData of rawObstacles) {
      const obstacle = createObstacle(obsData.type, obsData);
      if (obstacle && obstacle.body) {
        this.obstacles.push(obstacle);
        Composite.add(this.world, obstacle.body);
      }
    }

    return {
      tap: this.tap,
      glass: this.glass,
      obstacles: this.obstacles,
      maxInk: this.maxInk,
      waterAmount: this.waterAmount,
    };
  }

  /**
   * Called on every fixed physics step to update moving & rotating kinematic bodies
   * @param {number} deltaMs
   */
  update(deltaMs) {
    const dt = deltaMs / 1000;

    for (const { body, meta } of this.obstacles) {
      if (!body || !meta) continue;

      if (meta.type === 'moving' && meta.motion) {
        const m = meta.motion;
        m.time += dt * m.speed;

        // Default sine wave oscillation between endpoints
        const sinVal = Math.sin(m.time);
        const cosVal = Math.cos(m.time);

        let newX = m.startX;
        let newY = m.startY;
        let vx = 0;
        let vy = 0;

        if (m.axis === 'y') {
          newY = m.startY + (sinVal * m.distance) / 2;
          vy = ((cosVal * m.distance) / 2) * m.speed;
        } else {
          newX = m.startX + (sinVal * m.distance) / 2;
          vx = ((cosVal * m.distance) / 2) * m.speed;
        }

        Body.setPosition(body, { x: newX, y: newY });
        Body.setVelocity(body, { x: vx, y: vy });
      } else if (meta.type === 'rotating' && meta.rotating) {
        const r = meta.rotating;
        const newAngle = body.angle + r.speed * dt;
        Body.setAngle(body, newAngle);
        Body.setAngularVelocity(body, r.speed);
        // Ensure center remains anchored
        Body.setPosition(body, { x: r.originX, y: r.originY });
        Body.setVelocity(body, { x: 0, y: 0 });
      }
    }
  }

  /**
   * Check spike collisions against water particles, remove touching drops, and trigger splash callback
   */
  handleWaterSpikeCollisions(waterParticles, onSplash) {
    const spikes = this.obstacles.filter((o) => o.meta.type === 'spike');
    if (spikes.length === 0 || !waterParticles || waterParticles.length === 0) {
      return [];
    }

    const removedParticles = [];

    for (const spike of spikes) {
      const spikeBody = spike.body;
      for (const drop of waterParticles) {
        if (Matter.Bounds.overlaps(spikeBody.bounds, drop.bounds)) {
          if (Matter.Vertices.contains(spikeBody.vertices, drop.position)) {
            removedParticles.push(drop);
            if (onSplash) {
              onSplash({ x: drop.position.x, y: drop.position.y });
            }
          }
        }
      }
    }

    return removedParticles;
  }

  destroy() {
    if (this.walls.length > 0) {
      Composite.remove(this.world, this.walls);
      this.walls = [];
    }
    if (this.glassBodies.length > 0) {
      Composite.remove(this.world, this.glassBodies);
      this.glassBodies = [];
      this.glassSensor = null;
    }
    if (this.obstacles.length > 0) {
      for (const obs of this.obstacles) {
        if (obs.body) {
          Composite.remove(this.world, obs.body);
        }
      }
      this.obstacles = [];
    }
    this.tap = null;
    this.glass = null;
    this.currentLevel = null;
  }
}
