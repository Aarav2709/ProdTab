import { MAX_BOOKMARKS } from "./data.js";
import { closeDialog, openDialog } from "./dialog.js";
import { loadBookmarks, saveBookmarks } from "./storage.js";
import { createIcon } from "./svg.js";
import { normalizeText } from "./text.js";
import { announce, showToast } from "./toast.js";
import { getFaviconUrl, normalizeUrl } from "./url.js";

const DRAG_TYPE = "application/x-prodtab-bookmark";

let bookmarks = [];
let editingIndex = null;
let draggedIndex = null;
let dropIndex = null;
const els = {};

function persist() {
  saveBookmarks(bookmarks);
}

function isFull() {
  return bookmarks.length >= MAX_BOOKMARKS;
}

function getCardLinks() {
  return Array.from(els.list.querySelectorAll(".shortcut-link"));
}

function focusCard(index) {
  const links = getCardLinks();
  (links[Math.min(index, links.length - 1)] || els.addButton)?.focus();
}

// icons come from each site's own /favicon.ico and fall back to a globe
function createFavicon(bookmark) {
  const wrapper = document.createElement("span");
  wrapper.className = "bookmark-favicon";
  wrapper.setAttribute("aria-hidden", "true");

  const fallback = document.createElement("span");
  fallback.className = "bookmark-fallback-icon";
  fallback.append(createIcon("globe"));

  const src = getFaviconUrl(bookmark.href);
  if (!src) {
    wrapper.append(fallback);
    return wrapper;
  }

  const img = document.createElement("img");
  img.className = "bookmark-favicon-img";
  img.alt = "";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.draggable = false;
  img.addEventListener("error", () => img.replaceWith(fallback), {
    once: true,
  });
  img.src = src;

  wrapper.append(img);
  return wrapper;
}

function createActionButton(kind, label, onClick) {
  const button = document.createElement("button");
  button.className = "shortcut-action";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.append(createIcon(kind));
  button.addEventListener("click", onClick);
  return button;
}

function createCard(bookmark, index) {
  const item = document.createElement("li");
  item.className = "shortcut";
  item.draggable = true;
  item.dataset.index = String(index);
  item.style.setProperty("--i", String(index));

  const link = document.createElement("a");
  link.className = "shortcut-link";
  link.href = bookmark.href;
  link.draggable = false;

  const label = document.createElement("span");
  label.className = "shortcut-label";
  label.textContent = bookmark.label;
  link.append(createFavicon(bookmark), label);

  const actions = document.createElement("div");
  actions.className = "shortcut-actions";
  actions.append(
    createActionButton("edit", `Edit ${bookmark.label}`, () =>
      openBookmarkDialog(index),
    ),
    createActionButton("delete", `Delete ${bookmark.label}`, () =>
      deleteBookmark(index),
    ),
  );

  item.append(link, actions);
  return item;
}

function render() {
  els.list.replaceChildren(...bookmarks.map(createCard));

  const full = isFull();
  const label = full
    ? `Bookmark limit reached (${MAX_BOOKMARKS})`
    : "Add bookmark";
  // aria disabled keeps the button focusable so its tooltip can explain the limit
  els.addButton.setAttribute("aria-disabled", String(full));
  els.addButton.setAttribute("aria-label", label);
  els.addButton.title = label;
}

function moveBookmark(from, to) {
  if (from === to || !bookmarks[from]) return;
  const [moved] = bookmarks.splice(from, 1);
  bookmarks.splice(to, 0, moved);
  persist();
  render();
  announce(
    `Moved ${moved.label} to position ${to + 1} of ${bookmarks.length}.`,
  );
}

function deleteBookmark(index) {
  const removed = bookmarks[index];
  if (!removed) return;

  const hadFocus = els.list.contains(document.activeElement);
  bookmarks.splice(index, 1);
  persist();
  render();
  if (hadFocus) focusCard(index);

  showToast(`Deleted ${removed.label}.`, {
    actionLabel: "Undo",
    onAction: () => {
      if (isFull()) return;
      const position = Math.min(index, bookmarks.length);
      bookmarks.splice(position, 0, removed);
      persist();
      render();
      focusCard(position);
    },
  });
}

function setError(message) {
  els.error.textContent = message;
  els.error.classList.toggle("hidden", !message);
}

function fillPositionOptions(count, selected) {
  els.position.replaceChildren(
    ...Array.from({ length: count }, (_, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = String(i + 1);
      option.selected = i === selected;
      return option;
    }),
  );
  els.positionRow.classList.toggle("hidden", count <= 1);
}

