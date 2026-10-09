import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTime, getGreeting } from "../assets/js/clock.js";
import { getHoliday } from "../assets/js/holidays.js";

// months are zero based, so month 9 is october
const at = (month, day, hours = 10, minutes = 0) =>
  new Date(2026, month - 1, day, hours, minutes);

describe("formatTime", () => {
  it("formats 24-hour time", () => {
    assert.deepEqual(formatTime(at(1, 5, 9, 5), "24"), {
      time: "9:05",
      period: "",
    });
    assert.deepEqual(formatTime(at(1, 5, 21, 30), "24"), {
      time: "21:30",
      period: "",
    });
  });

  it("formats 12-hour time", () => {
    assert.deepEqual(formatTime(at(1, 5, 0, 7), "12"), {
      time: "12:07",
      period: "AM",
    });
    assert.deepEqual(formatTime(at(1, 5, 12, 0), "12"), {
      time: "12:00",
      period: "PM",
    });
    assert.deepEqual(formatTime(at(1, 5, 21, 30), "12"), {
      time: "9:30",
      period: "PM",
    });
  });
});

describe("holidays", () => {
  it("doesn't decorate all of October for Halloween", () => {
    assert.equal(getHoliday(at(10, 9)), null);
    assert.equal(getHoliday(at(10, 24)), null);
    assert.equal(getHoliday(at(10, 25)).effect, "halloween");
    assert.equal(getHoliday(at(10, 25)).greeting, null);
    assert.equal(getHoliday(at(10, 31)).greeting, "Happy Halloween");
    assert.equal(getHoliday(at(11, 1)), null);
  });

  it("doesn't decorate all of December for Christmas", () => {
    assert.equal(getHoliday(at(12, 1)), null);
    assert.equal(getHoliday(at(12, 18)).effect, "christmas");
    assert.equal(getHoliday(at(12, 23)).greeting, null);
    assert.equal(getHoliday(at(12, 25)).greeting, "Merry Christmas");
    assert.equal(getHoliday(at(12, 27)), null);
  });

  it("celebrates New Year's Day with fireworks", () => {
    const holiday = getHoliday(at(1, 1));
    assert.equal(holiday.effect, "fireworks");
    assert.ok(holiday.colors.length > 0);
    assert.equal(getHoliday(at(1, 2)), null);
  });

  it("no longer has Canada Day", () => {
    assert.equal(getHoliday(at(7, 1)), null);
  });
});

describe("getGreeting", () => {
  it("greets by time of day", () => {
    assert.equal(getGreeting(at(10, 7, 8), "Sam"), "Good morning, Sam.");
    assert.equal(getGreeting(at(10, 7, 14), "Sam"), "Good afternoon, Sam.");
    assert.equal(getGreeting(at(10, 7, 20), "Sam"), "Good evening, Sam.");
  });

  it("has a Friday afternoon greeting", () => {
    // 9 october 2026 is a friday
    assert.equal(getGreeting(at(10, 9, 17), "Sam"), "Happy Friday, Sam.");
    assert.equal(getGreeting(at(10, 9, 15), "Sam"), "Good afternoon, Sam.");
  });

  it("uses the holiday greeting on the day itself", () => {
    assert.equal(getGreeting(at(10, 31, 9), "Sam"), "Happy Halloween, Sam.");
    assert.equal(getGreeting(at(10, 30, 9), "Sam"), "Good morning, Sam.");
  });
});
