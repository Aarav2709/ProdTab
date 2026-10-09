const TOAST_DURATION_MS = 6000;

let hideTimerId = null;
let pendingAction = null;

function getElements() {
  return {
    toast: document.getElementById("toast"),
    message: document.getElementById("toast-message"),
    action: document.getElementById("toast-action"),
    announcer: document.getElementById("announcer"),
  };
}

function hideToast() {
  const { toast } = getElements();
  clearTimeout(hideTimerId);
  pendingAction = null;
  toast?.classList.add("hidden");
}

export function initToast() {
  const { action } = getElements();
  action?.addEventListener("click", () => {
    const run = pendingAction;
    hideToast();
    run?.();
  });
}

export function showToast(text, { actionLabel, onAction } = {}) {
  const { toast, message, action } = getElements();
  if (!toast || !message || !action) return;

  clearTimeout(hideTimerId);
  message.textContent = text;
  pendingAction = onAction || null;
  action.textContent = actionLabel || "";
  action.classList.toggle("hidden", !onAction);
  toast.classList.remove("hidden");

  hideTimerId = setTimeout(hideToast, TOAST_DURATION_MS);
}

// screen reader message for changes with no visible text
export function announce(text) {
  const { announcer } = getElements();
  if (!announcer) return;
  announcer.textContent = "";
  // clearing first makes screen readers repeat identical messages
  requestAnimationFrame(() => {
    announcer.textContent = text;
  });
}
