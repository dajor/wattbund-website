import { describe, expect, it } from "vitest";
import { createApproximatePoint } from "@/lib/privacy";

describe("createApproximatePoint", () => {
  it("moves a location by the configured distance without exposing the exact point", () => {
    const exact: [number, number] = [11.8182, 48.1717];
    const approximate = createApproximatePoint(exact, 375, 90);
    expect(approximate).not.toEqual(exact);
    expect(approximate[0]).toBeGreaterThan(exact[0]);
    expect(Math.abs(approximate[1] - exact[1])).toBeLessThan(0.0001);
  });
});
