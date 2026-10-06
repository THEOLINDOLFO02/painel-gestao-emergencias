import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

const button = (name: string | RegExp) => screen.getByRole("button", { name });

const enterEditMode = async () => {
  await userEvent.click(button("EDITAR PAINEL"));
};

const panelSection = (title: string) => {
  const heading = screen.getByRole("heading", { name: title, level: 3 });
  return within(heading.parentElement as HTMLElement);
};

// Edita um texto como o navegador faria: altera o conteúdo e sai do campo.
const editText = (original: string, next: string) => {
  const field = screen.getAllByText(original)[0];
  field.textContent = next;
  fireEvent.blur(field);
};

const readIdb = (key: string) =>
  new Promise<unknown>((resolve, reject) => {
    const open = indexedDB.open("painel-defesa-civil", 1);
    open.onsuccess = () => {
      const get = open.result.transaction("kv").objectStore("kv").get(key);
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    };
    open.onerror = () => reject(open.error);
  });

// Substitui o seletor de arquivo do navegador por um arquivo fixo.
const pickFile = (file: File) =>
  vi
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementation(function (this: HTMLInputElement) {
      if (this.type !== "file") return;
      Object.defineProperty(this, "files", { value: [file] });
      this.onchange?.(new Event("change"));
    });

describe("painel", () => {
  it("mostra o título e as cinco fases", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: /GESTÃO DE EMERGÊNCIAS/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });

  it("alterna o modo de edição e mostra o painel de design", async () => {
    render(<App />);
    expect(screen.queryByLabelText("Cores, fontes e formas")).toBeNull();
    await enterEditMode();
    expect(button("CONCLUIR EDIÇÃO")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Cores, fontes e formas")).toBeInTheDocument();
  });
});

describe("textos editáveis", () => {
  it("salva o texto editado e o mantém após recarregar", async () => {
    const { unmount } = render(<App />);
    await enterEditMode();
    editText("EM OPERAÇÃO", "EM ALERTA");
    await waitFor(() =>
      expect(window.localStorage.getItem("defesa-civil-texts")).toContain(
        "EM ALERTA",
      ),
    );
    unmount();

    render(<App />);
    expect(screen.getByText("EM ALERTA")).toBeInTheDocument();
    expect(screen.queryByText("EM OPERAÇÃO")).toBeNull();
  });

  it("restaura só o texto escolhido", async () => {
    render(<App />);
    await enterEditMode();
    editText("EM OPERAÇÃO", "EM ALERTA");
    editText("ASSISTÊNCIA", "AJUDA");
    const restore = await screen.findAllByRole("button", {
      name: "Restaurar texto original",
    });
    expect(restore).toHaveLength(2);

    await userEvent.click(
      screen.getByTitle("Restaurar texto original: EM OPERAÇÃO"),
    );
    expect(screen.getByText("EM OPERAÇÃO")).toBeInTheDocument();
    expect(screen.getByText("AJUDA")).toBeInTheDocument();
  });
});

describe("desfazer e refazer", () => {
  it("começa desativado e acompanha mudanças de cor", async () => {
    render(<App />);
    expect(button("DESFAZER")).toBeDisabled();
    expect(button("REFAZER")).toBeDisabled();

    await enterEditMode();
    const accent = panelSection("CORES").getByLabelText("Destaque");
    fireEvent.change(accent, { target: { value: "#22cc88" } });
    expect(document.documentElement.style.getPropertyValue("--orange")).toBe(
      "#22cc88",
    );

    await waitFor(() => expect(button("DESFAZER")).toBeEnabled());
    await userEvent.click(button("DESFAZER"));
    expect(document.documentElement.style.getPropertyValue("--orange")).toBe(
      "#ff8a24",
    );
    expect(button("REFAZER")).toBeEnabled();

    await userEvent.click(button("REFAZER"));
    expect(document.documentElement.style.getPropertyValue("--orange")).toBe(
      "#22cc88",
    );
  });

  it("desfaz com Ctrl+Z", async () => {
    render(<App />);
    await enterEditMode();
    await userEvent.click(button("+ Círculo"));
    expect(document.querySelectorAll(".shape-item")).toHaveLength(1);

    await userEvent.keyboard("{Control>}z{/Control}");
    expect(document.querySelectorAll(".shape-item")).toHaveLength(0);
    await userEvent.keyboard("{Control>}y{/Control}");
    expect(document.querySelectorAll(".shape-item")).toHaveLength(1);
  });
});

