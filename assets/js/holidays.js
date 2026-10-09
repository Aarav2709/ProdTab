// dates are month * 100 + day, so 1031 is 31 october

const HOLIDAYS = [
  {
    id: "new-year",
    effect: "fireworks",
    colors: ["#ff0044", "#00ff44", "#4400ff", "#ffea00", "#00eaff", "#ff00aa"],
    effectDays: [101, 101],
    greetingDays: [101, 101],
    greeting: "Happy New Year",
  },
  {
    id: "halloween",
    effect: "halloween",
    effectDays: [1025, 1031],
    greetingDays: [1031, 1031],
    greeting: "Happy Halloween",
  },
  {
    id: "christmas",
    effect: "christmas",
    effectDays: [1218, 1226],
    greetingDays: [1224, 1225],
    greeting: "Merry Christmas",
  },
];

function inRange(dayOfYear, [start, end]) {
  return dayOfYear >= start && dayOfYear <= end;
}

export function getHoliday(date) {
  const dayOfYear = (date.getMonth() + 1) * 100 + date.getDate();
  const holiday = HOLIDAYS.find((item) => inRange(dayOfYear, item.effectDays));
  if (!holiday) return null;

  return {
    id: holiday.id,
    effect: holiday.effect,
    colors: holiday.colors || null,
    greeting: inRange(dayOfYear, holiday.greetingDays)
      ? holiday.greeting
      : null,
  };
}
