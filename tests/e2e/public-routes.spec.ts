import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openReady(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("home exposes the primary product paths", async ({ page }) => {
  await openReady(page, "/");

  await expect(
    page.getByRole("heading", { name: "Entdecke, teile und baue Coding- und KI-Projekte." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Projekte entdecken", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kostenlos starten" })).toHaveAttribute(
    "href",
    "/auth",
  );
});

test("learning projects preserve their module context", async ({ page }) => {
  await openReady(page, "/learn");
  await page.getByRole("tab", { name: "Projekte" }).click();

  const projectCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Problem-Solver Canvas" }) });
  const projectLink = projectCard.getByRole("link", { name: "Projekt starten" });
  await expect(projectLink).toHaveAttribute(
    "href",
    "/upload-project?module=foundations&challenge=Problem-Solver+Canvas",
  );
});

test("protected project uploads redirect anonymous visitors to auth", async ({ page }) => {
  await openReady(page, "/upload-project?module=foundations&challenge=Problem-Solver+Canvas");

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Willkommen bei Solvix" })).toBeVisible();
});

test("project editing is protected for anonymous visitors", async ({ page }) => {
  await openReady(page, "/edit-project/00000000-0000-0000-0000-000000000000");

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Willkommen bei Solvix" })).toBeVisible();
});

test("the moderation area is protected for anonymous visitors", async ({ page }) => {
  await openReady(page, "/admin");

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Willkommen bei Solvix" })).toBeVisible();
});

test("unknown routes provide a recovery path", async ({ page }) => {
  await openReady(page, "/diese-seite-gibt-es-nicht");

  await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
});

test("mobile navigation opens without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only navigation check");
  await openReady(page, "/");

  const menuButton = page.getByRole("button", { name: "Menü öffnen" });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(page.getByRole("button", { name: "Menü schließen" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.getByRole("link", { name: "Community" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("keyboard users can skip directly to the main content", async ({ page }) => {
  await openReady(page, "/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Zum Hauptinhalt" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

for (const route of ["/", "/learn", "/community", "/auth"]) {
  test(`${route} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
    await openReady(page, route);

    if (route === "/") {
      await expect(
        page.getByRole("heading", { name: "Entdecke, teile und baue Coding- und KI-Projekte." }),
      ).toBeVisible();
    } else if (route === "/learn") {
      await expect(
        page.getByRole("heading", {
          name: "Baue echte KI- und Coding-Projekte statt nur Theorie zu lernen.",
        }),
      ).toBeVisible();
    } else if (route === "/community") {
      await expect(
        page.getByPlaceholder("Posts, Personen, Kategorien oder #Coding suchen"),
      ).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "Willkommen bei Solvix" })).toBeVisible();
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      })),
    ).toEqual([]);
  });
}
