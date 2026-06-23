import { describe, expect, it } from "vitest";
import {
  buildPublicShareUrl,
  isSolvixOwner,
  normalizeUsername,
  validateUsername,
} from "./platform-security";

describe("username security", () => {
  it("normalizes spacing, casing and diacritics", () => {
    expect(normalizeUsername("  Rarés Dev  ")).toBe("raresdev");
  });

  it.each([
    "solvix",
    "SolvixCEO",
    "solvix_support",
    "s0lvix",
    "sölvix",
    "sоlvix",
    "official",
    "moderator",
  ])("blocks reserved or impersonating username %s", (username) => {
    expect(validateUsername(username)).toMatchObject({
      valid: false,
      message: "Der Name ist schon vergeben.",
    });
  });

  it("allows the owner to use reserved Solvix names", () => {
    expect(validateUsername("SolvixCEO", { allowReserved: true })).toMatchObject({
      valid: true,
      username: "solvixceo",
    });
  });

  it("accepts a regular username", () => {
    expect(validateUsername("mia_codes")).toEqual({
      valid: true,
      username: "mia_codes",
      message: "",
    });
  });

  it("recognizes only the configured platform owner", () => {
    expect(isSolvixOwner("a87436d3-f228-4145-8e1d-1426a98c0d50")).toBe(true);
    expect(isSolvixOwner("00000000-0000-0000-0000-000000000000")).toBe(false);
  });
});

describe("public share URLs", () => {
  it("never shares a localhost URL", () => {
    expect(buildPublicShareUrl("community?tweet=123")).toBe(
      "https://babalama.vercel.app/community?tweet=123",
    );
  });
});
