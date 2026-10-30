import Matter from 'matter-js';
import { WORLD, WATER } from '../physics/constants';

const { Bodies, Composite, Body } = Matter;

export class WaterSystem {
  constructor(world) {
    this.world = world;
    this.particles = [];
    this.lastSpawnTime = 0;
  }

  get count() {
    return this.particles.length;
  }

  spawn(x, y) {
    if (this.particles.length >= WATER.maxParticles) {
      return null;
    }

    const jitterX = (Math.random() - 0.5) * 6;
    const drop = Bodies.circle(x + jitterX, y, WATER.radius, {
      friction: WATER.friction,
      frictionAir: WATER.frictionAir,
      restitution: WATER.restitution,
      density: WATER.density,
      label: 'water-particle',
    });

    this.particles.push(drop);
    Composite.add(this.world, drop);
    return drop;
  }

  update() {
    const toKeep = [];
    const maxSpeedSq = WATER.maxSpeed * WATER.maxSpeed;

    for (let i = 0; i < this.particles.length; i++) {
      const drop = this.particles[i];
      const pos = drop.position;
      const vel = drop.velocity;

      // 1. Cap particle velocity to maxSpeed
      const speedSq = vel.x * vel.x + vel.y * vel.y;
      if (speedSq > maxSpeedSq) {
        const factor = WATER.maxSpeed / Math.sqrt(speedSq);
        Body.setVelocity(drop, {
          x: vel.x * factor,
          y: vel.y * factor,
        });
      }

      // 2. Cull drops that fall outside the bounds (below floor or off sides)
      const isOutOfBounds =
        pos.y > WORLD.height + 40 ||
        pos.x < -60 ||
        pos.x > WORLD.width + 60;

      if (isOutOfBounds) {
        Composite.remove(this.world, drop);
      } else {
        toKeep.push(drop);
      }
    }

    this.particles = toKeep;
  }

  clear() {
    for (let i = 0; i < this.particles.length; i++) {
      Composite.remove(this.world, this.particles[i]);
    }
    this.particles = [];
  }
}
