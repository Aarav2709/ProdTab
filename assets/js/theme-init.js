// applies the last theme before first paint so dark mode never flashes light
(function () {
  try {
    var preference = localStorage.getItem("prodtab.theme.v1") || "auto";
    var mode = null;

    if (preference === "light" || preference === "dark") {
      mode = preference;
    } else if (preference === "auto") {
      mode = localStorage.getItem("prodtab.theme.resolved.v1");
    }

    if (mode !== "light" && mode !== "dark") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    document.documentElement.classList.toggle("dark-theme", mode === "dark");
  } catch {
    // storage unavailable, theme.js applies the theme once it loads
  }
})();
