import * as THREE from 'three';
import {
  CAM_FOV, CAM_LOOK_BELOW, CAM_OFFSET, CAM_Y, CAM_Z, H,
} from './constants';

const WORLD_PER_PX = 0.018;

/**
 * Ball-fixed camera: ball stays centered on screen.
 * Vertical scroll is simulated by moving platforms; camera adds smooth follow feel.
 */
export class CameraController {
  y = 0;
  shake = 0;
  private vel = 0;
  private shakeX = 0;
  private shakeY = 0;
  private lookAhead = 0;

  readonly camera: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CAM_FOV, aspect, 0.1, 120);
    this.camera.position.set(0, CAM_Y, CAM_Z);
    this.camera.lookAt(0, 0, 0);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  follow(ballY: number, ballVy: number, dt: number): void {
    const fallLead = ballVy > 1.5
      ? Math.min(2.6, ballVy * 0.07)
      : 0;
    const riseLag = ballVy < -2
      ? Math.max(-1.0, ballVy * 0.03)
      : 0;
    const targetLead = fallLead + riseLag;
    this.lookAhead += (targetLead - this.lookAhead) * Math.min(1, dt * 12);

    const target = ballY - H * CAM_OFFSET * WORLD_PER_PX + this.lookAhead;
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

  applyView(ballOffset = new THREE.Vector3()): void {
    const scrollY = -this.y * 0.035;
    this.camera.position.set(
      ballOffset.x + this.shakeX,
      CAM_Y + this.shakeY + scrollY * 0.12,
      CAM_Z,
    );
    this.camera.lookAt(
      ballOffset.x + this.shakeX * 0.2,
      ballOffset.y - CAM_LOOK_BELOW + scrollY * 0.08,
      ballOffset.z,
    );
  }

  reset(): void {
    this.y = 0;
    this.vel = 0;
    this.lookAhead = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  snapTo(ballY: number): void {
    this.y = ballY - H * CAM_OFFSET * WORLD_PER_PX;
    this.vel = 0;
    this.lookAhead = 0;
  }
}
