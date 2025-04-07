import { describe, expect, test } from "vitest";
import { normalizeValue } from "./normalizeValue";

describe("getFontStyleAndWeight", () => {
  test("Lossy float", () => {
    expect(
      normalizeValue({
        variableValue: 0.40000000200345043,
        variableType: "FLOAT",
        variableScope: [],
        colorMode: "hex",
        isDTCGForamt: false,
        includeValueAliasString: false,
      })
    ).toBe("0.4px")
  });
});
