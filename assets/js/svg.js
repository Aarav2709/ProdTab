// builds svgs with dom calls since amo reviewers flag inner html

const SVG_NS = "http://www.w3.org/2000/svg";

export function createSvg(attributes, shapes) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  Object.entries(attributes).forEach(([name, value]) =>
    svg.setAttribute(name, value),
  );

  shapes.forEach(([tagName, shapeAttributes]) => {
    const shape = document.createElementNS(SVG_NS, tagName);
    Object.entries(shapeAttributes).forEach(([name, value]) =>
      shape.setAttribute(name, value),
    );
    svg.appendChild(shape);
  });

  return svg;
}

const STROKE_ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

const ICONS = {
  globe: [
    ["circle", { cx: "12", cy: "12", r: "9" }],
    ["path", { d: "M3 12h18" }],
    ["path", { d: "M12 3a15 15 0 0 1 0 18" }],
    ["path", { d: "M12 3a15 15 0 0 0 0 18" }],
  ],
  edit: [
    ["path", { d: "M12 20h9" }],
    ["path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" }],
  ],
  delete: [
    ["line", { x1: "18", y1: "6", x2: "6", y2: "18" }],
    ["line", { x1: "6", y1: "6", x2: "18", y2: "18" }],
  ],
};

export function createIcon(name) {
  return createSvg(STROKE_ICON, ICONS[name]);
}
