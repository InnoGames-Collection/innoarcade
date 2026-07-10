import * as THREE from 'three';
import {
  BALL_CONTACT_R, RING_INNER, RING_R, THEME,
} from './constants';
import { createWedgeGeometry } from './geometry';
import { easeOutQuad } from './easing';

const POOL = 140;
const SHARD_POOL = 56;
const SPLAT_POOL = 24;

interface Particle {
  active: boolean;
  life: number;
  maxLife: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: THREE.Color;
}

export class ParticleSystem {
  private readonly points: THREE.Points;
  private readonly pool: Particle[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private spawnBudget = 40;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(POOL * 3);
    this.colors = new Float32Array(POOL * 3);
    this.sizes = new Float32Array(POOL);

    for (let i = 0; i < POOL; i++) {
      this.pool.push({
        active: false, life: 0, maxLife: 1,
        px: 0, py: 0, pz: 0,
        vx: 0, vy: 0, vz: 0, size: 0.08,
        color: new THREE.Color(),
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  beginFrame(): void {
    this.spawnBudget = 40;
  }

  private spawn(
    x: number, y: number, z: number,
    color: THREE.Color,
    vx: number, vy: number, vz: number,
    size: number, life: number,
  ): boolean {
    if (this.spawnBudget <= 0) return false;
    for (const p of this.pool) {
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = life;
      p.px = x; p.py = y; p.pz = z;
      p.vx = vx; p.vy = vy; p.vz = vz;
      p.size = size;
      p.color.copy(color);
      this.spawnBudget--;
      return true;
    }
    return false;
  }

  burst(x: number, y: number, z: number, color: string | number, count = 14, spread = 5): void {
    const c = new THREE.Color(color);
    let spawned = 0;
    for (let i = 0; i < count && spawned < count; i++) {
      const a = (Math.PI * 2 * spawned) / count + Math.random() * 0.5;
      const sp = spread * (0.3 + Math.random() * 0.7);
      if (this.spawn(
        x, y, z, c,
        Math.cos(a) * sp,
        Math.random() * sp * 0.6 + 1.5,
        Math.sin(a) * sp * 0.35,
        0.06 + Math.random() * 0.1,
        0.35 + Math.random() * 0.35,
      )) spawned++;
    }
    this.syncBuffers();
  }

  emitLanding(x: number, y: number, z: number, color: string, impact: number): void {
    const c = new THREE.Color(color);
    const dustC = new THREE.Color('#e8e0f0');
    const n = 6 + Math.floor(impact / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 2.5;
      this.spawn(x, y, z, dustC, Math.cos(a) * sp, Math.random() * 1.2, Math.sin(a) * sp * 0.4, 0.05, 0.4);
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, y, z, c, Math.cos(a) * 2, 2.5 + Math.random(), Math.sin(a) * 1.2, 0.08, 0.28);
    }
    this.syncBuffers();
  }

  emitBreakDust(x: number, y: number, z: number, color: string, count = 10): void {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      this.spawn(x, y, z, c, Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp * 0.5, 0.07, 0.45);
    }
    this.syncBuffers();
  }

  emitComboFire(x: number, y: number, z: number, mult: number): void {
    const fire = new THREE.Color(THEME.fever);
    const n = 6 + mult * 2;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, y, z, fire, Math.cos(a) * 3, 2 + Math.random() * 4, Math.sin(a) * 2, 0.1, 0.35);
    }
    this.syncBuffers();
  }

  comboBurst(x: number, y: number, z: number, mult: number): void {
    const hue = (mult * 0.12) % 1;
    const col = new THREE.Color().setHSL(hue, 0.85, 0.62);
    this.burst(x, y, z, col.getHex(), 8 + mult * 2, 4 + mult * 0.6);
    this.emitComboFire(x, y, z, mult);
  }

  feverRing(x: number, y: number, z: number): void {
    this.burst(x, y, z, THEME.fever, 28, 8);
  }

  landing(x: number, y: number, z: number, color: string, impact = 8): void {
    this.emitLanding(x, y, z, color, impact);
  }

  confetti(x: number, y: number, z: number): void {
    const cols = ['#ff5c8a', '#00d4ff', '#ffd93d', '#7cff6b', '#ff8c42'];
    for (let i = 0; i < cols.length; i++) {
      this.burst(x, y + i * 0.2, z, cols[i], 16, 8);
    }
  }

