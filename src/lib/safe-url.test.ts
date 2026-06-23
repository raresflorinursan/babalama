import { describe, expect, it } from "vitest";
import { safeUrl } from "./safe-url";

describe("safeUrl", () => {
  it.each(["https://solvix.example/project", "http://localhost:8080/demo"])(
    "accepts an HTTP(S) URL: %s",
    (url) => {
      expect(safeUrl(url)).toBe(url);
    },
  );

  it.each([null, undefined, "", "javascript:alert(1)", "data:text/html,test", "not a url"])(
    "rejects unsafe or invalid input: %s",
    (url) => {
      expect(safeUrl(url)).toBeUndefined();
    },
  );
});
