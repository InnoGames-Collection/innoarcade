import * as THREE from 'three';
import { CAM_OFFSET, H } from './constants';

const WORLD_PER_PX = 0.018;

export class CameraController {
  y = 0;
  shake = 0;
  private vel = 0;
  private shakeX = 0;
  private shakeY = 0;

  readonly camera: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 120);
    this.camera.position.set(0, 7.5, 8.5);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  follow(ballY: number, ballVy: number, dt: number): void {
    const lookAhead = Math.max(-2.5, Math.min(1.8, ballVy * 0.05));
    const target = ballY - H * CAM_OFFSET * WORLD_PER_PX + lookAhead;
    const stiffness = 42;
    const damping = 12;
    const diff = target - this.y;
    this.vel += (diff * stiffness - this.vel * damping) * dt;
    this.y += this.vel * dt;
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 9);
    if (this.shake > 0) {
      const s = this.shake * 0.35;
      this.shakeX = s * (Math.random() - 0.5);
      this.shakeY = s * (Math.random() - 0.5);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  applyToBall(ballWorldY: number): void {
    const camY = -this.y + 5.8;
    const targetY = -ballWorldY + 0.4;
    const zoom = 8.5 - Math.min(0.8, Math.abs(this.vel) * 0.05);
    this.camera.position.set(
      this.shakeX,
      camY + this.shakeY,
      zoom,
    );
    this.camera.lookAt(this.shakeX * 0.25, targetY, 0);
  }

  reset(): void {
    this.y = 0;
    this.vel = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  snapTo(ballY: number): void {
    this.y = ballY - H * CAM_OFFSET * WORLD_PER_PX;
    this.vel = 0;
  }
}