  private syncBuffers(): void {
    let idx = 0;
    for (const p of this.pool) {
      if (!p.active) continue;
      this.positions[idx * 3] = p.px;
      this.positions[idx * 3 + 1] = p.py;
      this.positions[idx * 3 + 2] = p.pz;
      this.colors[idx * 3] = p.color.r;
      this.colors[idx * 3 + 1] = p.color.g;
      this.colors[idx * 3 + 2] = p.color.b;
      this.sizes[idx] = p.size;
      idx++;
    }
    for (let i = idx; i < POOL; i++) this.sizes[i] = 0;
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    (this.points.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number): void {
    let idx = 0;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      const t = 1 - p.life / p.maxLife;
      p.px += p.vx * dt;
      p.py += p.vy * dt;
      p.pz += p.vz * dt;
      p.vy -= 12 * dt;
      this.positions[idx * 3] = p.px;
      this.positions[idx * 3 + 1] = p.py;
      this.positions[idx * 3 + 2] = p.pz;
      this.colors[idx * 3] = p.color.r;
      this.colors[idx * 3 + 1] = p.color.g;
      this.colors[idx * 3 + 2] = p.color.b;
      this.sizes[idx] = p.size * t;
      idx++;
    }
    for (let i = idx; i < POOL; i++) this.sizes[i] = 0;
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    (this.points.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
    this.sizes.fill(0);
    (this.points.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }
}

interface Shard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotV: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class SmashShards {
  private readonly group = new THREE.Group();
  private readonly pool: Shard[] = [];
  private readonly wedgeGeos: THREE.BufferGeometry[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < 6; i++) {
      this.wedgeGeos.push(createWedgeGeometry(0.22 + i * 0.08, i * 0.4));
    }

    for (let i = 0; i < SHARD_POOL; i++) {
      const geo = this.wedgeGeos[i % this.wedgeGeos.length];
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({
        mesh, vx: 0, vy: 0, vz: 0,
        rotV: new THREE.Vector3(),
        life: 0, maxLife: 1,
      });
    }
  }

  burst(
    relY: number,
    color: string,
    towerAngle: number,
    count = 14,
    contactAngle?: number,
  ): void {
    const c = new THREE.Color(color);
    const span = RING_R - RING_INNER;
    const origin = contactAngle ?? towerAngle + Math.PI / 2;
    let spawned = 0;
    for (const s of this.pool) {
      if (s.life > 0 && s.life < s.maxLife) continue;
      const angle = origin + (spawned / count - 0.5) * 1.2 + (Math.random() - 0.5) * 0.5;
      const dist = RING_INNER + span * (0.2 + Math.random() * 0.75);
      s.mesh.position.set(
        Math.cos(angle) * dist,
        relY + (Math.random() - 0.5) * 0.12,
        Math.sin(angle) * dist,
      );
      s.mesh.rotation.set(Math.random() * Math.PI, angle, Math.random() * 0.4);
      const outward = 3 + Math.random() * 5;
      s.vx = Math.cos(angle) * outward;
      s.vy = 2 + Math.random() * 5;
      s.vz = Math.sin(angle) * outward * 0.85;
      s.rotV.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
      );
      s.life = 0.001;
      s.maxLife = 0.55 + Math.random() * 0.4;
      (s.mesh.material as THREE.MeshStandardMaterial).color.copy(c);
      s.mesh.scale.setScalar(0.65 + Math.random() * 0.75);
      s.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  update(dt: number): void {
    for (const s of this.pool) {
      if (s.life <= 0) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.mesh.visible = false;
        s.life = 0;
        continue;
      }
      const t = 1 - s.life / s.maxLife;
      const scale = easeOutQuad(t);
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.vy -= 18 * dt;
      s.vx *= 0.98;
      s.vz *= 0.98;
      s.mesh.rotation.x += s.rotV.x * dt;
      s.mesh.rotation.y += s.rotV.y * dt;
      s.mesh.rotation.z += s.rotV.z * dt;
      s.mesh.scale.setScalar(scale * 0.95);
    }
  }

  clear(): void {
    for (const s of this.pool) {
      s.life = 0;
      s.mesh.visible = false;
    }
  }
}

export class BallTrail {
  readonly group = new THREE.Group();
  private readonly points: THREE.Mesh[] = [];
  private readonly geo = new THREE.SphereGeometry(0.11, 8, 8);
  private head = 0;

  constructor() {
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(this.geo, mat);
      m.visible = false;
      m.renderOrder = 18;
      this.group.add(m);
      this.points.push(m);
    }
  }

  push(speed: number, color: string, combo = 0, fever = false): void {
    const streak = combo >= 2 || fever;
    const minSpeed = fever ? 0.8 : streak ? 1.2 : 2.5;
    if (speed < minSpeed) return;

    const m = this.points[this.head];
    this.head = (this.head + 1) % this.points.length;

    const t = Math.min(1, speed / 16);
    const slot = streak ? (this.head % 7) : 0;
    m.position.set(0, slot * 0.22, 0.12);
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.color.set(fever ? THEME.fever : color);
    mat.opacity = fever
      ? 0.35 + t * 0.45
      : streak ? 0.2 + t * 0.42 : 0.1 + t * 0.25;
    m.scale.setScalar(fever ? 0.55 + t * 0.5 : streak ? 0.5 + t * 0.48 : 0.38 + t * 0.38);
    m.visible = true;
    m.userData.life = 1;
  }

