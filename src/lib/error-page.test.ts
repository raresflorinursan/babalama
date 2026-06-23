import { describe, expect, it } from "vitest";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("returns a standalone recovery page", () => {
    const html = renderErrorPage();

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("location.reload()");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("<script");
  });
});
