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

test.describe("acessibilidade (axe): recursos novos", () => {
  test("foto em enquadramento, janela de modelos e aviso de contraste", async ({ page }) => {
    await openPanel(page);
    await enterEditMode(page);

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const chooser = page.waitForEvent("filechooser");
    await page.locator(".image-placeholder--editable").first().click();
    await (await chooser).setFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "ENQUADRAR" }).click();
    await page.locator(".design-panel").getByLabel("Texto", { exact: true }).first().fill("#0a1018"); // dispara o aviso

    // As cores ruins escolhidas de propósito acima fariam o axe reclamar de
    // contraste; aqui só interessa a estrutura dos recursos novos.
    const structural = () =>
      new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .disableRules(["color-contrast"])
        .analyze();

    let { violations } = await structural();
    expect(summarize(violations)).toEqual([]);

    await page.getByRole("button", { name: "MODELOS", exact: true }).click();
    ({ violations } = await structural());
    expect(summarize(violations)).toEqual([]);
  });
});
