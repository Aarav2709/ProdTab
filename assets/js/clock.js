import { getHoliday } from "./holidays.js";

export function formatTime(date, format) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (format === "12") {
    return {
      time: `${hours % 12 || 12}:${minutes}`,
      period: hours < 12 ? "AM" : "PM",
    };
  }

  return { time: `${hours}:${minutes}`, period: "" };
}

export function getGreeting(date, name) {
  const holiday = getHoliday(date);
  if (holiday?.greeting) return `${holiday.greeting}, ${name}.`;

  const hours = date.getHours();
  if (date.getDay() === 5 && hours >= 16) return `Happy Friday, ${name}.`;
  if (hours < 12) return `Good morning, ${name}.`;
  if (hours < 18) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

// renders now and again right as each minute starts
export function startClock(render) {
  let timerId = null;

  const tick = () => {
    render(new Date());
    const now = new Date();
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 20;
    clearTimeout(timerId);
    timerId = setTimeout(tick, msToNextMinute);
  };

  // background tabs throttle timers, so catch up when the tab is shown
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });

  tick();
}
