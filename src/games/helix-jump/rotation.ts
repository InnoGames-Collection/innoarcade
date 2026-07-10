/**
 * Tower rotation — 1:1 finger tracking while dragging, light coast on release.
 * Helix (pillar + platforms) pivots at origin; ball never inherits rotation.
 */

/** Radians per screen pixel — ~one full turn per screen width. */
const DRAG_SENS = 0.013;
/** Fraction of last drag speed carried into release coast. */
const MOMENTUM_BLEND = 0.48;
/** Smooth drag-speed estimate for stable release momentum. */
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
  private lastDragTime = 0;

  setDragging(active: boolean): void {
    if (active) {
      this.dragging = true;
      this.lastDragVel = 0;
      this.lastDragTime = 0;
      return;
    }
    if (!this.dragging) return;
    this.dragging = false;
    this.velocity = this.lastDragVel * MOMENTUM_BLEND;
    this.clampVelocity();
    this.lastDragTime = 0;
  }

  /** Immediate finger follow; velocity tracked for release coast. */
  drag(dx: number): void {
    const now = performance.now() * 0.001;
    const dt = this.lastDragTime > 0
      ? Math.min(0.05, now - this.lastDragTime)
      : 1 / 60;
    this.lastDragTime = now;

    const delta = dx * DRAG_SENS;
    this.angle += delta;

    const instantVel = delta / dt;
    const blend = Math.min(1, VELOCITY_SMOOTH * dt);
    this.lastDragVel += (instantVel - this.lastDragVel) * blend;
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
    if (this.dragging) return;
    this.angle += this.velocity * dt;
    this.velocity *= Math.exp(-FRICTION * dt);
    if (Math.abs(this.velocity) < STOP_THRESHOLD) this.velocity = 0;
  }

  reset(): void {
    this.angle = 0;
    this.velocity = 0;
    this.lastDragVel = 0;
    this.lastDragTime = 0;
    this.dragging = false;
  }

  private clampVelocity(): void {
    if (this.velocity > MAX_VELOCITY) this.velocity = MAX_VELOCITY;
    if (this.velocity < -MAX_VELOCITY) this.velocity = -MAX_VELOCITY;
  }
}
