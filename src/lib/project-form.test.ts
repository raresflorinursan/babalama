import { describe, expect, it } from "vitest";
import { EMPTY_PROJECT_FORM, parseTechnologies, validateProjectForm } from "./project-form";

describe("project form helpers", () => {
  it("deduplicates and caps technologies", () => {
    expect(parseTechnologies("React, Supabase, React, TypeScript")).toEqual([
      "React",
      "Supabase",
      "TypeScript",
    ]);
    expect(
      parseTechnologies(Array.from({ length: 30 }, (_, index) => `Tech${index}`).join(",")),
    ).toHaveLength(20);
  });

  it("requires a title and summary", () => {
    expect(validateProjectForm(EMPTY_PROJECT_FORM)).toContain("Pflicht");
  });

  it("rejects unsafe project URLs", () => {
    expect(
      validateProjectForm({
        ...EMPTY_PROJECT_FORM,
        title: "Test",
        short_description: "Beschreibung",
        demo_url: "javascript:alert(1)",
      }),
    ).toContain("http:// oder https://");
  });

  it("accepts a complete project", () => {
    expect(
      validateProjectForm({
        ...EMPTY_PROJECT_FORM,
        title: "Test",
        short_description: "Beschreibung",
        github_url: "https://github.com/example/project",
      }),
    ).toBeNull();
  });
});
