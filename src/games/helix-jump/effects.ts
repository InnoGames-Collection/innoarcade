import * as THREE from 'three';
import {
  BALL_CONTACT_R, RING_INNER, RING_R, THEME,
} from './constants';

const POOL = 120;

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

  burst(x: number, y: number, z: number, color: string | number, count = 14, spread = 5): void {
    const c = new THREE.Color(color);
    let spawned = 0;
    for (const p of this.pool) {
      if (p.active) continue;
      const a = (Math.PI * 2 * spawned) / count + Math.random() * 0.5;
      const sp = spread * (0.3 + Math.random() * 0.7);
      p.active = true;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.35;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.random() * sp * 0.6 + 1.5;
      p.vz = Math.sin(a) * sp * 0.35;
      p.size = 0.06 + Math.random() * 0.1;
      p.color.copy(c);
      p.px = x;
      p.py = y;
      p.pz = z;
      spawned++;
      if (spawned >= count) break;
    }
    this.syncBuffers();
  }

  comboBurst(x: number, y: number, z: number, mult: number): void {
    const hue = (mult * 0.12) % 1;
    const col = new THREE.Color().setHSL(hue, 0.85, 0.62);
    this.burst(x, y, z, col.getHex(), 8 + mult * 2, 4 + mult * 0.6);
  }

  feverRing(x: number, y: number, z: number): void {
    this.burst(x, y, z, THEME.fever, 24, 7);
  }

  landing(x: number, y: number, z: number, color: string): void {
    this.burst(x, y, z, color, 10, 3.5);
  }

  victory(x: number, y: number, z: number): void {
    const cols = ['#ff5c8a', '#00d4ff', '#ffd93d', '#7cff6b'];
    for (let i = 0; i < cols.length; i++) {
      this.burst(x, y + i * 0.3, z, cols[i], 14, 7);
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

const SHARD_POOL = 48;

export class SmashShards {
  private readonly group = new THREE.Group();
  private readonly pool: Shard[] = [];
  private readonly geo: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.geo = new THREE.BoxGeometry(0.18, 0.08, 0.28);
    scene.add(this.group);

    for (let i = 0; i < SHARD_POOL; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
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

  burst(relY: number, color: string, towerAngle: number, count = 14): void {
    const c = new THREE.Color(color);
    const span = RING_R - RING_INNER;
    let spawned = 0;
    for (const s of this.pool) {
      if (s.life > 0 && s.life < s.maxLife) continue;
      const angle = towerAngle + (spawned / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = RING_INNER + span * (0.25 + Math.random() * 0.75);
      s.mesh.position.set(
        Math.cos(angle) * dist,
        relY + (Math.random() - 0.5) * 0.15,
        Math.sin(angle) * dist,
      );
      s.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      s.vx = Math.cos(angle) * (2.5 + Math.random() * 4.5);
      s.vy = 1.5 + Math.random() * 5;
      s.vz = Math.sin(angle) * (2 + Math.random() * 3.5);
      s.rotV.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      );
      s.life = 0.001;
      s.maxLife = 0.5 + Math.random() * 0.35;
      (s.mesh.material as THREE.MeshStandardMaterial).color.copy(c);
      s.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
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
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.vy -= 18 * dt;
      s.mesh.rotation.x += s.rotV.x * dt;
      s.mesh.rotation.y += s.rotV.y * dt;
      s.mesh.rotation.z += s.rotV.z * dt;
      const t = 1 - s.life / s.maxLife;
      s.mesh.scale.setScalar(t * 0.9);
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
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const m = new THREE.Mesh(this.geo, mat);
      m.visible = false;
      m.renderOrder = 18;
      this.group.add(m);
      this.points.push(m);
    }
  }

  push(speed: number, color: string, combo = 0): void {
    const streak = combo >= 2;
    const minSpeed = streak ? 1.2 : 2.5;
    if (speed < minSpeed) return;

    const m = this.points[this.head];
    this.head = (this.head + 1) % this.points.length;

    const t = Math.min(1, speed / 16);
    const slot = streak ? (this.head % 6) : 0;
    m.position.set(0, slot * 0.2, 0.12);
    (m.material as THREE.MeshBasicMaterial).color.set(color);
    (m.material as THREE.MeshBasicMaterial).opacity = streak
      ? 0.2 + t * 0.42
      : 0.1 + t * 0.25;
    m.scale.setScalar(streak ? 0.5 + t * 0.48 : 0.38 + t * 0.38);
    m.visible = true;
    m.userData.life = 1;
  }

  update(dt: number): void {
    const fade = dt * (this.points.some((p) => p.visible && p.position.y > 0) ? 3.2 : 4.5);
    for (const m of this.points) {
      if (!m.visible) continue;
      m.userData.life -= fade;
      if (m.userData.life <= 0) {
        m.visible = false;
        continue;
      }
      (m.material as THREE.MeshBasicMaterial).opacity = m.userData.life * 0.45;
      m.scale.multiplyScalar(0.98);
    }
  }

  clear(): void {
    for (const m of this.points) m.visible = false;
  }
}

interface Splat {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

const SPLAT_POOL = 24;

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
      if (s.mesh.parent && s.mesh.parent !== parent) {
        s.mesh.parent.remove(s.mesh);
      }
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
      const t = 1 - s.life / s.maxLife;
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
