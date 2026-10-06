import { expect, test } from "@playwright/test";
import { openPanel, tool } from "./helpers";

test.describe("exportação", () => {
  test.beforeEach(async ({ page }) => {
    await openPanel(page);
  });

  test("PNG baixa uma imagem PNG de verdade", async ({ page }) => {
    const download = page.waitForEvent("download");
    await tool(page, "PNG").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("painel-defesa-civil.png");

    const bytes = await (await import("node:fs/promises")).readFile(
      (await file.path())!,
    );
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.length).toBeGreaterThan(20_000);
  });

  test("JPEG baixa uma imagem JPEG de verdade", async ({ page }) => {
    const download = page.waitForEvent("download");
    await tool(page, "JPEG").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("painel-defesa-civil.jpg");

    const bytes = await (await import("node:fs/promises")).readFile(
      (await file.path())!,
    );
    expect(bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
    expect(bytes.length).toBeGreaterThan(20_000);
  });

  test("a exportação não leva a barra de ferramentas nem o painel de design", async ({
    page,
  }) => {
    await tool(page, "EDITAR PAINEL").click();
    const download = page.waitForEvent("download");
    await tool(page, "PNG").click();
    await download;
    // Depois de exportar, o modo de edição volta como estava.
    await expect(tool(page, "CONCLUIR EDIÇÃO")).toBeVisible();
    await expect(page.getByLabel("Cores, fontes e formas")).toBeVisible();
  });

  test("Salvar projeto baixa um JSON que Abrir projeto reabre", async ({ page }) => {
    // Edita um texto para ter o que conferir depois
    await tool(page, "EDITAR PAINEL").click();
    await page.getByText("EM OPERAÇÃO", { exact: true }).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("EM ALERTA");
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    const download = page.waitForEvent("download");
    await tool(page, "SALVAR PROJETO").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("painel-defesa-civil.json");
    const project = JSON.parse(
      (await (await import("node:fs/promises")).readFile((await file.path())!)).toString(),
    );
    expect(project.texts["EM OPERAÇÃO"]).toBe("EM ALERTA");

    // Limpa e reabre
    page.on("dialog", (dialog) => dialog.accept());
    await tool(page, "LIMPAR CONTEÚDO").click();
    await expect(page.getByText("EM OPERAÇÃO", { exact: true })).toBeVisible();

    const chooser = page.waitForEvent("filechooser");
    await tool(page, "ABRIR PROJETO").click();
    await (await chooser).setFiles(await file.path());
    await expect(page.getByText("EM ALERTA", { exact: true })).toBeVisible();
  });
});

test.describe("impressão", () => {
  test("o PDF sai em duas páginas A3 paisagem", async ({ page }) => {
    await openPanel(page);
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });

    const text = pdf.toString("latin1");
    const pages = text.match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages).toHaveLength(2);
    // A3 paisagem: 1190,55 x 841,89 pt
    const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
    expect(Number(box?.[1])).toBeGreaterThan(1180);
    expect(Number(box?.[2])).toBeGreaterThan(830);
    expect(Number(box?.[1])).toBeGreaterThan(Number(box?.[2]));
  });

  test("esconde barra de ferramentas e painel na impressão", async ({ page }) => {
    await openPanel(page);
    await tool(page, "EDITAR PAINEL").click();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("toolbar")).toBeHidden();
    await expect(page.getByLabel("Cores, fontes e formas")).toBeHidden();
  });
});
