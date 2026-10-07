import { expect, type Locator, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { enterEditMode, openPanel, tool } from "./helpers";

// Foto de teste 2:1, metade esquerda vermelha e metade direita azul.
async function twoColorPhoto(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e02020";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "#2020e0";
    ctx.fillRect(200, 0, 200, 200);
    return canvas.toDataURL("image/png");
  });
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function upload(page: Page, index: number, buffer: Buffer) {
  const chooser = page.waitForEvent("filechooser");
  await page.locator(".image-placeholder--editable").nth(index).click();
  await (await chooser).setFiles({ name: `foto${index}.png`, mimeType: "image/png", buffer });
}

type Color = "red" | "blue" | "other";

// Cor dominante de um ponto de uma imagem PNG (base64), em fração da largura/altura.
async function colorAt(page: Page, png: Buffer, fx: number, fy: number): Promise<Color> {
  return page.evaluate(
    async ({ base64, fx, fy }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const [r, , b] = ctx.getImageData(
        Math.round(fx * (bitmap.width - 1)),
        Math.round(fy * (bitmap.height - 1)),
        1,
        1,
      ).data;
      if (r > 150 && b < 100) return "red";
      if (b > 150 && r < 100) return "blue";
      return "other";
    },
    { base64: png.toString("base64"), fx, fy },
  );
}

const sample = async (page: Page, target: Locator, fx: number, fy: number) =>
  colorAt(page, await target.screenshot(), fx, fy);

test.describe("giro e espelhamento de fotos (pixels reais)", () => {
  test.beforeEach(async ({ page }) => {
    await openPanel(page);
    await enterEditMode(page);
    await upload(page, 0, await twoColorPhoto(page));
    await page.getByRole("button", { name: "AJUSTAR" }).click();
  });

  const placeholder = (page: Page) => page.locator(".image-placeholder").first();
  const left = (page: Page) => sample(page, placeholder(page), 0.2, 0.55);
  const right = (page: Page) => sample(page, placeholder(page), 0.8, 0.55);
  const top = (page: Page) => sample(page, placeholder(page), 0.5, 0.2);
  const bottom = (page: Page) => sample(page, placeholder(page), 0.5, 0.7);

  test("começa com vermelho à esquerda e azul à direita", async ({ page }) => {
    expect([await left(page), await right(page)]).toEqual(["red", "blue"]);
  });

  test("espelhar troca esquerda e direita; inverter troca cima e baixo", async ({ page }) => {
    await page.getByRole("button", { name: "⇋ Espelhar" }).click();
    expect([await left(page), await right(page)]).toEqual(["blue", "red"]);

    await page.getByRole("button", { name: "⇋ Espelhar" }).click(); // desfaz
    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    expect([await top(page), await bottom(page)]).toEqual(["red", "blue"]);

    await page.getByRole("button", { name: "⇅ Inverter" }).click();
    expect([await top(page), await bottom(page)]).toEqual(["blue", "red"]);
  });

  test("girar 90° no sentido horário leva a esquerda para cima, sem deixar bordas vazias", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    expect([await top(page), await bottom(page)]).toEqual(["red", "blue"]);

    // A foto de lado preenche todo o quadro (nenhum canto vazio).
    for (const [fx, fy] of [[0.04, 0.06], [0.96, 0.06], [0.04, 0.6], [0.96, 0.6]]) {
      expect(await sample(page, placeholder(page), fx, fy)).not.toBe("other");
    }

    // Anti-horário leva a esquerda para baixo.
    await page.getByRole("button", { name: "↺ Girar 90°" }).click(); // volta a 0
    await page.getByRole("button", { name: "↺ Girar 90°" }).click(); // 270°
    expect([await top(page), await bottom(page)]).toEqual(["blue", "red"]);
  });

  test("180° inverte esquerda e direita", async ({ page }) => {
    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    expect([await left(page), await right(page)]).toEqual(["blue", "red"]);
  });

  test("a foto girada é redesenhada (largura e altura trocadas) e preenche o quadro, inclusive na impressão", async ({
    page,
  }) => {
    const img = page.locator(".uploaded-image");
    const natural = () => img.evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight]);
    expect(await natural()).toEqual([400, 200]);

    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    await expect.poll(natural).toEqual([200, 400]);

    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const fit = await page.evaluate(() => {
        const box = document.querySelector(".image-placeholder")!.getBoundingClientRect();
        const photo = document.querySelector(".uploaded-image")!.getBoundingClientRect();
        return [photo.width - box.width, photo.height - box.height].map((n) => Math.round(Math.abs(n)));
      });
      expect(fit.every((diff) => diff <= 2)).toBe(true);
    }
  });

  test("giro e espelhamento continuam após recarregar", async ({ page }) => {
    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    await page.getByRole("button", { name: "⇋ Espelhar" }).click();
    await page.reload();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("defesa-civil-frames")!),
    );
    expect(Object.values(stored)[0]).toMatchObject({ rotate: 90, flipX: true });
    await expect(page.locator('.uploaded-image[data-rotate="90"]')).toHaveCount(1);
  });

  test("a exportação em PNG leva a foto girada", async ({ page }) => {
    await page.getByRole("button", { name: "↻ Girar 90°" }).click();
    const box = (await placeholder(page).boundingBox())!;
    const dash = (await page.locator(".dashboard").boundingBox())!;

    const download = page.waitForEvent("download");
    await tool(page, "PNG").click();
    const png = await readFile((await (await download).path())!);

    // A exportação sai com o painel inteiro, em escala 2; localiza a foto nela.
    const meta = await page.evaluate(
      async (base64) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        return { w: bitmap.width, h: bitmap.height };
      },
      png.toString("base64"),
    );
    const fx = (box.x - dash.x + box.width / 2) / dash.width;
    const topY = (box.y - dash.y + box.height * 0.2) / dash.height;
    const bottomY = (box.y - dash.y + box.height * 0.7) / dash.height;
    expect(meta.w).toBeGreaterThan(dash.width); // escala maior que 1
    expect(await colorAt(page, png, fx, topY)).toBe("red");
    expect(await colorAt(page, png, fx, bottomY)).toBe("blue");
  });
});

