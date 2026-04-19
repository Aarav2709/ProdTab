const TEST_CONFIG = {
  forceTheme: false, // "dark", "light", or false
  forceWeather: false, // 0 (clear), 61 (rain), 71 (snow), 95 (storm), or false
  forceFestival: false, // "xmas", "halloween", "canada", "newyear", "fireworks", or false
};

const STORAGE_KEYS = {
  profile: "prodtab.profile.v1",
  bookmarks: "prodtab.bookmarks.v1",
  theme: "prodtab.theme.v1",
  weatherCache: "prodtab.weather.cache.v1",
  weatherUnit: "prodtab.weather.unit.v1",
};

const MAX_BOOKMARKS = 5;
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 45;
const WEATHER_CACHE_FALLBACK_MS = 1000 * 60 * 60 * 24;
const LOW_POWER_DEVICE =
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
  (navigator.deviceMemory && navigator.deviceMemory <= 4);
const PARTICLE_LOAD_FACTOR = LOW_POWER_DEVICE ? 0.14 : 0.22;
const BASE_FIREWORK_PARTICLES = LOW_POWER_DEVICE ? 10 : 14;
const AUTO_FIREWORK_BURSTS = LOW_POWER_DEVICE ? 3 : 6;
const IDLE_TIMEOUT_MS = 10000;
const INTERACTION_THROTTLE_MS = 600;

const LEGACY_DEFAULT_BOOKMARKS = [
  { label: "Quercus", href: "https://q.utoronto.ca/" },
  { label: "Acorn", href: "https://acorn.utoronto.ca/" },
  { label: "YouTube", href: "https://youtube.com/" },
  { label: "Archwiki", href: "https://wiki.archlinux.org/" },
  { label: "Outlook", href: "https://outlook.office.com/" },
];

const BOOKMARK_ICONS = {
  quercus:
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M5 9v6c0 3 7 3 7 3s7 0 7-3V9"/><path d="M19 10v4"/><circle cx="19" cy="15" r="1"/></svg>',
  acorn:
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-2.5 0-4.5 1.5-5.5 3.5S4 10 4 12c0 3 2.5 5 5 5h6c2.5 0 5-2 5-5 0-2-1.5-4.5-2.5-6.5S14.5 2 12 2z"/><path d="M12 17v5"/><path d="M9 22h6"/></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
  archwiki:
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l3 3-3 3M13 17h4"/><rect x="3" y="4" width="18" height="16" rx="2" ry="2"/></svg>',
  outlook:
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/><path d="M3 7l9 6 9-6"/></svg>',
  generic:
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg>',
};

window.activeGreeting = null;

let userProfile = loadProfile();
let bookmarks = loadBookmarks();
let autoFireworkTimeout;

const searchInput = document.getElementById("search");
const linksContainer = document.getElementById("links");
const addBookmarkBtn = document.getElementById("add-bookmark-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const wxTempEl = document.getElementById("wx-temp");
const wxCityEl = document.getElementById("wx-city");
const wxUnitToggleBtn = document.getElementById("wx-unit-toggle");

const bookmarkModalOverlay = document.getElementById("bookmark-modal-overlay");
const bookmarkForm = document.getElementById("bookmark-form");
const bookmarkModalTitle = document.getElementById("bookmark-modal-title");
const bookmarkNameInput = document.getElementById("bookmark-name");
const bookmarkUrlInput = document.getElementById("bookmark-url");
const bookmarkModalError = document.getElementById("bookmark-modal-error");
const bookmarkCancelBtn = document.getElementById("bookmark-cancel-btn");

const onboardingOverlay = document.getElementById("onboarding-overlay");
const onboardingForm = document.getElementById("onboarding-form");
const onboardingNameInput = document.getElementById("onboarding-name");
const onboardingCityInput = document.getElementById("onboarding-city");

const fxContainer = document.getElementById("dynamic-effects");
let editingBookmarkIndex = null;
let themePreference = loadThemePreference();
let weatherUnit = loadWeatherUnit();
let latestWeather = null;
let fireworksMouseDownHandler = null;
let fireworksResizeHandler = null;
let idleTimerId = null;
let isUserIdle = false;
let isPageHidden = document.hidden;
let effectsPaused = false;
let lastInteractionTs = Date.now();
let currentWeatherCode =
  TEST_CONFIG.forceWeather !== false ? TEST_CONFIG.forceWeather : 0;
let weatherFetchInFlight = null;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore persistence failures.
  }
}

