// Small celebration when a step is done: a quick dopamine hit is the point.

const EMOJI = ['🎉', '✨', '💸', '⭐', '🙌'];

export function celebrate(x = window.innerWidth / 2, y = window.innerHeight / 2) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 14; i += 1) {
    const el = document.createElement('span');
    el.className = 'burst';
    el.textContent = EMOJI[i % EMOJI.length];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const angle = (Math.PI * 2 * i) / 14;
    const dist = 80 + Math.random() * 90;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist - 40}px`);
    el.style.setProperty('--r', `${Math.random() * 120 - 60}deg`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
}
