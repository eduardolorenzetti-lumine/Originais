import React from "react";
import type { User } from "@supabase/supabase-js";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "./features/auth/authService";

const mocks = vi.hoisted(() => ({
  loadUserPreferences: vi.fn(),
  persistUserPreference: vi.fn(),
  persistTaskCreate: vi.fn(),
  persistTaskUpdate: vi.fn(),
}));

const signedInState: AuthState = {
  status: "signed_in",
  user: {
    id: "user-1",
    email: "eduardo.lorenzetti@lumine.tv",
    user_metadata: { name: "dudu lorenzetti" },
  } as User,
};

vi.mock("./lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

vi.mock("./features/auth/authService", () => ({
  getAuthState: vi.fn(async () => signedInState),
  onAuthStateChange: vi.fn((callback: (state: AuthState) => void) => {
    callback(signedInState);
    return () => undefined;
  }),
  signInWithEmailPassword: vi.fn(),
  signOut: vi.fn(),
  signUpWithEmailPassword: vi.fn(),
}));

vi.mock("./features/tasks/taskMutations", () => ({
  persistTaskCreate: mocks.persistTaskCreate,
  persistTaskUpdate: mocks.persistTaskUpdate,
}));

vi.mock("./features/tasks/userPreferences", async () => {
  const actual = await vi.importActual<typeof import("./features/tasks/userPreferences")>("./features/tasks/userPreferences");

  return {
    ...actual,
    loadUserPreferences: mocks.loadUserPreferences,
    persistUserPreference: mocks.persistUserPreference,
  };
});

vi.mock("./features/tasks/taskRepository", async () => {
  const actual = await vi.importActual<typeof import("./features/tasks/taskRepository")>("./features/tasks/taskRepository");
  const supabaseSnapshot = { ...actual.localWorkspaceSnapshot, source: "supabase" as const };

  return {
    ...actual,
    loadWorkspaceSnapshot: vi.fn(async () => supabaseSnapshot),
  };
});

import { App } from "./App";

function expandSubtasks() {
  fireEvent.click(screen.getByRole("button", { name: /^Subtarefas$/i }));
  fireEvent.click(screen.getByRole("button", { name: /expandidas/i }));
}

describe("App persistence feedback", () => {
  beforeEach(() => {
    mocks.loadUserPreferences.mockReset();
    mocks.loadUserPreferences.mockResolvedValue([]);
    mocks.persistUserPreference.mockReset();
    mocks.persistUserPreference.mockResolvedValue(undefined);
    mocks.persistTaskCreate.mockReset();
    mocks.persistTaskUpdate.mockReset();
  });

  it("shows saving and saved states while persisting task edits", async () => {
    let resolvePersist: (() => void) | undefined;
    mocks.persistTaskUpdate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolvePersist = resolve;
        }),
    );

    render(<App />);

    await screen.findByText("dudu lorenzetti");
    expandSubtasks();
    fireEvent.click(await screen.findByText(/^Hospedagem$/i));
    fireEvent.change(screen.getByLabelText(/titulo/i), { target: { value: "Hospedagem teste" } });

    expect(screen.getByRole("status")).toHaveTextContent("Salvando");
    expect(mocks.persistTaskUpdate).toHaveBeenCalled();

    await act(async () => {
      resolvePersist?.();
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Salvo"));
  });

  it("shows an error state when persistence fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.persistTaskUpdate.mockRejectedValueOnce(new Error("boom"));

    render(<App />);

    await screen.findByText("dudu lorenzetti");
    expandSubtasks();
    fireEvent.click(await screen.findByText(/^Hospedagem$/i));
    fireEvent.change(screen.getByLabelText(/titulo/i), { target: { value: "Hospedagem erro" } });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Erro ao salvar"));
    warnSpy.mockRestore();
  });

  it("persists sidebar hierarchy order as a user preference", async () => {
    render(<App />);

    await screen.findByText("dudu lorenzetti");

    const originaisRow = screen.getByText("[LMN] Originais").closest(".sidebar-entity-row");
    const producoesRow = screen.getByText("[LMN] Producoes").closest(".sidebar-entity-row");
    expect(originaisRow).toBeTruthy();
    expect(producoesRow).toBeTruthy();

    fireEvent.dragStart(producoesRow as Element);
    fireEvent.dragOver(originaisRow as Element);
    fireEvent.drop(originaisRow as Element);

    await waitFor(() =>
      expect(mocks.persistUserPreference).toHaveBeenCalledWith(
        "layout",
        "main",
        expect.objectContaining({
          sidebarEntityOrder: expect.objectContaining({
            "sidebar:spaces": ["[LMN] Producoes", "[LMN] Originais"],
          }),
        }),
      ),
    );
  });
});
