import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { enterEditMode, openPanel, tool } from "./helpers";

const table = (page: Page) => page.getByRole("table", { name: /Pluviômetros do CEMADEN/ });

test.describe("dados ao vivo", () => {
  test("mostra a chuva e as estações nos cartões de Precipitação e Indicadores", async ({
    page,
  }) => {
    await openPanel(page);
    await expect(page.getByRole("img", { name: /Chuva por hora em Cajamar/ })).toBeVisible();
    await expect(table(page)).toBeVisible();
    await expect(table(page).getByRole("rowheader")).toHaveCount(3);
    await expect(table(page).getByRole("rowheader", { name: /Fazenda Grande/ })).toBeVisible();
    await expect(page.getByText(/Fonte: CEMADEN\/MCTI/)).toBeVisible();
    await expect(page.getByText(/Open-Meteo\.com/)).toBeVisible();

    // O gráfico desenha uma barra por hora (24 h para trás + 48 h para frente).
    const bars = await page.locator(".rain-bar").count();
    expect(bars).toBeGreaterThanOrEqual(72);
    expect(await page.locator(".rain-bar--past").count()).toBeGreaterThan(0);
    expect(await page.locator(".rain-bar--next").count()).toBeGreaterThan(0);
  });

  test("os cartões ao vivo cabem no layout: sem rolagem lateral e sem estourar o cartão", async ({
    page,
  }) => {
    await openPanel(page);
    await expect(table(page)).toBeVisible();
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const cards = [...document.querySelectorAll<HTMLElement>(".live-slot")].map(
        (slot) => slot.scrollWidth - slot.clientWidth,
      );
      return { page: root.scrollWidth - root.clientWidth, cards };
    });
    expect(overflow.page).toBeLessThanOrEqual(0);
    expect(overflow.cards.every((diff) => diff <= 1)).toBe(true);
  });

  test("no modo edição, USAR FOTO NO LUGAR troca os dados por uma foto, e REMOVER traz os dados de volta", async ({
    page,
  }) => {
    await openPanel(page);
    await enterEditMode(page);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "USAR FOTO NO LUGAR" }).last().click();
    await (await chooser).setFiles({ name: "chuva.png", mimeType: "image/png", buffer: png });

    await expect(page.locator(".uploaded-image")).toHaveCount(1);
    await expect(page.getByRole("img", { name: /Chuva por hora/ })).toHaveCount(0);
    await expect(table(page)).toBeVisible(); // o outro cartão segue ao vivo

    await page.getByRole("button", { name: "REMOVER", exact: true }).click();
    await expect(page.getByRole("img", { name: /Chuva por hora/ })).toBeVisible();
  });

  test("desligar nos ajustes devolve os espaços para foto, e a escolha fica salva", async ({
    page,
  }) => {
    await openPanel(page);
    await enterEditMode(page);
    await page.getByLabel("Mostrar dados ao vivo nos cartões").uncheck();
    await expect(table(page)).toHaveCount(0);
    await expect(page.getByText(/Gráfico climático/)).toBeVisible();

    await page.reload();
    await expect(table(page)).toHaveCount(0);
    await expect(page.getByText("Gráfico climático")).toBeVisible();
  });

  test("as faixas de alerta mudam o nível mostrado", async ({ page }) => {
    await openPanel(page);
    const row = page.getByRole("row", { name: /Parque Paulista/ });
    await expect(row).toContainText("Atenção");

    await enterEditMode(page);
    await page.getByLabel("Alerta (mm/24 h)").fill("30");
    await expect(row).toContainText("Alerta");
    await page.getByLabel("Atenção (mm/24 h)").fill("40");
    // 35 mm já não atinge a atenção (40), mas o alerta nunca fica abaixo dela.
    await expect(row).toContainText("Normal");
  });

  test("com as fontes fora do ar, mostra avisos claros e o resto do painel funciona", async ({
    page,
  }) => {
    await openPanel(page, { rain: "fail", stations: "fail" });
    await expect(page.getByText("Previsão de chuva indisponível")).toBeVisible();
    await expect(page.getByText("Estações do CEMADEN indisponíveis")).toBeVisible();
    await enterEditMode(page);
    await expect(tool(page, "CONCLUIR EDIÇÃO")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(2);
  });

  test("a exportação em PNG funciona com os dados ao vivo na tela", async ({ page }) => {
    await openPanel(page);
    await expect(table(page)).toBeVisible();
    const download = page.waitForEvent("download");
    await tool(page, "PNG").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("painel-defesa-civil.png");
    const bytes = await (await import("node:fs/promises")).readFile((await file.path())!);
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.length).toBeGreaterThan(30_000);
  });

  test("o PDF continua em duas páginas A3 com os cartões ao vivo", async ({ page }) => {
    await openPanel(page);
    await expect(table(page)).toBeVisible();
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages).toHaveLength(2);
  });

  test("sem violações de acessibilidade com os cartões ao vivo (axe)", async ({ page }) => {
    await openPanel(page);
    await expect(table(page)).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x — ${v.help}`),
    ).toEqual([]);
  });

  test("sem violações de acessibilidade com os avisos de indisponível", async ({ page }) => {
    await openPanel(page, { rain: "fail", stations: "fail" });
    await expect(page.getByText("Previsão de chuva indisponível")).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
