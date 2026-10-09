import { LOW_POWER_DEVICE } from "./device.js";

const PARTICLES_PER_BURST = LOW_POWER_DEVICE ? 10 : 14;
const AUTO_BURSTS = LOW_POWER_DEVICE ? 3 : 6;
const MAX_PIXEL_RATIO = 3;
// clicks on these never launch fireworks
const INTERACTIVE_SELECTOR =
  "input, textarea, select, a, button, dialog, label, .shortcut, .toast";

let canvas = null;
let ctx = null;
let colors = [];
let bursts = [];
let frameId = null;
let autoTimerId = null;
let autoBurstsLeft = 0;
let userHasClicked = false;
let isBlocked = () => false;

function randomInt(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createParticle(x, y) {
  const angle = (randomInt(0, 360) * Math.PI) / 180;
  const distance = randomInt(50, 150) * (Math.random() < 0.5 ? -1 : 1);
  return {
    startX: x,
    startY: y,
    endX: x + distance * Math.cos(angle),
    endY: y + distance * Math.sin(angle),
    startRadius: randomInt(8, 24),
    color: colors[randomInt(0, colors.length - 1)],
  };
}

// one loop draws every burst so overlapping bursts don't erase each other
function drawFrame(now) {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  bursts = bursts.filter((burst) => {
    const progress = Math.min(1, (now - burst.start) / burst.duration);
    const eased = easeOutExpo(progress);

    burst.particles.forEach((particle) => {
      const x = particle.startX + (particle.endX - particle.startX) * eased;
      const y = particle.startY + (particle.endY - particle.startY) * eased;
      const radius =
        particle.startRadius + (0.1 - particle.startRadius) * eased;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = particle.color;
      ctx.fill();
    });

    return progress < 1;
  });

  frameId = bursts.length ? requestAnimationFrame(drawFrame) : null;
}

function launchBurst(x, y) {
  bursts.push({
    start: performance.now(),
    duration: randomInt(1200, 1800),
    particles: Array.from({ length: PARTICLES_PER_BURST }, () =>
      createParticle(x, y),
    ),
  });
  if (frameId === null) frameId = requestAnimationFrame(drawFrame);
}

function handlePointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  if (event.target.closest?.(INTERACTIVE_SELECTOR) || isBlocked()) return;
  userHasClicked = true;
  launchBurst(event.clientX, event.clientY);
}

function autoBurst() {
  if (userHasClicked || autoBurstsLeft <= 0 || isBlocked()) return;
  autoBurstsLeft -= 1;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  launchBurst(
    randomInt(centerX - 150, centerX + 150),
    randomInt(centerY - 150, centerY + 150),
  );
  autoTimerId = setTimeout(autoBurst, randomInt(1800, 3200));
}

export function startFireworks(
  canvasElement,
  burstColors,
  { blocked = () => false } = {},
) {
  stopFireworks();

  canvas = canvasElement;
  ctx = canvas.getContext("2d");
  colors = burstColors;
  isBlocked = blocked;
  autoBurstsLeft = AUTO_BURSTS;

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("pointerdown", handlePointerDown);
  autoBurst();
}

export function stopFireworks() {
  clearTimeout(autoTimerId);
  autoTimerId = null;
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  bursts = [];

  window.removeEventListener("resize", resizeCanvas);
  document.removeEventListener("pointerdown", handlePointerDown);

  if (canvas && ctx) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}
