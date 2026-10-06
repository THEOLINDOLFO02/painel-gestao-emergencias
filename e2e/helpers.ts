import { expect, type Page } from "@playwright/test";

export const tool = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

export async function openPanel(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /GESTÃO DE EMERGÊNCIAS/ }),
  ).toBeVisible();
}

export async function enterEditMode(page: Page) {
  await tool(page, "EDITAR PAINEL").click();
  await expect(tool(page, "CONCLUIR EDIÇÃO")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

// Posição atual (em px) de um bloco arrastável, lida do transform.
export async function blockOffset(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const wrapper = element.closest(".draggable-wrapper") as HTMLElement;
    const match = wrapper.style.transform.match(/translate3d\((-?\d+)px, (-?\d+)px/);
    return { x: Number(match?.[1] ?? 0), y: Number(match?.[2] ?? 0) };
  });
}

// Arrasta de um ponto a outro com o mouse, em passos (como uma pessoa faria).
export async function dragBetween(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}

export async function center(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`Elemento sem caixa: ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
