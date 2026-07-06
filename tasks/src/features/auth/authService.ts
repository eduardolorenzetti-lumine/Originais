import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export type AuthState =
  | { status: "local"; user: null }
  | { status: "signed_out"; user: null }
  | { status: "signed_in"; user: User };

export async function getAuthState(): Promise<AuthState> {
  if (!supabase) return { status: "local", user: null };

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return { status: "signed_out", user: null };

  return { status: "signed_in", user: data.session.user };
}

export function onAuthStateChange(callback: (state: AuthState) => void) {
  if (!supabase) {
    callback({ status: "local", user: null });
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? { status: "signed_in", user: session.user } : { status: "signed_out", user: null });
  });

  return () => subscription.unsubscribe();
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmailPassword(email: string, password: string) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const redirectUrl = typeof window === "undefined" ? undefined : `${window.location.origin}/tasks/`;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined,
  });

  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