describe("formas", () => {
  it("insere, move pelo teclado e exclui", async () => {
    render(<App />);
    await enterEditMode();
    await userEvent.click(button("+ Retângulo"));

    const shape = screen.getByRole("button", { name: /Forma: retângulo/ });
    const left = parseInt(shape.style.left);
    fireEvent.keyDown(shape, { key: "ArrowRight", shiftKey: true });
    expect(parseInt(shape.style.left)).toBe(left + 20);

    await userEvent.click(button("Excluir forma"));
    expect(document.querySelectorAll(".shape-item")).toHaveLength(0);
    expect(window.localStorage.getItem("defesa-civil-shapes")).toBe("[]");
  });

  it("esconde as formas dos leitores de tela fora do modo edição", async () => {
    render(<App />);
    await enterEditMode();
    await userEvent.click(button("+ Seta"));
    await userEvent.click(button("CONCLUIR EDIÇÃO"));
    expect(document.querySelector(".shape-item")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("cores por bloco", () => {
  it("personaliza só o bloco clicado e remove a personalização", async () => {
    render(<App />);
    await enterEditMode();
    const small = document.querySelector(".triage-card--small") as HTMLElement;
    const other = document.querySelector(".triage-card--large") as HTMLElement;
    await userEvent.click(small);

    const block = panelSection("BLOCO SELECIONADO");
    expect(block.getByText("Nível 01")).toBeInTheDocument();
    fireEvent.change(block.getByLabelText("Fundo"), {
      target: { value: "#3a1030" },
    });

    const wrapper = small.parentElement as HTMLElement;
    expect(wrapper.style.getPropertyValue("--block-bg")).toBe("#3a1030");
    expect(wrapper).toHaveClass("has-block-bg");
    expect((other.parentElement as HTMLElement).style.getPropertyValue("--block-bg")).toBe("");

    await userEvent.click(button("Remover personalização"));
    expect(wrapper).not.toHaveClass("has-block-bg");
    expect(window.localStorage.getItem("defesa-civil-blocks")).toBe("{}");
  });
});

describe("projeto em arquivo", () => {
  it("salva e reabre textos, cores e formas", async () => {
    let saved: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      saved = blob as Blob;
      return "blob:teste";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);
    await enterEditMode();
    editText("EM OPERAÇÃO", "EM ALERTA");
    fireEvent.change(panelSection("CORES").getByLabelText("Destaque"), {
      target: { value: "#22cc88" },
    });
    await userEvent.click(button("+ Círculo"));

    await userEvent.click(button("SALVAR PROJETO"));
    const project = JSON.parse(await saved!.text());
    expect(project).toMatchObject({
      app: "painel-defesa-civil",
      version: 1,
      texts: { "EM OPERAÇÃO": "EM ALERTA" },
      theme: { accent: "#22cc88" },
    });
    expect(project.shapes).toHaveLength(1);

    await userEvent.click(button("LIMPAR CONTEÚDO"));
    expect(screen.queryByText("EM ALERTA")).toBeNull();

    pickFile(
      new File([JSON.stringify(project)], "p.json", {
        type: "application/json",
      }),
    );
    await userEvent.click(button("ABRIR PROJETO"));
    await waitFor(() =>
      expect(screen.getByText("EM ALERTA")).toBeInTheDocument(),
    );
    expect(document.querySelectorAll(".shape-item")).toHaveLength(1);
  });

  it("recusa arquivos que não são do painel", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    pickFile(new File(['{"outro":true}'], "x.json"));
    render(<App />);
    await userEvent.click(button("ABRIR PROJETO"));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(alert.mock.calls[0][0]).toMatch(/Não foi possível abrir/);
  });

  it("recusa JSON inválido sem alterar o painel", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    pickFile(new File(["isso não é json"], "x.json"));
    render(<App />);
    await userEvent.click(button("ABRIR PROJETO"));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(screen.getByText("EM OPERAÇÃO")).toBeInTheDocument();
  });
});

describe("imagens", () => {
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  it("guarda as imagens no IndexedDB, e não no localStorage", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    pickFile(
      new File(
        [JSON.stringify({ app: "painel-defesa-civil", images: { "monitor-map": png } })],
        "p.json",
      ),
    );
    render(<App />);
    await userEvent.click(button("ABRIR PROJETO"));

    await waitFor(() =>
      expect(document.querySelectorAll(".uploaded-image")).toHaveLength(1),
    );
    await waitFor(async () =>
      expect(await readIdb("defesa-civil-images")).toEqual({ "monitor-map": png }),
    );
    expect(window.localStorage.getItem("defesa-civil-images")).toBeNull();
  });

  it("migra imagens antigas do localStorage na primeira abertura", async () => {
    window.localStorage.setItem(
      "defesa-civil-images",
      JSON.stringify({ "monitor-map": png }),
    );
    render(<App />);

    await waitFor(() =>
      expect(document.querySelectorAll(".uploaded-image")).toHaveLength(1),
    );
    await waitFor(async () =>
      expect(await readIdb("defesa-civil-images")).toEqual({ "monitor-map": png }),
    );
    expect(window.localStorage.getItem("defesa-civil-images")).toBeNull();
    // Carregar as imagens não pode contar como algo a desfazer.
    expect(button("DESFAZER")).toBeDisabled();
  });
});

describe("versões do projeto", () => {
  const openVersions = async () => {
    await userEvent.click(button("VERSÕES"));
    return screen.getByRole("dialog", { name: "Versões do projeto" });
  };

  it("salva uma versão, altera o painel e restaura a versão", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    await enterEditMode();
    editText("EM OPERAÇÃO", "EM ALERTA");

    const dialog = within(await openVersions());
    expect(dialog.getByText(/Nenhuma versão salva/)).toBeInTheDocument();
    await userEvent.clear(dialog.getByLabelText("Nome da versão"));
    await userEvent.type(dialog.getByLabelText("Nome da versão"), "Simulado");
    await userEvent.click(dialog.getByRole("button", { name: "Salvar versão atual" }));
    expect(await dialog.findByText("Simulado")).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Fechar" }));

    editText("EM ALERTA", "EM CRISE");
    expect(screen.getByText("EM CRISE")).toBeInTheDocument();
    // Deixa a edição virar um passo próprio do histórico (agrupa em 400 ms).
    await new Promise((resolve) => setTimeout(resolve, 450));

    const again = within(await openVersions());
    await userEvent.click(again.getByRole("button", { name: "Restaurar Simulado" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("EM ALERTA")).toBeInTheDocument();
    expect(screen.queryByText("EM CRISE")).toBeNull();

    // A restauração também pode ser desfeita.
    await userEvent.click(button("DESFAZER"));
    expect(screen.getByText("EM CRISE")).toBeInTheDocument();
  });

  it("mantém as versões depois de recarregar e permite excluir", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { unmount } = render(<App />);
    let dialog = within(await openVersions());
    await userEvent.click(dialog.getByRole("button", { name: "Salvar versão atual" }));
    await waitFor(() =>
      expect(dialog.getAllByRole("button", { name: /^Restaurar / })).toHaveLength(1),
    );
    unmount();

    render(<App />);
    dialog = within(await openVersions());
    const restore = await dialog.findByRole("button", { name: /^Restaurar / });
    expect(restore).toBeInTheDocument();

    await userEvent.click(dialog.getByRole("button", { name: /^Excluir / }));
    await waitFor(() =>
      expect(dialog.getByText(/Nenhuma versão salva/)).toBeInTheDocument(),
    );
  });

  it("fecha com Esc", async () => {
    render(<App />);
    await openVersions();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("tela pequena", () => {
  const narrow = (matches: boolean) =>
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches }),
    });

  it("começa com o painel de design recolhido e permite expandir", async () => {
    narrow(true);
    render(<App />);
    await enterEditMode();
    const toggle = button(/Cores, fontes e formas/);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "+ Círculo" })).toBeNull();

    await userEvent.click(toggle);
    expect(button(/Recolher painel/)).toHaveAttribute("aria-expanded", "true");
    expect(button("+ Círculo")).toBeInTheDocument();
  });

  it("começa expandido em telas largas", async () => {
    narrow(false);
    render(<App />);
    await enterEditMode();
    expect(button(/Recolher painel/)).toBeInTheDocument();
  });
});

describe("acessibilidade", () => {
  it("usa botões nativos na barra de ferramentas e nas alças", async () => {
    render(<App />);
    expect(document.querySelectorAll('div[role="button"]')).toHaveLength(0);
    await enterEditMode();
    expect(document.querySelectorAll("button.drag-handle").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });
});