function loadThemePreference() {
  const raw = safeStorageGet(STORAGE_KEYS.theme);
  if (raw === "light" || raw === "dark") return raw;
  return null;
}

function saveThemePreference(mode) {
  themePreference = mode;
  if (!mode) return;
  safeStorageSet(STORAGE_KEYS.theme, mode);
}

function loadWeatherUnit() {
  const raw = safeStorageGet(STORAGE_KEYS.weatherUnit);
  return raw === "F" ? "F" : "C";
}

function saveWeatherUnit(unit) {
  weatherUnit = unit;
  safeStorageSet(STORAGE_KEYS.weatherUnit, unit);
}

function loadWeatherCacheStore() {
  const raw = safeStorageGet(STORAGE_KEYS.weatherCache);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveWeatherCacheStore(cacheStore) {
  safeStorageSet(STORAGE_KEYS.weatherCache, JSON.stringify(cacheStore));
}

function makeWeatherCacheKey(cityName) {
  return normalizeText(cityName).toLowerCase();
}

function readWeatherCache(cityName) {
  const key = makeWeatherCacheKey(cityName);
  if (!key) return null;

  const store = loadWeatherCacheStore();
  const cache = store[key];
  if (!cache || typeof cache !== "object") return null;
  return cache;
}

function writeWeatherCache(cityName, entry) {
  const key = makeWeatherCacheKey(cityName);
  if (!key) return;

  const store = loadWeatherCacheStore();
  store[key] = entry;
  saveWeatherCacheStore(store);
}

function formatTemperature(tempCelsius) {
  if (typeof tempCelsius !== "number" || Number.isNaN(tempCelsius)) {
    return "N/A";
  }

  if (weatherUnit === "F") {
    const fahrenheit = Math.round((tempCelsius * 9) / 5 + 32);
    return `${fahrenheit}°F`;
  }

  return `${Math.round(tempCelsius)}°C`;
}

function updateWeatherUnitToggle() {
  if (!wxUnitToggleBtn) return;

  wxUnitToggleBtn.textContent = weatherUnit;
  const nextLabel =
    weatherUnit === "C" ? "Switch to Fahrenheit" : "Switch to Celsius";
  wxUnitToggleBtn.setAttribute("aria-label", nextLabel);
  wxUnitToggleBtn.setAttribute("title", nextLabel);
}

function renderWeather() {
  updateWeatherUnitToggle();

  if (!latestWeather) {
    wxTempEl.textContent = "--°";
    if (wxCityEl) wxCityEl.textContent = "";
    return;
  }

  wxTempEl.textContent = formatTemperature(latestWeather.tempC);
  if (wxCityEl) {
    wxCityEl.textContent = latestWeather.cityLabel || "";
  }
}

function shouldPauseEffects() {
  return isPageHidden || isUserIdle;
}

function applyEffectsPauseState() {
  const nextPaused = shouldPauseEffects();
  if (nextPaused === effectsPaused) return;

  effectsPaused = nextPaused;
  document.documentElement.classList.toggle("effects-paused", effectsPaused);

  if (effectsPaused) {
    stopFireworks();
    fxContainer.innerHTML = "";
    return;
  }

  triggerEffects(currentWeatherCode);
}

function scheduleIdleTimer() {
  if (idleTimerId) {
    clearTimeout(idleTimerId);
  }

  idleTimerId = setTimeout(() => {
    isUserIdle = true;
    applyEffectsPauseState();
  }, IDLE_TIMEOUT_MS);
}

function markUserActive(force) {
  const now = Date.now();
  if (!force && now - lastInteractionTs < INTERACTION_THROTTLE_MS) return;

  lastInteractionTs = now;
  const wasIdle = isUserIdle;
  isUserIdle = false;
  scheduleIdleTimer();

  if (wasIdle) {
    applyEffectsPauseState();
  }
}

function setupActivityTracking() {
  const activeEvents = [
    "pointerdown",
    "keydown",
    "touchstart",
    "wheel",
    "mousemove",
  ];

  activeEvents.forEach((eventName) => {
    document.addEventListener(
      eventName,
      () => {
        markUserActive(false);
      },
      { passive: true },
    );
  });

  document.addEventListener("visibilitychange", () => {
    isPageHidden = document.hidden;
    if (!isPageHidden) {
      markUserActive(true);
      refreshWeatherIfStale();
    }
    applyEffectsPauseState();
  });

  window.addEventListener("focus", () => {
    isPageHidden = false;
    markUserActive(true);
    applyEffectsPauseState();
  });

  window.addEventListener("blur", () => {
    isUserIdle = true;
    applyEffectsPauseState();
  });

  if (isPageHidden) {
    isUserIdle = true;
    applyEffectsPauseState();
    return;
  }

  markUserActive(true);
  applyEffectsPauseState();
}

function normalizeUrl(urlValue) {
  const raw = normalizeText(urlValue);
  if (!raw) return null;

  const value = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function loadProfile() {
  const raw = safeStorageGet(STORAGE_KEYS.profile);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const name = normalizeText(parsed?.name);
    const city = normalizeText(parsed?.city);
    if (!name || !city) return null;
    return { name, city };
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  safeStorageSet(STORAGE_KEYS.profile, JSON.stringify(profile));
}

function getUserName() {
  return userProfile?.name || "friend";
}

function getUserCity() {
  return userProfile?.city || "";
}

function isLegacyDefaultBookmarks(entries) {
  if (
    !Array.isArray(entries) ||
    entries.length !== LEGACY_DEFAULT_BOOKMARKS.length
  ) {
    return false;
  }

  const expectedSet = new Set(
    LEGACY_DEFAULT_BOOKMARKS.map((item) =>
      `${normalizeText(item.label)}|${normalizeUrl(item.href)}`,
    ),
  );

  return entries.every((entry) =>
    expectedSet.has(`${normalizeText(entry.label)}|${normalizeUrl(entry.href)}`),
  );
}

function loadBookmarks() {
  const raw = safeStorageGet(STORAGE_KEYS.bookmarks);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized = parsed
      .map((entry) => {
        const label = normalizeText(entry?.label);
        const href = normalizeUrl(entry?.href);
        if (!label || !href) return null;
        return { label, href };
      })
      .filter(Boolean)
      .slice(0, MAX_BOOKMARKS);

    if (isLegacyDefaultBookmarks(sanitized)) {
      safeStorageSet(STORAGE_KEYS.bookmarks, JSON.stringify([]));
      return [];
    }

    return sanitized;
  } catch {
    return [];
  }
}

function saveBookmarks() {
  safeStorageSet(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarks));
}

