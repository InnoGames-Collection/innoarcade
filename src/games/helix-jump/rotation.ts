/** Finger-tracking tower rotation with inertia and friction. */

const DRAG_DIRECT = 0.0094;
const DRAG_MOMENTUM = 0.38;
const TAP_IMPULSE = Math.PI / 3.4;
const SWIPE_IMPULSE = Math.PI / 5;
const FRICTION = 3.8;
const MAX_VELOCITY = 14;

export class RotationController {
  angle = 0;
  private velocity = 0;
  private dragging = false;

  setDragging(active: boolean): void {
    this.dragging = active;
    if (!active) return;
    this.velocity *= 0.35;
  }

  /** Immediate 1:1 finger follow plus momentum for release coast. */
  drag(dx: number): void {
    const delta = dx * DRAG_DIRECT;
    this.angle += delta;
    this.velocity = delta * 48 * DRAG_MOMENTUM;
    if (this.velocity > MAX_VELOCITY) this.velocity = MAX_VELOCITY;
    if (this.velocity < -MAX_VELOCITY) this.velocity = -MAX_VELOCITY;
  }

  tap(): void {
    this.velocity += TAP_IMPULSE;
  }

  swipeLeft(): void {
    this.velocity -= SWIPE_IMPULSE;
  }

  swipeRight(): void {
    this.velocity += SWIPE_IMPULSE;
  }

  update(dt: number): void {
    if (!this.dragging) {
      this.angle += this.velocity * dt;
      this.velocity *= Math.exp(-FRICTION * dt);
      if (Math.abs(this.velocity) < 0.02) this.velocity = 0;
    }
  }

  reset(): void {
    this.angle = 0;
    this.velocity = 0;
    this.dragging = false;
  }
}
