import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy strings with a space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("flattens nested arrays", () => {
    expect(cn("a", ["b", ["c", false, "d"]])).toBe("a b c d");
  });

  it("returns an empty string when given nothing usable", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });
});