function getBookmarkIcon(label, href) {
  const key = `${label} ${href}`.toLowerCase();

  if (key.includes("q.utoronto") || key.includes("quercus")) {
    return BOOKMARK_ICONS.quercus;
  }
  if (key.includes("acorn.utoronto") || key.includes("acorn")) {
    return BOOKMARK_ICONS.acorn;
  }
  if (key.includes("youtube")) {
    return BOOKMARK_ICONS.youtube;
  }
  if (key.includes("archlinux") || key.includes("archwiki")) {
    return BOOKMARK_ICONS.archwiki;
  }
  if (key.includes("outlook") || key.includes("office.com")) {
    return BOOKMARK_ICONS.outlook;
  }

  return BOOKMARK_ICONS.generic;
}

function getFaviconUrl(href) {
  try {
    const { hostname } = new URL(href);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function createBookmarkIconElement(bookmark) {
  const knownIcon = getBookmarkIcon(bookmark.label, bookmark.href);
  if (knownIcon !== BOOKMARK_ICONS.generic) {
    const known = document.createElement("span");
    known.innerHTML = knownIcon;
    const icon = known.firstElementChild;
    if (icon) icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "bookmark-favicon";

  const img = document.createElement("img");
  img.className = "bookmark-favicon-img";
  img.alt = "";
  img.referrerPolicy = "no-referrer";
  img.loading = "lazy";
  const faviconUrl = getFaviconUrl(bookmark.href);

  const fallback = document.createElement("span");
  fallback.className = "bookmark-fallback-icon hidden";
  fallback.innerHTML = BOOKMARK_ICONS.generic;

  if (!faviconUrl) {
    img.classList.add("hidden");
    fallback.classList.remove("hidden");
  } else {
    img.src = faviconUrl;
  }

  img.addEventListener("error", () => {
    img.classList.add("hidden");
    fallback.classList.remove("hidden");
  });

  wrapper.append(img, fallback);
  return wrapper;
}

function setBookmarkModalError(message) {
  if (!bookmarkModalError) return;

  const text = normalizeText(message);
  if (!text) {
    bookmarkModalError.textContent = "";
    bookmarkModalError.classList.add("hidden");
    return;
  }

  bookmarkModalError.textContent = text;
  bookmarkModalError.classList.remove("hidden");
}

function openBookmarkModal(mode, index) {
  if (!bookmarkModalOverlay || !bookmarkForm) return;

  editingBookmarkIndex = mode === "edit" ? index : null;
  const existing =
    typeof editingBookmarkIndex === "number"
      ? bookmarks[editingBookmarkIndex]
      : null;

  if (bookmarkModalTitle) {
    bookmarkModalTitle.textContent = existing
      ? "Edit Bookmark"
      : "Add Bookmark";
  }

  bookmarkNameInput.value = existing?.label || "";
  bookmarkUrlInput.value = existing?.href || "https://";
  setBookmarkModalError("");

  bookmarkModalOverlay.classList.remove("hidden");
  bookmarkModalOverlay.setAttribute("aria-hidden", "false");
  bookmarkNameInput.focus();
  bookmarkNameInput.select();
}

function closeBookmarkModal() {
  if (!bookmarkModalOverlay) return;

  bookmarkModalOverlay.classList.add("hidden");
  bookmarkModalOverlay.setAttribute("aria-hidden", "true");
  editingBookmarkIndex = null;
  setBookmarkModalError("");
}

function addBookmark() {
  if (bookmarks.length >= MAX_BOOKMARKS) return;
  openBookmarkModal("add");
}

function editBookmark(index) {
  if (!bookmarks[index]) return;
  openBookmarkModal("edit", index);
}

function deleteBookmark(index) {
  if (!bookmarks[index]) return;
  bookmarks = bookmarks.filter((_, itemIndex) => itemIndex !== index);
  saveBookmarks();
  renderBookmarks();
}

function renderBookmarks() {
  linksContainer.innerHTML = "";

  if (addBookmarkBtn) {
    addBookmarkBtn.disabled = bookmarks.length >= MAX_BOOKMARKS;
  }

  if (bookmarks.length === 0) return;

  bookmarks.forEach((bookmark, index) => {
    const a = document.createElement("a");
    a.className = "shortcut";
    a.href = bookmark.href;

    const icon = createBookmarkIconElement(bookmark);
    if (icon) a.appendChild(icon);

    const label = document.createElement("span");
    label.textContent = bookmark.label;
    a.appendChild(label);

    const actions = document.createElement("div");
    actions.className = "shortcut-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "shortcut-action";
    editBtn.type = "button";
    editBtn.setAttribute("aria-label", `Edit ${bookmark.label}`);
    editBtn.title = "Edit bookmark";
    editBtn.innerHTML =
      '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    editBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      editBookmark(index);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "shortcut-action";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `Delete ${bookmark.label}`);
    deleteBtn.title = "Delete bookmark";
    deleteBtn.innerHTML =
      '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    deleteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteBookmark(index);
    });

    actions.append(editBtn, deleteBtn);
    a.appendChild(actions);

    linksContainer.appendChild(a);
  });
}

function setThemeClass(mode) {
  if (mode === "dark") {
    document.documentElement.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
  }
}

function getCurrentThemeClass() {
  return document.documentElement.classList.contains("dark-theme")
    ? "dark"
    : "light";
}

function updateThemeToggleLabel() {
  if (!themeToggleBtn) return;
  const current = getCurrentThemeClass();
  const isDark = current === "dark";
  themeToggleBtn.classList.toggle("is-dark", isDark);

  const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  themeToggleBtn.setAttribute("aria-label", nextLabel);
  themeToggleBtn.setAttribute("title", nextLabel);
}

function applyTheme(isDay) {
  if (TEST_CONFIG.forceTheme) {
    if (TEST_CONFIG.forceTheme === "dark") {
      setThemeClass("dark");
    } else {
      setThemeClass("light");
    }
    updateThemeToggleLabel();
    return;
  }

  if (themePreference === "light" || themePreference === "dark") {
    setThemeClass(themePreference);
    updateThemeToggleLabel();
    return;
  }

  const hr = new Date().getHours();
  if (isDay && hr >= 6 && hr < 18) {
    setThemeClass("light");
  } else {
    setThemeClass("dark");
  }
  updateThemeToggleLabel();
}

applyTheme(true);

// ----------------------------------------
// CLOCK & GREETING
function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");

  document.getElementById("clock").textContent = `${hours}:${minutes}`;

  const greetingEl = document.getElementById("greeting");
  const name = getUserName();

  if (window.activeGreeting) {
    greetingEl.textContent = window.activeGreeting;
    return;
  }

  const day = now.getDay();

  if (day === 5 && hours >= 16) {
    greetingEl.textContent = `Happy Friday, ${name}.`;
  } else if (hours < 12) {
    greetingEl.textContent = `Good morning, ${name}.`;
  } else if (hours < 18) {
    greetingEl.textContent = `Good afternoon, ${name}.`;
  } else {
    greetingEl.textContent = `Good evening, ${name}.`;
  }
}

