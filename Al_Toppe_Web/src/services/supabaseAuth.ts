import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { SUPABASE_DEFAULT_ROLE, isSupabaseConfigured } from "@/config";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "./api";

const ROLE_DISPLAY: Record<User["role"], string> = {
  entrepreneur: "Entrepreneur",
  coach: "Coach",
  admin: "Administrateur",
  bailleur: "Bailleur",
};

function normalizeRole(r: string): User["role"] {
  const x = (r || "").toLowerCase();
  if (x === "administrateur") return "admin";
  if (["entrepreneur", "coach", "admin", "bailleur"].includes(x)) {
    return x as User["role"];
  }
  const d = (SUPABASE_DEFAULT_ROLE || "entrepreneur").toLowerCase();
  if (["entrepreneur", "coach", "admin", "bailleur"].includes(d)) {
    return d as User["role"];
  }
  return "entrepreneur";
}

/**
 * Construit l’objet User attendu par l’app à partir du profil Supabase.
 * Renseigne `role` dans Supabase : user_metadata.role ou app_metadata.role
 * (dashboard Authentication → utilisateurs → Raw JSON ou trigger).
 */
export function supabaseUserToAppUser(su: SupabaseUser): User {
  const meta = (su.user_metadata || {}) as Record<string, unknown>;
  const appMeta = (su.app_metadata || {}) as Record<string, unknown>;
  const role = normalizeRole(
    String(meta.role || appMeta.role || SUPABASE_DEFAULT_ROLE),
  );
  const fullName =
    String(meta.full_name || meta.name || su.email?.split("@")[0] || "Utilisateur");

  return {
    id: su.id,
    phone: String(meta.phone || su.phone || ""),
    email: su.email || "",
    role,
    role_display: ROLE_DISPLAY[role] || role,
    language: String(meta.language || "fr"),
    is_active: true,
    created_at: su.created_at || new Date().toISOString(),
    last_login: su.last_sign_in_at || su.created_at || new Date().toISOString(),
    full_name: fullName,
  };
}

export function sessionToAppUser(session: Session): User {
  return supabaseUserToAppUser(session.user);
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<{ user: User; session: Session }> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase non configuré (VITE_SUPABASE_URL / ANON_KEY).");
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session || !data.user) {
    throw new Error("Session Supabase invalide.");
  }
  return { user: supabaseUserToAppUser(data.user), session: data.session };
}

function isInvalidLoginLikeError(message: string): boolean {
  const low = (message || "").toLowerCase();
  return (
    low.includes("invalid login") ||
    low.includes("invalid credentials") ||
    low.includes("email not confirmed") ||
    low.includes("user not found")
  );
}

/**
 * Connexion rapide de test:
 * - tente d'abord une connexion;
 * - si le compte n'existe pas, essaie de le créer puis reconnecte.
 */
export async function signInOrProvisionQuickTestUser(params: {
  email: string;
  password: string;
  role: User["role"];
}): Promise<{ user: User; session: Session }> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase non configuré (VITE_SUPABASE_URL / ANON_KEY).");
  }

  try {
    return await signInWithEmailPassword(params.email, params.password);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!isInvalidLoginLikeError(message)) throw error;
  }

  const roleDisplay = ROLE_DISPLAY[params.role] || params.role;
  const signUpResult = await sb.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        role: params.role,
        full_name: `Compte test ${roleDisplay}`,
        language: "fr",
      },
    },
  });

  if (signUpResult.error) {
    throw signUpResult.error;
  }

  const secondTry = await signInWithEmailPassword(params.email, params.password);
  return secondTry;
}

export async function signOutSupabase(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function getSupabaseSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

export function subscribeSupabaseAuth(
  callback: (user: User | null) => void,
): { unsubscribe: () => void } {
  const sb = getSupabase();
  if (!sb) {
    return { unsubscribe: () => undefined };
  }
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }
    callback(supabaseUserToAppUser(session.user));
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}

export { isSupabaseConfigured };
