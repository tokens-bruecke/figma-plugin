import { describe, expect, test } from "vitest";
import { getFontStyleAndWeight } from "./getFontStyleAndWeight";

describe("getFontStyleAndWeight", () => {
  test("Semi Bold", () => {
    expect(getFontStyleAndWeight("Semi Bold")).toMatchObject({
      weight: 600,
      style: "normal",
    });
  });

  test("Semi Bold Italic", () => {
    expect(getFontStyleAndWeight("Semi Bold Italic")).toMatchObject({
      weight: 600,
      style: "italic",
    });
  });

  test("Bold Italic", () => {
    expect(getFontStyleAndWeight("Bold Italic")).toMatchObject({
      weight: 700,
      style: "italic",
    });
  });

  test("Light", () => {
    expect(getFontStyleAndWeight("Light")).toMatchObject({
      weight: 300,
      style: "normal",
    });
  });

  test("SemiBold-Italic", () => {
    expect(getFontStyleAndWeight("SemiBold-Italic")).toMatchObject({
      weight: 600,
      style: "italic",
    });
  });

  test("SemiBold", () => {
    expect(getFontStyleAndWeight("SemiBold")).toMatchObject({
      weight: 600,
      style: "normal",
    });
  });

  test("Semi-Bold-Italic", () => {
    expect(getFontStyleAndWeight("Semi-Bold-Italic")).toMatchObject({
      weight: 600,
      style: "italic",
    });
  });

  test("700", () => {
    expect(getFontStyleAndWeight("700 italic")).toMatchObject({
      weight: 700,
      style: "italic",
    });
  });
});