setInterval(updateClock, 15000);
updateClock();

if (searchInput) {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && searchInput.value.trim()) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });
}

if (addBookmarkBtn) {
  addBookmarkBtn.addEventListener("click", addBookmark);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const next = getCurrentThemeClass() === "dark" ? "light" : "dark";
    saveThemePreference(next);
    applyTheme(true);
  });
}

if (wxUnitToggleBtn) {
  wxUnitToggleBtn.addEventListener("click", () => {
    const nextUnit = weatherUnit === "C" ? "F" : "C";
    saveWeatherUnit(nextUnit);
    renderWeather();
  });
}

renderWeather();

renderBookmarks();

if (bookmarkForm) {
  bookmarkForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const label = normalizeText(bookmarkNameInput.value);
    const href = normalizeUrl(bookmarkUrlInput.value);

    if (!label) {
      setBookmarkModalError("Please enter a bookmark name.");
      bookmarkNameInput.focus();
      return;
    }

    if (!href) {
      setBookmarkModalError("Please enter a valid URL (http/https).");
      bookmarkUrlInput.focus();
      return;
    }

    if (
      editingBookmarkIndex === null &&
      bookmarks.length >= MAX_BOOKMARKS
    ) {
      setBookmarkModalError(`You can only keep ${MAX_BOOKMARKS} bookmarks.`);
      return;
    }

    if (
      typeof editingBookmarkIndex === "number" &&
      bookmarks[editingBookmarkIndex]
    ) {
      bookmarks[editingBookmarkIndex] = { label, href };
    } else {
      bookmarks.push({ label, href });
    }

    saveBookmarks();
    renderBookmarks();
    closeBookmarkModal();
  });
}

