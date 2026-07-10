import * as THREE from 'three';

/** Fixed view — ball stays centered; only the tower scrolls. */
export class CameraController {
  /** Gameplay depth tracker (matches ball.y). */
  y = 0;
  shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  readonly camera: THREE.PerspectiveCamera;

  private static readonly CAM_Y = 5.8;
  private static readonly CAM_Z = 8.5;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 120);
    this.camera.position.set(0, CameraController.CAM_Y, CameraController.CAM_Z);
    this.camera.lookAt(0, 0, 0);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Track ball depth for recycle / death checks only. */
  follow(ballY: number, _ballVy: number, dt: number): void {
    const stiffness = 28;
    const diff = ballY - this.y;
    this.y += diff * Math.min(1, stiffness * dt);
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

  applyView(): void {
    this.camera.position.set(
      this.shakeX,
      CameraController.CAM_Y + this.shakeY,
      CameraController.CAM_Z,
    );
    this.camera.lookAt(this.shakeX * 0.25, 0, 0);
  }

  reset(): void {
    this.y = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  snapTo(ballY: number): void {
    this.y = ballY;
  }
}
