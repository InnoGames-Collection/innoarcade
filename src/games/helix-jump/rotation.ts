/**
 * Tower rotation — tap snaps a fixed step; drag is 1:1.
 */

const DRAG_SENS = 0.011;
const MOMENTUM_BLEND = 0.35;
const VELOCITY_SMOOTH = 14;
/** ~26° per tap — fine enough to line up gaps (reference drag/tap). */
const TAP_STEP = Math.PI / 7;
const SWIPE_STEP = Math.PI / 8;
const FRICTION = 11;
const MAX_VELOCITY = 2.4;
const STOP_THRESHOLD = 0.01;

export class RotationController {
  angle = 0;
  private velocity = 0;
  private dragging = false;
  private lastDragVel = 0;
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

  tickDrag(dt: number): void {
    if (!this.dragging || this.pendingDx === 0) return;

    const delta = this.pendingDx * DRAG_SENS;
    this.pendingDx = 0;
    this.angle += delta;

    const instantVel = dt > 0.0001 ? delta / dt : 0;
    const blend = Math.min(1, VELOCITY_SMOOTH * dt);
    this.lastDragVel += (instantVel - this.lastDragVel) * blend;
  }

  tap(): void {
    this.angle += TAP_STEP;
    this.velocity *= 0.35;
  }

  swipeLeft(): void {
    this.angle -= SWIPE_STEP;
    this.velocity *= 0.35;
  }

  swipeRight(): void {
    this.angle += SWIPE_STEP;
    this.velocity *= 0.35;
  }

  update(dt: number): void {
    this.tickDrag(dt);
    if (!this.dragging) {
      this.angle += this.velocity * dt;
      this.velocity *= Math.exp(-FRICTION * dt);
      if (Math.abs(this.velocity) < STOP_THRESHOLD) this.velocity = 0;
    }
  }

  reset(): void {
    this.angle = 0;
    this.velocity = 0;
    this.lastDragVel = 0;
    this.pendingDx = 0;
    this.dragging = false;
  }

  private clampVelocity(): void {
    if (this.velocity > MAX_VELOCITY) this.velocity = MAX_VELOCITY;
    if (this.velocity < -MAX_VELOCITY) this.velocity = -MAX_VELOCITY;
  }
}