  update(dt: number): void {
    const feverFade = this.points.some((p) => p.visible && (p.material as THREE.MeshBasicMaterial).opacity > 0.35);
    const fade = dt * (feverFade ? 2.8 : 4.2);
    for (const m of this.points) {
      if (!m.visible) continue;
      m.userData.life -= fade;
      if (m.userData.life <= 0) {
        m.visible = false;
        continue;
      }
      (m.material as THREE.MeshBasicMaterial).opacity *= 0.96;
      m.scale.multiplyScalar(0.985);
    }
  }

  clear(): void {
    for (const m of this.points) m.visible = false;
  }
}

export class SpeedLines {
  readonly group = new THREE.Group();
  private readonly lines: THREE.Mesh[] = [];
  private active = 0;

  constructor(parent: THREE.Group) {
    const geo = new THREE.PlaneGeometry(0.04, 0.5);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 17;
      this.group.add(m);
      this.lines.push(m);
    }
    parent.add(this.group);
  }

  setIntensity(combo: number, fever: boolean): void {
    const target = fever ? 8 : combo >= 3 ? Math.min(6, combo - 1) : 0;
    this.active = target;
    for (let i = 0; i < this.lines.length; i++) {
      const m = this.lines[i];
      const on = i < target;
      m.visible = on;
      if (on) {
        const ang = (i / target) * Math.PI * 2;
        m.position.set(Math.cos(ang) * 0.55, (Math.random() - 0.5) * 0.4, Math.sin(ang) * 0.2 + 0.1);
        m.rotation.z = ang;
        (m.material as THREE.MeshBasicMaterial).opacity = fever ? 0.35 : 0.18;
        (m.material as THREE.MeshBasicMaterial).color.set(fever ? THEME.fever : '#ffffff');
      }
    }
  }

  update(dt: number): void {
    if (this.active <= 0) return;
    for (const m of this.lines) {
      if (!m.visible) continue;
      m.position.y -= dt * 2.5;
      if (m.position.y < -0.8) m.position.y = 0.6;
    }
  }

  clear(): void {
    this.active = 0;
    for (const m of this.lines) m.visible = false;
  }
}

interface Splat {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class LandingSplats {
  private readonly pool: Splat[] = [];
  private readonly geo = new THREE.CircleGeometry(0.42, 20);

  constructor() {
    for (let i = 0; i < SPLAT_POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 5;
      this.pool.push({ mesh, life: 0, maxLife: 1 });
    }
  }

  place(parent: THREE.Group, color: string, contactAngle: number): void {
    for (const s of this.pool) {
      if (s.life > 0 && s.life < s.maxLife) continue;
      if (s.mesh.parent && s.mesh.parent !== parent) s.mesh.parent.remove(s.mesh);
      parent.add(s.mesh);
      const jitter = (Math.random() - 0.5) * 0.14;
      s.mesh.position.set(
        Math.cos(contactAngle) * BALL_CONTACT_R + jitter,
        0.04,
        Math.sin(contactAngle) * BALL_CONTACT_R + jitter * 0.6,
      );
      s.mesh.rotation.z = Math.random() * Math.PI * 2;
      const scale = 0.55 + Math.random() * 0.35;
      s.mesh.scale.set(scale, scale, 1);
      (s.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
      s.mesh.visible = true;
      s.life = 0.001;
      s.maxLife = 2.2 + Math.random() * 0.8;
      return;
    }
  }

  update(dt: number): void {
    for (const s of this.pool) {
      if (s.life <= 0) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.mesh.visible = false;
        s.mesh.removeFromParent();
        s.life = 0;
        continue;
      }
      const t = easeOutQuad(1 - s.life / s.maxLife);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * t;
    }
  }

  clear(): void {
    for (const s of this.pool) {
      s.life = 0;
      s.mesh.visible = false;
      s.mesh.removeFromParent();
    }
  }
}

export class BokehField {
  private readonly points: THREE.Points;

  constructor(scene: THREE.Scene) {
    const n = 48;
    const pos = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = -8 - Math.random() * 20;
      sizes[i] = 0.15 + Math.random() * 0.35;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
  }

  update(dt: number): void {
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      y += dt * (0.15 + (i % 5) * 0.04);
      if (y > 18) y = -18;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }
}
