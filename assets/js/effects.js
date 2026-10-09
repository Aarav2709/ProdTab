// weather particles, seasonal decorations and the default space scene

import { LOW_POWER_DEVICE, prefersReducedMotion } from "./device.js";
import { isAnyDialogOpen } from "./dialog.js";
import { startFireworks, stopFireworks } from "./fireworks.js";
import { getHoliday } from "./holidays.js";
import { createSvg } from "./svg.js";
import { getWeatherEffect } from "./weather.js";

const PARTICLE_LOAD_FACTOR = LOW_POWER_DEVICE ? 0.14 : 0.22;

let container = null;
let canvas = null;
let weatherCode = 0;
let paused = false;
let renderedHolidayId = null;

function createParticles(className, count, styleFor) {
  const viewportScale = Math.min(
    1,
    (window.innerWidth * window.innerHeight) / (1920 * 1080),
  );
  const effectiveCount = Math.max(
    1,
    Math.round(count * PARTICLE_LOAD_FACTOR * viewportScale),
  );
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < effectiveCount; i++) {
    const el = document.createElement("div");
    el.className = className;
    Object.assign(el.style, styleFor(i, effectiveCount));
    fragment.appendChild(el);
  }

  container.appendChild(fragment);
}

function addSpaceObjects() {
  const saturn = createSvg({ class: "floating-obj", viewBox: "0 0 100 100" }, [
    ["circle", { cx: "50", cy: "50", r: "20" }],
    [
      "ellipse",
      {
        cx: "50",
        cy: "50",
        rx: "40",
        ry: "10",
        transform: "rotate(-20 50 50)",
      },
    ],
  ]);
  Object.assign(saturn.style, { top: "15%", right: "10%", width: "100px" });

  const star = createSvg({ class: "floating-obj", viewBox: "0 0 50 50" }, [
    [
      "polygon",
      { points: "25,5 30,20 45,20 32,30 37,45 25,35 13,45 18,30 5,20 20,20" },
    ],
  ]);
  Object.assign(star.style, {
    bottom: "20%",
    left: "15%",
    width: "60px",
    animationDelay: "-5s",
  });

  container.append(saturn, star);
}

function addChristmas() {
  createParticles("xmas-light", 25, (i, total) => ({
    left: `${(i / total) * 100}%`,
    animationDelay: `${Math.random() * 2}s`,
  }));

  container.appendChild(
    createSvg({ class: "xmas-tree", viewBox: "0 0 100 120" }, [
      [
        "polygon",
        {
          points: "50,15 20,55 40,55 10,95 90,95 60,55 80,55",
          fill: "var(--accent)",
        },
      ],
      [
        "rect",
        {
          x: "40",
          y: "95",
          width: "20",
          height: "25",
          fill: "var(--text-muted)",
        },
      ],
      [
        "polygon",
        {
          style: "transform-origin: 50px 15px; transform: scale(0.6);",
          points: "50,0 54,10 65,10 56,16 60,26 50,20 40,26 44,16 35,10 46,10",
          fill: "var(--text-main)",
        },
      ],
    ]),
  );
}

function addHalloween() {
  const glow = document.createElement("div");
  glow.className = "halloween-glow";
  container.appendChild(glow);

  for (let i = 0; i < 3; i++) {
    const bat = createSvg({ class: "bat", viewBox: "0 0 100 50" }, [
      [
        "path",
        { d: "M50,20 Q40,0 10,10 Q20,30 50,40 Q80,30 90,10 Q60,0 50,20 Z" },
      ],
    ]);
    bat.style.animationDelay = `${i * 3}s`;
    bat.style.top = `${Math.random() * 40}vh`;
    container.appendChild(bat);
  }
}

function addWeather(effect) {
  if (effect === "rain") {
    createParticles("rain-drop", 50, () => ({
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 0.5 + 0.5}s`,
      animationDelay: `${Math.random() * 2}s`,
    }));
  } else if (effect === "snow") {
    createParticles("snow-flake", 80, () => ({
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 3 + 4}s`,
      animationDelay: `${Math.random() * 5}s`,
    }));
  } else if (effect === "storm") {
    createParticles("rain-drop", 80, () => ({
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 0.4 + 0.4}s`,
    }));
    const thunder = document.createElement("div");
    thunder.className = "thunder";
    container.appendChild(thunder);
  } else if (effect === "clouds") {
    createParticles("cloud", 4, () => ({
      top: `${Math.random() * 40}vh`,
      width: `${Math.random() * 200 + 150}px`,
      height: `${Math.random() * 40 + 40}px`,
      animationDuration: `${Math.random() * 30 + 40}s`,
      animationDelay: `-${Math.random() * 40}s`,
    }));
  }

  // clear or cloudy skies get meteors and floating space objects
  if (effect === null || effect === "clouds") {
    createParticles("meteor", 4, () => ({
      left: `${Math.random() * 100}vw`,
      top: `${Math.random() * 50}vh`,
      animationDelay: `${Math.random() * 15}s`,
    }));
    createParticles("comet", 1, () => ({
      left: `${Math.random() * 100}vw`,
      top: `${Math.random() * 30}vh`,
      animationDelay: `${Math.random() * 25}s`,
    }));
    addSpaceObjects();
  }
}

function renderEffects() {
  if (!container) return;

  container.replaceChildren();
  stopFireworks();

  const holiday = getHoliday(new Date());
  renderedHolidayId = holiday?.id ?? null;

  // skip decorations for reduced motion since frozen rain would look broken
  if (paused || prefersReducedMotion()) return;

  if (holiday?.effect === "christmas") addChristmas();
  if (holiday?.effect === "halloween") addHalloween();
  if (holiday?.effect === "fireworks") {
    startFireworks(canvas, holiday.colors, { blocked: isAnyDialogOpen });
  }

  addWeather(getWeatherEffect(weatherCode));
}

export function initEffects(effectsContainer, fireworksCanvas) {
  container = effectsContainer;
  canvas = fireworksCanvas;
  renderEffects();
}

export function setWeatherCode(code) {
  const next = typeof code === "number" ? code : 0;
  if (next === weatherCode) return;
  weatherCode = next;
  renderEffects();
}

export function setEffectsPaused(value) {
  if (value === paused) return;
  paused = value;
  document.documentElement.classList.toggle("effects-paused", paused);
  renderEffects();
}

// called every minute by the clock so decorations change at midnight
export function refreshEffectsForDate(date) {
  const holidayId = getHoliday(date)?.id ?? null;
  if (holidayId !== renderedHolidayId) renderEffects();
}
