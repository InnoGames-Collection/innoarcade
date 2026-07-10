import * as THREE from 'three';
import { CAM_FOV, CAM_LOOK_Y, CAM_LOOK_Z, CAM_Y, CAM_Z } from './constants';

export class CameraController {
  shake = 0;
  private shakePhase = 0;
  private shakeX = 0;
  private shakeY = 0;

  readonly camera: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CAM_FOV, aspect, 0.1, 120);
    this.camera.position.set(0, CAM_Y, CAM_Z);
    this.camera.lookAt(0, CAM_LOOK_Y, CAM_LOOK_Z);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  follow(_ballVy: number, _combo: number, _fever: boolean, _dt: number): void {
    // Fixed camera — tower scrolls via ring offsets, not view shake/zoom.
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount * 0.2);
  }

  addImpactPunch(_amount: number): void {
    // disabled
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 18);
    if (this.shake > 0.001) {
      this.shakePhase += dt * 20;
      const s = this.shake * 0.1;
      this.shakeX = Math.sin(this.shakePhase * 1.4) * s;
      this.shakeY = Math.cos(this.shakePhase) * s * 0.35;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  applyView(): void {
    this.camera.position.set(this.shakeX, CAM_Y + this.shakeY, CAM_Z);
    this.camera.lookAt(this.shakeX * 0.08, CAM_LOOK_Y, 0);
  }

  reset(): void {
    this.shake = 0;
    this.shakePhase = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.camera.fov = CAM_FOV;
    this.camera.updateProjectionMatrix();
  }

  snapTo(): void {
    // fixed camera
  }
}
