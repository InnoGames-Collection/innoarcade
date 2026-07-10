// Chicken hop animation helpers.

export function hopEase(t: number): number {
  return t * t * (3 - 2 * t);
}

export function hopArcHeight(hopProgress: number, peak: number): number {
  if (hopProgress <= 0 || hopProgress >= 1) return 0;
  return Math.sin(hopProgress * Math.PI) * peak;
}

export function hopSquash(hopProgress: number): { sx: number; sy: number } {
  const p = hopProgress;
  let sx = 1;
  let sy = 1;
  if (p < 0.12) {
    const t = p / 0.12;
    sx = 1.16 - t * 0.16;
    sy = 0.84 + t * 0.16;
  } else if (p < 0.88) {
    const t = (p - 0.12) / 0.76;
    sx = 1 - 0.08 * Math.sin(t * Math.PI);
    sy = 1 + 0.14 * Math.sin(t * Math.PI);
  } else {
    const t = (p - 0.88) / 0.12;
    sx = 0.94 + t * 0.06;
    sy = 1.14 - t * 0.14;
  }
  return { sx, sy };
}
