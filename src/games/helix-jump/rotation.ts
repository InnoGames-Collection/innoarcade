/** Finger-tracking tower rotation with inertia and friction. */

const DRAG_DIRECT = 0.011;
const DRAG_MOMENTUM = 0.42;
const TAP_IMPULSE = Math.PI / 3.2;
const SWIPE_IMPULSE = Math.PI / 4.8;
const FRICTION = 4.2;
const MAX_VELOCITY = 16;

export class RotationController {
  angle = 0;
  private velocity = 0;
  private dragging = false;

  setDragging(active: boolean): void {
    this.dragging = active;
    if (!active) return;
    this.velocity *= 0.28;
  }

  /** Immediate finger follow plus momentum for release coast. */
  drag(dx: number): void {
    const delta = dx * DRAG_DIRECT;
    this.angle += delta;
    this.velocity = delta * 52 * DRAG_MOMENTUM;
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
      if (Math.abs(this.velocity) < 0.015) this.velocity = 0;
    }
  }

  reset(): void {
    this.angle = 0;
    this.velocity = 0;
    this.dragging = false;
  }
}
