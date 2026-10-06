import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterEditMode, openPanel } from "./helpers";

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();

const summarize = (violations: Awaited<ReturnType<typeof scan>>["violations"]) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x — ${v.help}`);

test.describe("acessibilidade (axe)", () => {
  test("painel em modo de leitura", async ({ page }) => {
    await openPanel(page);
    const { violations } = await scan(page);
    expect(summarize(violations)).toEqual([]);
  });

  test("painel em modo de edição, com o painel de design", async ({ page }) => {
    await openPanel(page);
    await enterEditMode(page);
    const { violations } = await scan(page);
    expect(summarize(violations)).toEqual([]);
  });

  test("janela de versões", async ({ page }) => {
    await openPanel(page);
    await page.getByRole("button", { name: "VERSÕES", exact: true }).click();
    const { violations } = await scan(page);
    expect(summarize(violations)).toEqual([]);
  });
});
