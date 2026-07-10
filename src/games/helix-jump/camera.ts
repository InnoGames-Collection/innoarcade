import * as THREE from 'three';
import {
  CAM_FOV, CAM_LOOK_BELOW, CAM_OFFSET, CAM_Y, CAM_Z, COMBO_CAP, H,
} from './constants';
import { spring } from './easing';

const WORLD_PER_PX = 0.018;

export class CameraController {
  y = 0;
  shake = 0;
  private vel = 0;
  private shakeX = 0;
  private shakeY = 0;
  private lookAhead = 0;
  private fov = CAM_FOV;
  private fovVel = 0;
  private impactPunch = 0;
  private zoomCombo = 0;

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

  follow(ballY: number, ballVy: number, combo: number, fever: boolean, dt: number): void {
    const fallLead = ballVy > 1.5 ? Math.min(2.8, ballVy * 0.075) : 0;
    const riseLag = ballVy < -2 ? Math.max(-1.0, ballVy * 0.03) : 0;
    const targetLead = fallLead + riseLag;
    this.lookAhead += (targetLead - this.lookAhead) * Math.min(1, dt * 12);

    const target = ballY - H * CAM_OFFSET * WORLD_PER_PX + this.lookAhead;
    const scroll = spring(this.y, target, this.vel, 32, 10, dt);
    this.y = scroll.value;
    this.vel = scroll.velocity;

    const comboT = Math.min(COMBO_CAP, combo);
    const targetZoom = fever ? 5.5 : comboT > 1 ? comboT * 0.55 : 0;
    this.zoomCombo += (targetZoom - this.zoomCombo) * Math.min(1, dt * 8);

    const targetFov = CAM_FOV - this.zoomCombo;
    const fovSpring = spring(this.fov, targetFov, this.fovVel, 28, 9, dt);
    this.fov = fovSpring.value;
    this.fovVel = fovSpring.velocity;
    if (Math.abs(this.camera.fov - this.fov) > 0.02) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  addImpactPunch(amount: number): void {
    this.impactPunch = Math.max(this.impactPunch, amount);
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 9);
    this.impactPunch = Math.max(0, this.impactPunch - dt * 7);
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
    const punch = this.impactPunch * 0.35;
    this.camera.position.set(
      ballOffset.x + this.shakeX,
      CAM_Y + this.shakeY + scrollY * 0.12 + punch,
      CAM_Z - this.zoomCombo * 0.04,
    );
    this.camera.lookAt(
      ballOffset.x + this.shakeX * 0.2,
      ballOffset.y - CAM_LOOK_BELOW - punch * 0.5 + scrollY * 0.08,
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
    this.fov = CAM_FOV;
    this.fovVel = 0;
    this.impactPunch = 0;
    this.zoomCombo = 0;
    this.camera.fov = CAM_FOV;
    this.camera.updateProjectionMatrix();
  }

  snapTo(ballY: number): void {
    this.y = ballY - H * CAM_OFFSET * WORLD_PER_PX;
    this.vel = 0;
    this.lookAhead = 0;
  }
}
