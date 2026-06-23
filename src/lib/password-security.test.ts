import { describe, expect, it } from "vitest";
import { validatePassword } from "./password-security";

describe("validatePassword", () => {
  it.each([
    ["Short1!", "mindestens 10 Zeichen"],
    ["lowercase123!", "Groß- und Kleinbuchstaben"],
    ["NoDigitsHere!", "mindestens eine Zahl"],
    ["NoSymbols123", "mindestens ein Sonderzeichen"],
  ])("rejects an invalid password", (password, message) => {
    expect(validatePassword(password)).toContain(message);
  });

  it("accepts a password matching the Supabase policy", () => {
    expect(validatePassword("Solvix2026!")).toBeNull();
  });
});
