// Premium enemy rendering — soft shadows, rounded shapes, expressive skull.

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: { x: number; y: number; w: number; h: number }[],
  offsetY: number,
  canvasH: number,
  time: number,
): void {
  for (const e of enemies) {
    const y = e.y - offsetY;
    if (y < -50 || y > canvasH + 50) continue;

    const cx = e.x + e.w / 2;
    const bob = Math.sin(time * 5 + e.x) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(40,10,10,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, y + e.h + 2, e.w * 0.4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, bob);

    const body = ctx.createLinearGradient(e.x, y, e.x, y + e.h);
    body.addColorStop(0, '#ff8a8a');
    body.addColorStop(0.5, '#ff6b6b');
    body.addColorStop(1, '#e04545');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(e.x, y, e.w, e.h, 6);
    ctx.fill();

    ctx.strokeStyle = '#b83030';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Skull face
    const fx = cx;
    const fy = y + e.h / 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(fx, fy - 1, e.w * 0.28, e.h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(fx - 4, fy - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(fx + 4, fy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(fx - 3, fy + 4);
    ctx.lineTo(fx - 1, fy + 2);
    ctx.lineTo(fx + 1, fy + 2);
    ctx.lineTo(fx + 3, fy + 4);
    ctx.closePath();
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx - 7, fy - 6);
    ctx.lineTo(fx - 2, fy - 4);
    ctx.moveTo(fx + 7, fy - 6);
    ctx.lineTo(fx + 2, fy - 4);
    ctx.stroke();

    ctx.restore();
  }
}
