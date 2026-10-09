// native modal dialogs with optional dismissal and focus restored on close

const returnFocusTargets = new WeakMap();
const prepared = new WeakSet();

function prepare(dialog) {
  if (prepared.has(dialog)) return;
  prepared.add(dialog);

  dialog.addEventListener("cancel", (event) => {
    if (dialog.dataset.dismissible !== "true") event.preventDefault();
  });

  // backdrop clicks arrive on the dialog element itself
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog || dialog.dataset.dismissible !== "true") {
      return;
    }
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  dialog.addEventListener("close", () => {
    const target = returnFocusTargets.get(dialog);
    returnFocusTargets.delete(dialog);
    if (target?.isConnected) target.focus();
  });
}

export function openDialog(dialog, { dismissible = true, initialFocus } = {}) {
  prepare(dialog);
  dialog.dataset.dismissible = String(dismissible);

  if (!dialog.open) {
    returnFocusTargets.set(dialog, document.activeElement);
    dialog.showModal();
  }
  initialFocus?.focus();
}

export function setDialogDismissible(dialog, dismissible) {
  dialog.dataset.dismissible = String(dismissible);
}

// an explicit return focus target replaces an opener that was rebuilt while the dialog was open
export function closeDialog(dialog, { returnFocus } = {}) {
  if (returnFocus) returnFocusTargets.set(dialog, returnFocus);
  if (dialog.open) dialog.close();
}

export function isAnyDialogOpen() {
  return document.querySelector("dialog[open]") !== null;
}