if (bookmarkCancelBtn) {
  bookmarkCancelBtn.addEventListener("click", () => {
    closeBookmarkModal();
  });
}

if (bookmarkModalOverlay) {
  bookmarkModalOverlay.addEventListener("click", (event) => {
    if (event.target !== bookmarkModalOverlay) return;
    closeBookmarkModal();
  });
}

// ----------------------------------------
// EFFECTS
function createParticles(className, count, styleFunc) {
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
    Object.assign(el.style, styleFunc(i));
    fragment.appendChild(el);
  }

  fxContainer.appendChild(fragment);
}

function injectSpaceObjects() {
  const saturn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  saturn.setAttribute("class", "floating-obj");
  saturn.setAttribute("viewBox", "0 0 100 100");
  saturn.style.top = "15%";
  saturn.style.right = "10%";
  saturn.style.width = "100px";
  saturn.innerHTML =
    '<circle cx="50" cy="50" r="20"/><ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(-20 50 50)"/>';
  fxContainer.appendChild(saturn);

  const starBase = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  starBase.setAttribute("class", "floating-obj");
  starBase.setAttribute("viewBox", "0 0 50 50");
  starBase.style.bottom = "20%";
  starBase.style.left = "15%";
  starBase.style.width = "60px";
  starBase.style.animationDelay = "-5s";
  starBase.innerHTML =
    '<polygon points="25,5 30,20 45,20 32,30 37,45 25,35 13,45 18,30 5,20 20,20"/>';
  fxContainer.appendChild(starBase);
}

function injectXmasTree() {
  const tree = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  tree.setAttribute("class", "xmas-tree");
  tree.setAttribute("viewBox", "0 0 100 120");
  tree.innerHTML = `
    <polygon points="50,15 20,55 40,55 10,95 90,95 60,55 80,55" fill="var(--accent)" />
    <rect x="40" y="95" width="20" height="25" fill="var(--text-muted)" />
    <polygon style="transform-origin: 50px 15px; transform: scale(0.6);" points="50,0 54,10 65,10 56,16 60,26 50,20 40,26 44,16 35,10 46,10" fill="var(--text-main)" />
  `;
  fxContainer.appendChild(tree);
}

function injectHalloween() {
  const glow = document.createElement("div");
  glow.className = "halloween-glow";
  fxContainer.appendChild(glow);

  for (let i = 0; i < 3; i++) {
    const bat = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    bat.setAttribute("class", "bat");
    bat.setAttribute("viewBox", "0 0 100 50");
    bat.style.animationDelay = `${i * 3}s`;
    bat.style.top = `${Math.random() * 40}vh`;
    bat.innerHTML =
      '<path d="M50,20 Q40,0 10,10 Q20,30 50,40 Q80,30 90,10 Q60,0 50,20 Z" />';
    fxContainer.appendChild(bat);
  }
}