test.describe("copiar ajustes entre fotos (mouse real)", () => {
  test("cola em outra foto e aplica a todas", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    await openPanel(page);
    await enterEditMode(page);
    const photo = await twoColorPhoto(page);
    await upload(page, 0, photo);
    await upload(page, 1, photo);
    await upload(page, 2, photo);

    const panel = page.locator(".design-panel");
    await page.getByRole("button", { name: "AJUSTAR" }).first().click();
    await panel.getByRole("button", { name: "↻ Girar 90°" }).click();
    await panel.getByLabel("Transparência da foto").fill("40");
    await panel.getByRole("button", { name: "Copiar ajustes" }).click();

    // Segunda foto: cola.
    await page.getByRole("button", { name: "AJUSTAR" }).first().click(); // a primeira virou CONCLUIR
    await panel.getByRole("button", { name: "Colar nesta foto" }).click();
    const frames = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("defesa-civil-frames") ?? "{}"));
    let stored = Object.values(await frames()) as { rotate?: number; opacity?: number }[];
    expect(stored).toHaveLength(2);
    expect(stored.every((f) => f.rotate === 90 && f.opacity === 0.6)).toBe(true);

    // Terceira: aplica a todas (inclusive a que já tinha).
    await panel.getByRole("button", { name: "Aplicar a todas as fotos (3)" }).click();
    stored = Object.values(await frames()) as { rotate?: number; opacity?: number }[];
    expect(stored).toHaveLength(3);
    expect(stored.every((f) => f.rotate === 90 && f.opacity === 0.6)).toBe(true);

    await page.reload();
    await expect(page.locator('.uploaded-image[data-rotate="90"]')).toHaveCount(3);
  });
});
