import { CAM_OFFSET, H } from './constants';

export class CameraController {
  y = 0;
  shake = 0;
  private vel = 0;

  follow(ballY: number, ballVy: number, dt: number): void {
    const lookAhead = Math.max(-120, Math.min(80, ballVy * 0.07));
    const target = ballY - H * CAM_OFFSET + lookAhead;
    const stiffness = 32;
    const damping = 10;
    const diff = target - this.y;
    this.vel += (diff * stiffness - this.vel * damping) * dt;
    this.y += this.vel * dt;
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 8.5);
  }

  apply(ctx: CanvasRenderingContext2D): void {
    if (this.shake <= 0) return;
    const s = this.shake * 4.5;
    ctx.translate(s * (Math.random() - 0.5), s * (Math.random() - 0.5));
  }

  reset(): void {
    this.y = 0;
    this.vel = 0;
    this.shake = 0;
  }
}
