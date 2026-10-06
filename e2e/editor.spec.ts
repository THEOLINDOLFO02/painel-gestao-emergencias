import { expect, test } from "@playwright/test";
import {
  blockOffset,
  center,
  dragBetween,
  enterEditMode,
  openPanel,
  tool,
} from "./helpers";

test.describe("edição com mouse e teclado reais", () => {
  test.beforeEach(async ({ page }) => {
    await openPanel(page);
    await enterEditMode(page);
  });

  test("arrasta um bloco, ajusta à grade e mantém a posição após recarregar", async ({
    page,
  }) => {
    const card = ".triage-card--small";
    expect(await blockOffset(page, card)).toEqual({ x: 0, y: 0 });

    const handle = page.locator(`.draggable-wrapper > ${card}`).locator("xpath=..").locator(":scope > .drag-handle");
    const box = (await handle.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await dragBetween(page, from, { x: from.x + 83, y: from.y + 41 });

    const moved = await blockOffset(page, card);
    expect(moved.x).toBe(84); // 83 px arredondado para a grade de 4 px
    expect(moved.y).toBe(40);

    await page.reload();
    expect(await blockOffset(page, card)).toEqual(moved);
  });

  test("move um bloco pelas setas do teclado", async ({ page }) => {
    const card = ".triage-card--large";
    const handle = page.locator(`.draggable-wrapper > ${card}`).locator("xpath=..").locator(":scope > .drag-handle");
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    expect(await blockOffset(page, card)).toEqual({ x: 4, y: 20 });
  });

  test("insere uma forma, move e redimensiona com o mouse", async ({ page }) => {
    await page.getByRole("button", { name: "+ Retângulo" }).click();
    const shape = page.locator(".shape-item");
    await expect(shape).toHaveCount(1);
    const before = (await shape.boundingBox())!;

    // Move
    const start = await center(page, ".shape-item");
    await dragBetween(page, start, { x: start.x + 120, y: start.y + 60 });
    const moved = (await shape.boundingBox())!;
    expect(Math.round(moved.x - before.x)).toBe(120);
    expect(Math.round(moved.y - before.y)).toBe(60);

    // Redimensiona pelo canto
    const resize = (await page.locator(".shape-resize").boundingBox())!;
    const corner = { x: resize.x + resize.width / 2, y: resize.y + resize.height / 2 };
    await dragBetween(page, corner, { x: corner.x + 50, y: corner.y + 30 });
    const resized = (await shape.boundingBox())!;
    expect(Math.round(resized.width - moved.width)).toBe(50);
    expect(Math.round(resized.height - moved.height)).toBe(30);
  });

  test("edita um texto digitando e o mantém após recarregar", async ({ page }) => {
    const title = page.getByText("EM OPERAÇÃO", { exact: true });
    await title.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("EM ALERTA");
    await page.locator("body").click({ position: { x: 5, y: 5 } }); // tira o foco

    await expect(page.getByText("EM ALERTA", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("EM ALERTA", { exact: true })).toBeVisible();
    await expect(page.getByText("EM OPERAÇÃO", { exact: true })).toHaveCount(0);
  });

  test("Ctrl+Z e Ctrl+Y desfazem e refazem de verdade", async ({ page }) => {
    await page.getByRole("button", { name: "+ Círculo" }).click();
    await expect(page.locator(".shape-item")).toHaveCount(1);
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await page.keyboard.press("Control+Z");
    await expect(page.locator(".shape-item")).toHaveCount(0);
    await page.keyboard.press("Control+Y");
    await expect(page.locator(".shape-item")).toHaveCount(1);
  });

  test("troca a cor de destaque e a fonte e mantém após recarregar", async ({
    page,
  }) => {
    await page.getByLabel("Destaque").first().fill("#22cc88");
    await page.getByLabel("Títulos").selectOption("Oswald");

    const read = () =>
      page.evaluate(() => ({
        accent: document.documentElement.style.getPropertyValue("--orange"),
        font: getComputedStyle(document.querySelector(".main-title")!).fontFamily,
      }));
    expect(await read()).toEqual({ accent: "#22cc88", font: "Oswald, sans-serif" });

    await page.reload();
    expect(await read()).toEqual({ accent: "#22cc88", font: "Oswald, sans-serif" });
  });
});

test.describe("imagens", () => {
  test("envia uma imagem pelo seletor de arquivos e a mantém após recarregar", async ({
    page,
  }) => {
    await openPanel(page);
    await enterEditMode(page);

    // 1x1 px PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const chooser = page.waitForEvent("filechooser");
    await page.locator(".image-placeholder--editable").first().click();
    await (await chooser).setFiles({ name: "foto.png", mimeType: "image/png", buffer: png });

    await expect(page.locator(".uploaded-image")).toHaveCount(1);
    await page.reload();
    await expect(page.locator(".uploaded-image")).toHaveCount(1);
  });
});
