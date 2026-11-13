import { describe, expect, it } from "vitest";
import { parseEngines, resolveEngine } from "./engine";

describe("parseEngines", () => {
  it("defaults to V1 only", () => {
    expect(parseEngines(undefined)).toEqual(["v1"]);
    expect(parseEngines("")).toEqual(["v1"]);
    expect(parseEngines("v3, nope")).toEqual(["v1"]);
  });
  it("keeps order, trims, lower-cases and drops duplicates", () => {
    expect(parseEngines("v2")).toEqual(["v2"]);
    expect(parseEngines(" V1 , v2,v1")).toEqual(["v1", "v2"]);
    expect(parseEngines("v2,v1")).toEqual(["v2", "v1"]);
  });
});

describe("resolveEngine", () => {
  const both = ["v1", "v2"] as const;
  it("prefers the URL, then storage, then the first enabled", () => {
    expect(resolveEngine(both, "v2", "v1")).toBe("v2");
    expect(resolveEngine(both, null, "v2")).toBe("v2");
    expect(resolveEngine(both, null, null)).toBe("v1");
  });
  it("ignores a choice that is not enabled in this build", () => {
    expect(resolveEngine(["v1"], "v2", "v2")).toBe("v1");
    expect(resolveEngine(["v2"], "v1", "v1")).toBe("v2");
    expect(resolveEngine(both, "junk", "v2")).toBe("v2");
  });
});
