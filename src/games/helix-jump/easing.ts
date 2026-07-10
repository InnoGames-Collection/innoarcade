/** Shared easing — no linear animations. */

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) ** 3;
}

export function easeOutBack(t: number): number {
  const x = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export function easeOutQuad(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) * (1 - x);
}

export function spring(
  current: number,
  target: number,
  vel: number,
  stiffness: number,
  damping: number,
  dt: number,
): { value: number; velocity: number } {
  const diff = target - current;
  const v = vel + (diff * stiffness - vel * damping) * dt;
  return { value: current + v * dt, velocity: v };
}

export function expDecay(current: number, dt: number, rate: number): number {
  return current * Math.exp(-rate * dt);
}