// --- FIREWORKS ---
function startFireworks(customColors) {
  window.human = false;
  const canvasEl = document.getElementById("fireworks-canvas");
  const ctx = canvasEl.getContext("2d");
  const numberOfParticules = BASE_FIREWORK_PARTICLES;
  let pointerX = 0;
  let pointerY = 0;

  function setCanvasSize() {
    canvasEl.width = window.innerWidth * 2;
    canvasEl.height = window.innerHeight * 2;
    canvasEl.style.width = `${window.innerWidth}px`;
    canvasEl.style.height = `${window.innerHeight}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);
  }

  function getColors() {
    if (customColors) return customColors;
    const style = getComputedStyle(document.body);
    return [
      style.getPropertyValue("--accent").trim(),
      style.getPropertyValue("--text-main").trim(),
      style.getPropertyValue("--text-muted").trim(),
    ];
  }

  function setParticuleDirection(particle) {
    const angle = (anime.random(0, 360) * Math.PI) / 180;
    const value = anime.random(50, 150);
    const radius = [-1, 1][anime.random(0, 1)] * value;
    return {
      x: particle.x + radius * Math.cos(angle),
      y: particle.y + radius * Math.sin(angle),
    };
  }

  function createParticule(x, y) {
    const particle = {};
    particle.x = x;
    particle.y = y;
    const colors = getColors();
    particle.color = colors[anime.random(0, colors.length - 1)];
    particle.radius = anime.random(8, 24);
    particle.endPos = setParticuleDirection(particle);
    particle.draw = function () {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, 2 * Math.PI, true);
      ctx.fillStyle = particle.color;
      ctx.fill();
    };
    return particle;
  }

  function renderParticule(anim) {
    ctx.clearRect(0, 0, canvasEl.width / 2, canvasEl.height / 2);
    for (let i = 0; i < anim.animatables.length; i++) {
      anim.animatables[i].target.draw();
    }
  }

  function animateParticules(x, y) {
    const particules = [];
    for (let i = 0; i < numberOfParticules; i++) {
      particules.push(createParticule(x, y));
    }
    anime.timeline().add({
      targets: particules,
      x: (particle) => particle.endPos.x,
      y: (particle) => particle.endPos.y,
      radius: 0.1,
      duration: anime.random(1200, 1800),
      easing: "easeOutExpo",
      update: renderParticule,
    });
  }

  if (fireworksMouseDownHandler) {
    document.removeEventListener("mousedown", fireworksMouseDownHandler, false);
    fireworksMouseDownHandler = null;
  }

  if (fireworksResizeHandler) {
    window.removeEventListener("resize", fireworksResizeHandler, false);
    fireworksResizeHandler = null;
  }

  fireworksMouseDownHandler = (event) => {
    if (
      event.target.tagName === "INPUT" ||
      event.target.closest("a") ||
      event.target.closest("button")
    ) {
      return;
    }
    if (onboardingOverlay && !onboardingOverlay.classList.contains("hidden")) {
      return;
    }
    if (
      bookmarkModalOverlay &&
      !bookmarkModalOverlay.classList.contains("hidden")
    ) {
      return;
    }
    window.human = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    animateParticules(pointerX, pointerY);
  };

  document.addEventListener("mousedown", fireworksMouseDownHandler, false);

  let remainingAutoBursts = AUTO_FIREWORK_BURSTS;
  function autoClick() {
    if (window.human || effectsPaused || document.hidden) return;
    if (remainingAutoBursts <= 0) return;
    remainingAutoBursts -= 1;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    animateParticules(
      anime.random(centerX - 150, centerX + 150),
      anime.random(centerY - 150, centerY + 150),
    );
    autoFireworkTimeout = setTimeout(autoClick, anime.random(1800, 3200));
  }

  setCanvasSize();
  fireworksResizeHandler = setCanvasSize;
  window.addEventListener("resize", fireworksResizeHandler, false);
  autoClick();
}

function stopFireworks() {
  clearTimeout(autoFireworkTimeout);

  if (fireworksMouseDownHandler) {
    document.removeEventListener("mousedown", fireworksMouseDownHandler, false);
    fireworksMouseDownHandler = null;
  }

  if (fireworksResizeHandler) {
    window.removeEventListener("resize", fireworksResizeHandler, false);
    fireworksResizeHandler = null;
  }

  const canvasEl = document.getElementById("fireworks-canvas");
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}

function triggerEffects(apiWeatherCode) {
  fxContainer.innerHTML = "";
  window.activeGreeting = null;
  stopFireworks();

  const date = new Date();
  const month = date.getMonth();
  const day = date.getDate();
  const userName = getUserName();

  const activeWeather =
    TEST_CONFIG.forceWeather !== false
      ? TEST_CONFIG.forceWeather
      : apiWeatherCode;
  currentWeatherCode = activeWeather;
  const activeFestival =
    TEST_CONFIG.forceFestival !== false ? TEST_CONFIG.forceFestival : null;

  let isHoliday = false;

  if (activeFestival === "xmas" || (!activeFestival && month === 11)) {
    window.activeGreeting = `Merry Christmas, ${userName}.`;
    if (!effectsPaused) {
      createParticles("xmas-light", 25, (i) => ({
        left: `${i * 4}%`,
        animationDelay: `${Math.random() * 2}s`,
      }));
      injectXmasTree();
    }
    isHoliday = true;
  }

  if (activeFestival === "halloween" || (!activeFestival && month === 9)) {
    window.activeGreeting = `Happy Halloween, ${userName}.`;
    if (!effectsPaused) {
      injectHalloween();
    }
    isHoliday = true;
  }

  if (
    activeFestival === "canada" ||
    (!activeFestival && month === 6 && day === 1)
  ) {
    window.activeGreeting = `Happy Canada Day, ${userName}.`;
    if (!effectsPaused) {
      startFireworks(["#FF0000", "#FFFFFF"]);
    }
    isHoliday = true;
  }

  if (
    activeFestival === "newyear" ||
    (!activeFestival && month === 0 && day === 1)
  ) {
    window.activeGreeting = `Happy New Year, ${userName}.`;
    if (!effectsPaused) {
      startFireworks([
        "#ff0044",
        "#00ff44",
        "#4400ff",
        "#ffea00",
        "#00eaff",
        "#ff00aa",
      ]);
    }
    isHoliday = true;
  }

  if (activeFestival === "fireworks" && !isHoliday) {
    if (!effectsPaused) {
      startFireworks(null);
    }
    isHoliday = true;
  }

  updateClock();

  if (effectsPaused) {
    return;
  }

  let hasWeatherFx = false;
  if (activeWeather >= 51 && activeWeather <= 67) {
    createParticles("rain-drop", 50, () => ({
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 0.5 + 0.5}s`,
      animationDelay: `${Math.random() * 2}s`,
    }));
    hasWeatherFx = true;
  } else if (activeWeather >= 71 && activeWeather <= 86) {
    createParticles("snow-flake", 80, () => ({
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 3 + 4}s`,
      animationDelay: `${Math.random() * 5}s`,
    }));
    hasWeatherFx = true;
  } else if (activeWeather >= 1 && activeWeather <= 3) {
    createParticles("cloud", 4, () => ({
      top: `${Math.random() * 40}vh`,
      width: `${Math.random() * 200 + 150}px`,
      height: `${Math.random() * 40 + 40}px`,
      animationDuration: `${Math.random() * 30 + 40}s`,
      animationDelay: `-${Math.random() * 40}s`,
    }));
  } else if (activeWeather >= 95) {
    createParticles("rain-drop", 80, () => ({
      left: `${Math.random() * 100}vw`,
      animationDuration: `${Math.random() * 0.4 + 0.4}s`,
    }));
    const thunder = document.createElement("div");
    thunder.className = "thunder";
    fxContainer.appendChild(thunder);
    hasWeatherFx = true;
  }

  if (!hasWeatherFx) {
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
    injectSpaceObjects();
  }
}

async function geocodeCity(city) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );

  if (!response.ok) {
    throw new Error("Could not geocode city.");
  }

  const data = await response.json();
  const result = data?.results?.[0];
  if (!result) {
    throw new Error("City not found.");
  }

  return result;
}

async function loadWeather(options) {
  const forceRefresh = Boolean(options?.forceRefresh);
  const city = getUserCity();
  const cache = readWeatherCache(city);
  const now = Date.now();
  const hasFreshCache =
    cache &&
    typeof cache.tempC === "number" &&
    now - cache.timestamp <= WEATHER_CACHE_TTL_MS;
  const hasFallbackCache =
    cache &&
    typeof cache.tempC === "number" &&
    now - cache.timestamp <= WEATHER_CACHE_FALLBACK_MS;

  if (!city) {
    latestWeather = null;
    renderWeather();
    triggerEffects(TEST_CONFIG.forceWeather !== false ? TEST_CONFIG.forceWeather : 0);
    return;
  }

  if (hasFreshCache || hasFallbackCache) {
    latestWeather = {
      tempC: cache.tempC,
      cityLabel: cache.cityLabel || city,
      code: cache.code,
      isDay: cache.isDay,
      timestamp: cache.timestamp,
      fromCache: true,
    };
    renderWeather();
    if (typeof cache.code === "number") {
      triggerEffects(cache.code);
    }
    if (typeof cache.isDay === "boolean") {
      applyTheme(cache.isDay);
    }
  }

  if (hasFreshCache && !forceRefresh) {
    return;
  }

  if (weatherFetchInFlight) {
    return weatherFetchInFlight;
  }

  weatherFetchInFlight = (async () => {
    try {
      let location = null;
      if (
        hasFallbackCache &&
        typeof cache.latitude === "number" &&
        typeof cache.longitude === "number"
      ) {
        location = {
          latitude: cache.latitude,
          longitude: cache.longitude,
          name: cache.locationName || cache.cityLabel || city,
        };
      } else {
        location = await geocodeCity(city);
      }

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`,
      );

      if (!response.ok) {
        throw new Error("Could not load weather.");
      }

      const data = await response.json();
      const current = data?.current;
      if (!current) {
        throw new Error("Weather response missing current data.");
      }

      const timestamp = Date.now();
      const temp = Math.round(current.temperature_2m);
      const code = current.weather_code;
      const isDay = current.is_day === 1;
      const cityLabel = normalizeText(location.name) || city;

      applyTheme(isDay);
      triggerEffects(code);

      latestWeather = {
        tempC: temp,
        cityLabel,
        code,
        isDay,
        timestamp,
        fromCache: false,
      };
      renderWeather();

      writeWeatherCache(city, {
        tempC: temp,
        cityLabel,
        code,
        isDay,
        timestamp,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: cityLabel,
      });
    } catch {
      if (!hasFallbackCache) {
        latestWeather = {
          tempC: NaN,
          cityLabel: city,
        };
        renderWeather();
        triggerEffects(
          TEST_CONFIG.forceWeather !== false ? TEST_CONFIG.forceWeather : 0,
        );
      }
    } finally {
      weatherFetchInFlight = null;
    }
  })();

  return weatherFetchInFlight;
}

