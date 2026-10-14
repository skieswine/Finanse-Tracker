import { describe, expect, it } from "vitest";
import { addMonths, monthEnd, monthsBetween } from "./dates";

describe("month helpers", () => {
  it("counts months inclusively, across years", () => {
    expect(monthsBetween("2026-01", "2026-01")).toBe(1);
    expect(monthsBetween("2025-11", "2026-03")).toBe(5);
    expect(monthsBetween("2016-11", "2026-10")).toBe(120);
  });

  it("finds the last day of a month, including leap years", () => {
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(monthEnd("2026-12")).toBe("2026-12-31");
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", -119)).toBe("2016-11");
  });
});
