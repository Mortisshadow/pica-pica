import { describe, expect, it } from "vitest";
import { formatDuration, normalizeGameName, pluralizeClips } from "./utils";

describe("formatDuration", () => {
  it("formats short and long clips consistently", () => {
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(null)).toBe("–:––");
  });
});

describe("normalizeGameName", () => {
  it("normalizes folder separators and marks", () => {
    expect(normalizeGameName("  OVERWATCH™_2 ")).toBe("overwatch 2");
  });
});

describe("pluralizeClips", () => {
  it("uses the singular only for one clip", () => {
    expect(pluralizeClips(1)).toBe("1 Clip");
    expect(pluralizeClips(2)).toBe("2 Clips");
  });
});
