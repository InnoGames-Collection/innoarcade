// DOM confetti for game-over celebrations — presentation only.

const COLORS = ['#4f9e16', '#56b8e8', '#ffd700', '#ffffff', '#6cc52f', '#1f74e0'];

export function spawnConfetti(container: HTMLElement, count = 40): void {
  const rect = container.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'sh-confetti';
    p.style.left = `${rect.width * 0.1 + Math.random() * rect.width * 0.8}px`;
    p.style.top = `${-10 - Math.random() * 30}px`;
    p.style.background = COLORS[i % COLORS.length];
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    if (Math.random() > 0.5) p.classList.add('sh-confetti--rect');
    container.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}