function openBookmarkDialog(index = null) {
  const existing = index === null ? null : bookmarks[index];
  if (!existing && isFull()) {
    showToast(`You can keep up to ${MAX_BOOKMARKS} bookmarks.`);
    return;
  }

  editingIndex = existing ? index : null;
  els.title.textContent = existing ? "Edit Bookmark" : "Add Bookmark";
  els.name.value = existing?.label || "";
  els.url.value = existing?.href || "https://";
  fillPositionOptions(
    existing ? bookmarks.length : bookmarks.length + 1,
    existing ? index : bookmarks.length,
  );
  setError("");

  openDialog(els.dialog, { initialFocus: els.name });
  els.name.select();
}

function handleSubmit(event) {
  event.preventDefault();

  const label = normalizeText(els.name.value);
  const href = normalizeUrl(els.url.value);

  if (!label) {
    setError("Please enter a bookmark name.");
    els.name.focus();
    return;
  }
  if (!href) {
    setError("Please enter a valid web address (http or https).");
    els.url.focus();
    return;
  }

  const isEditing = editingIndex !== null && bookmarks[editingIndex];
  if (!isEditing && isFull()) {
    setError(`You can keep up to ${MAX_BOOKMARKS} bookmarks.`);
    return;
  }

  if (isEditing) bookmarks.splice(editingIndex, 1);
  const position = Math.min(Number(els.position.value) || 0, bookmarks.length);
  bookmarks.splice(position, 0, { label, href });
  persist();
  render();

  // the card that opened the dialog was rebuilt, so focus its replacement
  closeDialog(els.dialog, {
    returnFocus: isEditing ? getCardLinks()[position] : undefined,
  });
}

function setUpDragAndDrop() {
  const clearDropTargets = () => {
    els.list
      .querySelectorAll(".is-drop-target")
      .forEach((el) => el.classList.remove("is-drop-target"));
  };

  els.list.addEventListener("dragstart", (event) => {
    const item = event.target.closest?.(".shortcut");
    if (!item) return;
    draggedIndex = Number(item.dataset.index);
    event.dataTransfer.effectAllowed = "move";
    // firefox only starts a drag when some data is set
    event.dataTransfer.setData(DRAG_TYPE, String(draggedIndex));
    item.classList.add("is-dragging");
  });

  els.list.addEventListener("dragover", (event) => {
    if (draggedIndex === null) return;
    const item = event.target.closest?.(".shortcut");
    if (!item) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!item.classList.contains("is-drop-target")) {
      clearDropTargets();
      if (Number(item.dataset.index) !== draggedIndex) {
        item.classList.add("is-drop-target");
      }
    }
  });

  els.list.addEventListener("drop", (event) => {
    if (draggedIndex === null) return;
    const item = event.target.closest?.(".shortcut");
    if (!item) return;
    event.preventDefault();
    dropIndex = Number(item.dataset.index);
  });

  // move here instead of on drop, rebuilding earlier would detach the card before dragend
  els.list.addEventListener("dragend", () => {
    const from = draggedIndex;
    const to = dropIndex;
    draggedIndex = null;
    dropIndex = null;
    clearDropTargets();
    els.list
      .querySelectorAll(".is-dragging")
      .forEach((el) => el.classList.remove("is-dragging"));
    if (from !== null && to !== null) moveBookmark(from, to);
  });
}

export function initBookmarks() {
  Object.assign(els, {
    list: document.getElementById("links"),
    addButton: document.getElementById("add-bookmark-btn"),
    dialog: document.getElementById("bookmark-dialog"),
    form: document.getElementById("bookmark-form"),
    title: document.getElementById("bookmark-dialog-title"),
    name: document.getElementById("bookmark-name"),
    url: document.getElementById("bookmark-url"),
    position: document.getElementById("bookmark-position"),
    positionRow: document.getElementById("bookmark-position-row"),
    error: document.getElementById("bookmark-error"),
    cancel: document.getElementById("bookmark-cancel-btn"),
  });

  bookmarks = loadBookmarks();

  els.addButton.addEventListener("click", () => openBookmarkDialog());
  els.form.addEventListener("submit", handleSubmit);
  els.form.addEventListener("input", () => setError(""));
  els.cancel.addEventListener("click", () => closeDialog(els.dialog));
  setUpDragAndDrop();

  els.list.classList.add("is-entering");
  render();
  // long enough for the last staggered card to finish sliding in
  setTimeout(() => els.list.classList.remove("is-entering"), 1600);
}
