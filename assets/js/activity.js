// pauses background effects while the tab is hidden, the window is unfocused or the page sits idle

const IDLE_TIMEOUT_MS = 10000;
const INTERACTION_THROTTLE_MS = 600;
const ACTIVE_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "wheel",
];

export function trackActivity({ onPausedChange, onVisible }) {
  let isIdle = false;
  let isHidden = document.hidden;
  let idleTimerId = null;
  let lastInteraction = 0;

  const update = () => onPausedChange(isHidden || isIdle);

  const markActive = (force) => {
    const now = Date.now();
    if (!force && now - lastInteraction < INTERACTION_THROTTLE_MS) return;
    lastInteraction = now;

    clearTimeout(idleTimerId);
    idleTimerId = setTimeout(() => {
      isIdle = true;
      update();
    }, IDLE_TIMEOUT_MS);

    if (isIdle) {
      isIdle = false;
      update();
    }
  };

  ACTIVE_EVENTS.forEach((eventName) => {
    document.addEventListener(eventName, () => markActive(false), {
      passive: true,
    });
  });

  document.addEventListener("visibilitychange", () => {
    isHidden = document.hidden;
    if (!isHidden) {
      markActive(true);
      onVisible?.();
    }
    update();
  });

  window.addEventListener("focus", () => {
    isHidden = false;
    markActive(true);
    update();
  });

  window.addEventListener("blur", () => {
    isIdle = true;
    update();
  });

  if (isHidden) {
    isIdle = true;
  } else {
    markActive(true);
  }
  update();

  return { markActive: () => markActive(true) };
}
