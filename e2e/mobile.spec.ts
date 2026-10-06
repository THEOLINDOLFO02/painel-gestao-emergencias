import { expect, test } from "@playwright/test";
import { openPanel, tool } from "./helpers";

test.describe("celular", () => {
  test("não tem rolagem horizontal", async ({ page }) => {
    await openPanel(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("a barra de ferramentas não gruda na tela e não cobre o conteúdo", async ({
    page,
  }) => {
    await openPanel(page);
    const position = await page
      .getByRole("toolbar")
      .evaluate((element) => getComputedStyle(element).position);
    expect(position).not.toBe("sticky");
  });

  test("o painel de design começa recolhido e abre com um toque", async ({ page }) => {
    await openPanel(page);
    await tool(page, "EDITAR PAINEL").tap();
    const toggle = page.getByRole("button", { name: /Cores, fontes e formas/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    const collapsed = (await page.locator(".design-panel").boundingBox())!;
    expect(collapsed.height).toBeLessThan(80);

    await toggle.tap();
    const expanded = (await page.locator(".design-panel").boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(expanded.height).toBeLessThanOrEqual(viewport.height * 0.5 + 1);
    expect(expanded.x).toBeGreaterThanOrEqual(0);
    expect(expanded.x + expanded.width).toBeLessThanOrEqual(viewport.width);
  });

  test("as alças de arrastar não rolam a página (touch-action: none)", async ({
    page,
  }) => {
    await openPanel(page);
    await tool(page, "EDITAR PAINEL").tap();
    const touchAction = await page
      .locator(".drag-handle")
      .first()
      .evaluate((element) => getComputedStyle(element).touchAction);
    expect(touchAction).toBe("none");
  });

  test("os botões da barra têm área de toque de pelo menos 34 px", async ({ page }) => {
    await openPanel(page);
    const heights = await page
      .locator("button.tool-control")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().height),
      );
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(34);
  });
});
