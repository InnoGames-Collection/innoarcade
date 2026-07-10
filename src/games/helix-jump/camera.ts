import * as THREE from 'three';
import {
  BALL_CONTACT_ANGLE, BALL_CONTACT_R, CAM_FOV, CAM_LOOK_BELOW, CAM_Y, CAM_Z, COMBO_CAP,
} from './constants';
import { spring } from './easing';

export class CameraController {
  shake = 0;
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

  /** Ball is screen-fixed — camera only reacts to velocity, combo, fever. */
  follow(ballVy: number, combo: number, fever: boolean, dt: number): void {
    const fallLead = ballVy > 2 ? Math.min(0.35, ballVy * 0.012) : 0;
    const riseLag = ballVy < -3 ? Math.max(-0.2, ballVy * 0.006) : 0;
    const targetLead = fallLead + riseLag;
    this.lookAhead += (targetLead - this.lookAhead) * Math.min(1, dt * 10);

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

  applyView(): void {
    const bx = Math.cos(BALL_CONTACT_ANGLE) * BALL_CONTACT_R;
    const bz = Math.sin(BALL_CONTACT_ANGLE) * BALL_CONTACT_R;
    const punch = this.impactPunch * 0.35;

    this.camera.position.set(
      bx + this.shakeX,
      CAM_Y + this.shakeY + punch,
      CAM_Z - this.zoomCombo * 0.04,
    );
    this.camera.lookAt(
      bx + this.shakeX * 0.15,
      -CAM_LOOK_BELOW + this.lookAhead - punch * 0.4,
      bz,
    );
  }

  reset(): void {
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

  snapTo(): void {
    this.lookAhead = 0;
  }
}
