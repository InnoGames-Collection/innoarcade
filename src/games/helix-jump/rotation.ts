/**
 * Tower rotation — 1:1 finger tracking, inertia on release, optional auto-spin from rings.
 */

import { expDecay } from './easing';

const DRAG_SENS = 0.013;
const MOMENTUM_BLEND = 0.48;
const VELOCITY_SMOOTH = 16;
const TAP_IMPULSE = Math.PI / 4;
const SWIPE_IMPULSE = Math.PI / 5.5;
const FRICTION = 6.2;
const MAX_VELOCITY = 8.5;
const STOP_THRESHOLD = 0.018;

export class RotationController {
  angle = 0;
  private velocity = 0;
  private dragging = false;
  private lastDragVel = 0;
  private autoSpin = 0;
  private pendingDx = 0;

  setDragging(active: boolean): void {
    if (active) {
      this.dragging = true;
      this.lastDragVel = 0;
      return;
    }
    if (!this.dragging) return;
    this.dragging = false;
    this.velocity = this.lastDragVel * MOMENTUM_BLEND;
    this.clampVelocity();
  }

  drag(dx: number): void {
    this.pendingDx += dx;
  }

  /** Flush accumulated pointer delta with game-loop dt for frame-rate independence. */
  tickDrag(dt: number): void {
    if (!this.dragging || this.pendingDx === 0) return;

    const delta = this.pendingDx * DRAG_SENS;
    this.pendingDx = 0;
    this.angle += delta;

    const instantVel = dt > 0.0001 ? delta / dt : 0;
    const blend = Math.min(1, VELOCITY_SMOOTH * dt);
    this.lastDragVel += (instantVel - this.lastDragVel) * blend;
  }

  addAutoSpin(radPerSec: number): void {
    this.autoSpin = radPerSec;
  }

  tap(): void {
    this.velocity += TAP_IMPULSE;
    this.clampVelocity();
  }

  swipeLeft(): void {
    this.velocity -= SWIPE_IMPULSE;
    this.clampVelocity();
  }

  swipeRight(): void {
    this.velocity += SWIPE_IMPULSE;
    this.clampVelocity();
  }

  update(dt: number): void {
    this.tickDrag(dt);
    if (!this.dragging) {
      this.angle += (this.velocity + this.autoSpin) * dt;
      this.velocity *= Math.exp(-FRICTION * dt);
      if (Math.abs(this.velocity) < STOP_THRESHOLD) this.velocity = 0;
    } else if (this.autoSpin !== 0) {
      this.angle += this.autoSpin * dt;
    }
    this.autoSpin = expDecay(this.autoSpin, dt, 4.5);
  }

  reset(): void {
    this.angle = 0;
    this.velocity = 0;
    this.lastDragVel = 0;
    this.autoSpin = 0;
    this.pendingDx = 0;
    this.dragging = false;
  }

  private clampVelocity(): void {
    if (this.velocity > MAX_VELOCITY) this.velocity = MAX_VELOCITY;
    if (this.velocity < -MAX_VELOCITY) this.velocity = -MAX_VELOCITY;
  }
}