function refreshWeatherIfStale() {
  const city = getUserCity();
  if (!city) return;

  const cache = readWeatherCache(city);
  const now = Date.now();
  const isStale = !cache || now - cache.timestamp > WEATHER_CACHE_TTL_MS;
  if (!isStale) return;

  loadWeather({ forceRefresh: true });
}

function openOnboarding(prefillExisting) {
  if (prefillExisting && userProfile) {
    onboardingNameInput.value = userProfile.name;
    onboardingCityInput.value = userProfile.city;
  } else {
    onboardingNameInput.value = "";
    onboardingCityInput.value = "";
  }

  onboardingOverlay.classList.remove("hidden");
  onboardingOverlay.setAttribute("aria-hidden", "false");
  onboardingNameInput.focus();
}

function closeOnboarding() {
  onboardingOverlay.classList.add("hidden");
  onboardingOverlay.setAttribute("aria-hidden", "true");
}

if (onboardingForm) {
  onboardingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = normalizeText(onboardingNameInput.value);
    const city = normalizeText(onboardingCityInput.value);

    if (!name || !city) {
      window.alert("Please enter both your name and city.");
      return;
    }

    userProfile = { name, city };
    saveProfile(userProfile);
    closeOnboarding();
    markUserActive(true);
    updateClock();
    loadWeather({ forceRefresh: true });
  });
}

if (onboardingOverlay) {
  onboardingOverlay.addEventListener("click", (event) => {
    if (event.target !== onboardingOverlay) return;
    if (!userProfile) return;
    closeOnboarding();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (
    bookmarkModalOverlay &&
    !bookmarkModalOverlay.classList.contains("hidden")
  ) {
    closeBookmarkModal();
    return;
  }

  if (!onboardingOverlay || !userProfile) return;
  if (onboardingOverlay.classList.contains("hidden")) return;
  closeOnboarding();
});

setupActivityTracking();

triggerEffects(TEST_CONFIG.forceWeather !== false ? TEST_CONFIG.forceWeather : 0);

if (userProfile) {
  closeOnboarding();
  loadWeather();
} else {
  openOnboarding(false);
  latestWeather = null;
  renderWeather();
}
