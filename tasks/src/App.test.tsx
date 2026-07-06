import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

function expandSubtasks() {
  fireEvent.click(screen.getByRole("button", { name: /^Subtarefas$/i }));
  fireEvent.click(screen.getByRole("button", { name: /expandidas/i }));
}

function getSidebarSpaceLabels(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".space-group > .sidebar-entity-row .sidebar-entity-label")).map((item) =>
    item.textContent?.trim(),
  );
}

describe("App", () => {
  it("renders the tasks workspace shell", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /originais/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nova tarefa/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/lista de tarefas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^tabela$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/detalhe da tarefa/i)).not.toBeInTheDocument();
  });

  it("shows the clickup-like hierarchy with folders inside spaces", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    expect(screen.getByRole("button", { name: /planejamento/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ORIGINAIS 16$/i })).toBeInTheDocument();
  });

  it("filters tasks by assignee popover", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    expandSubtasks();
    fireEvent.click(screen.getByRole("button", { name: /filtrar tarefas por responsavel/i }));
    expect(screen.getByRole("dialog", { name: /responsaveis/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /aline marques/i }));

    expect(screen.getAllByText(/rodoviario - dudu/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/rp \[agradecimentos\]/i)).not.toBeInTheDocument();
  });

  it("selects task lists and shows empty state", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    fireEvent.click(screen.getByRole("button", { name: /projetos backlog/i }));

    expect(screen.getByRole("heading", { name: /projetos backlog/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sem tarefas nesta selecao/i)).toBeInTheDocument();
  });

  it("selects a space from the sidebar", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    fireEvent.click(screen.getByRole("button", { name: /\[lmn\] producoes 1/i }));

    expect(screen.getByRole("heading", { name: /\[lmn\] producoes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /website/i })).toBeInTheDocument();
  });

  it("reorders spaces in the sidebar with drag and drop", async () => {
    const { container } = render(<App />);

    await screen.findByRole("heading", { name: /originais/i });

    const originaisRow = screen.getByText("[LMN] Originais").closest(".sidebar-entity-row");
    const producoesRow = screen.getByText("[LMN] Producoes").closest(".sidebar-entity-row");
    expect(originaisRow).toBeTruthy();
    expect(producoesRow).toBeTruthy();

    fireEvent.dragStart(producoesRow as Element);
    fireEvent.dragOver(originaisRow as Element);
    fireEvent.drop(originaisRow as Element);

    expect(getSidebarSpaceLabels(container).slice(0, 2)).toEqual(["[LMN] Producoes", "[LMN] Originais"]);
  });

  it("opens a space on the first list with visible tasks", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    fireEvent.click(screen.getByRole("button", { name: /\[lmn\] producoes 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /\[lmn\] originais 16/i }));

    expect(screen.getByRole("heading", { name: /\[lmn\] originais/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /natal amarelo iv/i })).toBeInTheDocument();
  });

  it("selects a task and updates the detail panel", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    expandSubtasks();
    fireEvent.click(screen.getByText(/^Hospedagem$/i));

    expect(screen.getByLabelText(/titulo/i)).toHaveValue("Hospedagem");
  });

  it("adds custom field columns and edits their values in the task detail", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });

    fireEvent.click(screen.getByRole("button", { name: /adicionar coluna/i }));
    fireEvent.click(screen.getByRole("button", { name: /campanha ads/i }));

    expect(screen.getByRole("button", { name: /trocar campo campanha ads/i })).toBeInTheDocument();
    expect(screen.getAllByText(/cidade amarela/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /natal amarelo iv/i }));
    const field = screen.getByRole("textbox", { name: /campo campanha ads/i });
    expect(field).toHaveValue("Cidade Amarela");

    fireEvent.change(field, { target: { value: "Lancamento julho" } });

    expect(screen.getByDisplayValue("Lancamento julho")).toBeInTheDocument();
    expect(screen.getByText(/lancamento julho/i)).toBeInTheDocument();
  });

  it("opens a synthetic parent row instead of auto-selecting the first task", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    fireEvent.click(screen.getByRole("button", { name: /natal amarelo iv/i }));

    expect(screen.getByLabelText(/titulo/i)).toHaveValue("Natal Amarelo IV [Cidade Amarela]");
  });

  it("opens subtasks from the task detail while the tree stays collapsed", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    expect(screen.queryByText(/^Hospedagem$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /natal amarelo iv/i }));
    fireEvent.click(screen.getByRole("button", { name: /abrir subtarefa hospedagem/i }));

    expect(screen.getByLabelText(/titulo/i)).toHaveValue("Hospedagem");
  });

  it("creates a subtask from the task detail", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    fireEvent.click(screen.getByRole("button", { name: /natal amarelo iv/i }));
    fireEvent.click(screen.getByRole("button", { name: /adicionar subtarefa no detalhe/i }));

    expect(screen.getByLabelText(/titulo/i)).toHaveValue("Nova subtarefa");
  });

  it("toggles grouping and subtask expansion controls", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    expect(screen.getAllByText(/natal amarelo iv/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Hospedagem$/i)).not.toBeInTheDocument();

    expandSubtasks();
    expect(screen.getByText(/^Hospedagem$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Agrupamento$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^status$/i }));
    expect(screen.getAllByText(/em andamento/i).length).toBeGreaterThan(0);
  });

  it("allows closing the task modal without reselecting the first task", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /originais/i });
    fireEvent.click(screen.getByRole("button", { name: /modo de detalhe/i }));
    fireEvent.click(screen.getByRole("button", { name: /janela modal/i }));
    expandSubtasks();

    expect(screen.queryByRole("dialog", { name: /janela da tarefa/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/^Hospedagem$/i));

    expect(screen.getByRole("dialog", { name: /janela da tarefa/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fechar tarefa/i }));

    expect(screen.queryByRole("dialog", { name: /janela da tarefa/i })).not.toBeInTheDocument();
  });
});
