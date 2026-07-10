import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  BALL_CONTACT_ANGLE, BALL_CONTACT_R, BALL_R, H, PILLAR_R, THEME, W,
} from './constants';
import {
  BallTrail, BokehField, LandingSplats, ParticleSystem, SmashShards, SpeedLines,
} from './effects';
import { breakAnimScale } from './physics';
import {
  createPlatformGeometry, makeGradientBackground, makePlatformMaterial,
  platformArc, ringColor,
} from './geometry';
import { ringWorldY } from './towerGenerator';
import type { BallState, Ring } from './types';
import type { BallSkin } from './skins';
import { CameraController } from './camera';

interface RingVisual {
  ringId: number;
  safeKey: string;
  dangerKey: string;
  group: THREE.Group;
  safeMesh: THREE.Mesh;
  safeMat: THREE.MeshStandardMaterial;
  dangerMesh: THREE.Mesh;
  dangerMat: THREE.MeshStandardMaterial;
}

const USE_BLOOM = typeof window !== 'undefined'
  && window.devicePixelRatio <= 2
  && !(/Android.*Chrome\/[.0-9]* Mobile/i.test(navigator.userAgent) === false);

export class HelixWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly cameraCtrl: CameraController;
  readonly particles: ParticleSystem;
  readonly shards: SmashShards;
  readonly trail: BallTrail;
  readonly splats: LandingSplats;
  readonly speedLines: SpeedLines;
  readonly bokeh: BokehField;

  private readonly helix = new THREE.Group();
  private readonly tower = new THREE.Group();
  private readonly ballRig = new THREE.Group();
  private readonly ball: THREE.Mesh;
  private readonly ballOutline: THREE.Mesh;
  private readonly ballMat: THREE.MeshStandardMaterial;
  private readonly ballGlow: THREE.PointLight;
  private readonly pillar: THREE.Mesh;
  private readonly ringPool: RingVisual[] = [];
  private readonly freeRings: RingVisual[] = [];
  private feverLight = 0;
  private flashMesh: THREE.Mesh | null = null;
  private flashOpacity = 0;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(W, H, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = makeGradientBackground();
    this.scene.fog = new THREE.Fog(0xe8d4ff, 32, 82);

    this.cameraCtrl = new CameraController(W / H);

    const amb = new THREE.AmbientLight(0xffffff, 0.68);
    this.scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xb8e4ff, 0xffd6ec, 0.58);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff8f0, 1.2);
    sun.position.set(6, 14, 10);
    sun.castShadow = true;
    const shadowRes = dpr > 1.5 ? 512 : 1024;
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc8e8ff, 0.38);
    fill.position.set(-8, 6, -6);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd6ec, 0.25);
    rim.position.set(0, 4, -10);
    this.scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 48),
      new THREE.MeshStandardMaterial({
        color: 0xf0e8ff,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.35,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(PILLAR_R * 1.04, PILLAR_R, 200, 28),
      new THREE.MeshStandardMaterial({
        color: THEME.pillar,
        roughness: 0.24,
        metalness: 0.14,
        emissive: 0x8888aa,
        emissiveIntensity: 0.06,
      }),
    );
    this.pillar.castShadow = true;
    this.pillar.receiveShadow = true;
    this.helix.add(this.pillar);
    this.helix.add(this.tower);
    this.scene.add(this.helix);

    this.ballRig.position.set(
      Math.cos(BALL_CONTACT_ANGLE) * BALL_CONTACT_R,
      0,
      Math.sin(BALL_CONTACT_ANGLE) * BALL_CONTACT_R,
    );
    this.scene.add(this.ballRig);

    const ballGeo = new THREE.SphereGeometry(BALL_R, 32, 32);
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xff5c8a,
      roughness: 0.16,
      metalness: 0.18,
      emissive: 0x441133,
      emissiveIntensity: 0.35,
    });
    this.ball = new THREE.Mesh(ballGeo, this.ballMat);
    this.ball.castShadow = true;
    this.ball.renderOrder = 20;
    this.ball.position.z = 0.14;
    this.ballRig.add(this.ball);

    this.ballOutline = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R * 1.12, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x2a2a44,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.35,
      }),
    );
    this.ballOutline.renderOrder = 19;
    this.ballOutline.position.z = 0.14;
    this.ballRig.add(this.ballOutline);

    this.ballGlow = new THREE.PointLight(0xffffff, 1.1, 8);
    this.ballGlow.position.z = 0.2;
    this.ball.add(this.ballGlow);

    this.bokeh = new BokehField(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.shards = new SmashShards(this.scene);
    this.trail = new BallTrail();
    this.ballRig.add(this.trail.group);
    this.speedLines = new SpeedLines(this.ballRig);
    this.splats = new LandingSplats();

    const flashGeo = new THREE.PlaneGeometry(40, 60);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    this.flashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.flashMesh.position.set(0, 0, 8);
    this.flashMesh.renderOrder = 999;
    this.scene.add(this.flashMesh);

    if (USE_BLOOM) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.cameraCtrl.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.28, 0.45, 0.72);
      this.composer.addPass(this.bloomPass);
    }

    for (let i = 0; i < 28; i++) this.freeRings.push(this.createRingVisual());
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(W, H, false);
    this.cameraCtrl.resize(W / H);
    this.composer?.setSize(W, H);
  }

  private createRingVisual(): RingVisual {
    const safeGeo = createPlatformGeometry(0, Math.PI * 1.6);
    const safeCol = ringColor(0, false);
    const safeMat = makePlatformMaterial(safeCol, false);
    const safeMesh = new THREE.Mesh(safeGeo, safeMat);
    safeMesh.castShadow = true;
    safeMesh.receiveShadow = true;

    const dangerGeo = createPlatformGeometry(0, 0.5);
    const dangerCol = ringColor(-1, true);
    const dangerMat = makePlatformMaterial(dangerCol, true);
    const dangerMesh = new THREE.Mesh(dangerGeo, dangerMat);
    dangerMesh.castShadow = true;
    dangerMesh.receiveShadow = true;
    dangerMesh.position.y = 0.015;
    dangerMesh.visible = false;

    const group = new THREE.Group();
    group.add(safeMesh);
    group.add(dangerMesh);

    return {
      ringId: -1,
      safeKey: '',
      dangerKey: '',
      group,
      safeMesh,
      safeMat,
      dangerMesh,
      dangerMat,
    };
  }

  syncRings(rings: Ring[], _gapArc: number, ballY: number, time: number): void {
    const activeIds = new Set(rings.filter((r) => !r.broken || r.breakAnim < 1).map((r) => r.id));

    for (let i = this.ringPool.length - 1; i >= 0; i--) {
      const rv = this.ringPool[i];
      if (!activeIds.has(rv.ringId)) {
        this.tower.remove(rv.group);
        this.freeRings.push(rv);
        this.ringPool.splice(i, 1);
      }
    }

    for (const ring of rings) {
      if (ring.broken && ring.breakAnim >= 1) continue;
      let rv = this.ringPool.find((r) => r.ringId === ring.id);
      if (!rv) {
        rv = this.freeRings.pop() ?? this.createRingVisual();
        rv.ringId = ring.id;
        this.ringPool.push(rv);
        this.tower.add(rv.group);
      }

      const solid = platformArc(ring.gapArc);
      const safeStart = ring.gapStart + ring.gapArc;
      const safeKey = `${safeStart.toFixed(3)}_${solid.toFixed(3)}`;
      if (rv.safeKey !== safeKey) {
        rv.safeKey = safeKey;
        rv.safeMesh.geometry = createPlatformGeometry(safeStart, solid);
      }

      const safeCol = ringColor(ring.colorIndex, false);
      rv.safeMat.color.copy(safeCol);
      rv.safeMat.emissive.copy(safeCol).multiplyScalar(0.12);
      rv.safeMat.emissiveIntensity = 0.25;

      if (ring.dangerArc > 0) {
        const dKey = `${ring.dangerStart.toFixed(3)}_${ring.dangerArc.toFixed(3)}`;
        if (rv.dangerKey !== dKey) {
          rv.dangerKey = dKey;
          rv.dangerMesh.geometry = createPlatformGeometry(ring.dangerStart, ring.dangerArc);
        }
        const dangerCol = ringColor(-1, true);
        rv.dangerMat.color.copy(dangerCol);
        rv.dangerMat.emissive.set(THEME.dangerDark);
        rv.dangerMat.emissiveIntensity = 0.4;
        rv.dangerMesh.visible = true;
      } else {
        rv.dangerKey = '';
        rv.dangerMesh.visible = false;
      }

      rv.group.position.y = ballY - ringWorldY(ring, time);
      if (ring.broken) {
        const scale = breakAnimScale(ring.breakAnim);
        rv.group.scale.setScalar(scale);
        const fade = 1 - ring.breakAnim * 0.85;
        rv.safeMat.opacity = fade;
        rv.safeMat.transparent = true;
        rv.dangerMat.opacity = fade;
        rv.dangerMat.transparent = true;
      } else {
        rv.group.scale.setScalar(1);
        rv.safeMat.opacity = 1;
        rv.safeMat.transparent = false;
        rv.dangerMat.opacity = 1;
        rv.dangerMat.transparent = false;
      }
    }
  }

  updateBall(ball: BallState, skin: BallSkin, fever: boolean, dt: number, combo = 0): void {
    this.ballRig.position.y = 0;
    this.ball.position.set(0, 0, 0.14);
    this.ballOutline.position.set(0, 0, 0.14);
    const sy = ball.squash;
    const stretch = 1 - sy;
    const sx = 1 - stretch * 0.14;
    const syScale = 1 + stretch * 0.22;
    this.ball.scale.set(sx, syScale, sx);
    this.ballOutline.scale.set(sx * 1.12, syScale * 1.12, sx * 1.12);

    this.ballMat.color.set(skin.color);
    if (fever) {
      this.feverLight = Math.min(1, this.feverLight + dt * 3);
      this.ballMat.emissive.set(THEME.fever);
      this.ballMat.emissiveIntensity = 0.7 + Math.sin(performance.now() * 0.014) * 0.18;
      this.ballGlow.color.set(THEME.fever);
      this.ballGlow.intensity = 2.1;
      if (this.bloomPass) this.bloomPass.strength = 0.42;
    } else {
      this.feverLight = Math.max(0, this.feverLight - dt * 4);
      this.ballMat.emissive.set(0x442244);
      this.ballMat.emissiveIntensity = 0.3;
      this.ballGlow.color.set(skin.color);
      this.ballGlow.intensity = 1;
      if (this.bloomPass) this.bloomPass.strength = 0.28;
    }

    this.pillar.position.y = 0;
    this.trail.push(Math.abs(ball.vy), skin.color, combo, fever);
    this.speedLines.setIntensity(combo, fever);
  }

  addLandingSplat(ringId: number, color: string, towerAngle: number): void {
    const rv = this.ringPool.find((r) => r.ringId === ringId);
    if (!rv) return;
    this.splats.place(rv.group, color, towerAngle + BALL_CONTACT_ANGLE);
  }

  ringOffset(ballY: number, ringY: number): number {
    return ballY - ringY;
  }

  setTowerAngle(angle: number): void {
    this.helix.rotation.y = -angle;
  }

  flash(color: string, amount: number): void {
    if (!this.flashMesh) return;
    (this.flashMesh.material as THREE.MeshBasicMaterial).color.set(color);
    this.flashOpacity = Math.max(this.flashOpacity, amount);
  }

  updateEffects(dt: number): void {
    this.particles.beginFrame();
    this.particles.update(dt);
    this.shards.update(dt);
    this.trail.update(dt);
    this.speedLines.update(dt);
    this.splats.update(dt);
    this.bokeh.update(dt);

    if (this.flashMesh && this.flashOpacity > 0) {
      this.flashOpacity = Math.max(0, this.flashOpacity - dt * 2.8);
      (this.flashMesh.material as THREE.MeshBasicMaterial).opacity = this.flashOpacity * 0.45;
    }
  }

  render(): void {
    this.cameraCtrl.applyView(this.ballRig.position);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.cameraCtrl.camera);
  }

  clear(): void {
    this.particles.clear();
    this.shards.clear();
    this.trail.clear();
    this.speedLines.clear();
    this.splats.clear();
    for (const rv of this.ringPool) {
      this.tower.remove(rv.group);
      this.freeRings.push(rv);
    }
    this.ringPool.length = 0;
    this.feverLight = 0;
    this.flashOpacity = 0;
  }

  dispose(): void {
    this.renderer.dispose();
    this.composer?.dispose();
    this.clear();
  }
}
