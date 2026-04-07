import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Phone, Lock, LogIn, AlertCircle, FlaskConical, Mail, ChevronDown, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { cn } from '@/lib/utils';
import { apiService, User } from '../services/api';
import { NetworkError } from '../services/errorHandler';
import { isSupabaseAuthActive } from '@/config';
import { signInWithEmailPassword } from '@/services/supabaseAuth';
import {
  SUPABASE_QUICK_TEST_ROLES,
  getSupabaseTestPassword,
  resolveSupabaseTestEmail,
  type QuickTestRoleKey,
} from '../config/supabaseQuickTest';

const useSupabaseLogin = isSupabaseAuthActive();

/** Connexion rapide : uniquement avec Supabase Auth (comptes créés dans le dashboard). */
const enableQuickSupabaseLogin =
  useSupabaseLogin &&
  (import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true');

interface LoginFormProps {
  onLogin: (user: User) => void;
  /** Ouvre une courte présentation de l’application (sans compte). */
  onOpenDemo?: () => void;
}

function formatLoginError(err: unknown): string {
  const msg =
    err instanceof NetworkError
      ? err.message
      : err instanceof Error
        ? err.message
        : '';
  const low = msg.toLowerCase();
  if (
    low.includes('failed to fetch') ||
    (err instanceof NetworkError && err.status === 0)
  ) {
    return (
      "Impossible de joindre l'API. Démarre le backend Django (ex. python manage.py runserver 0.0.0.0:8000) " +
      "et vérifie VITE_API_BASE_URL dans .env (ex. http://127.0.0.1:8000/api)."
    );
  }
  if (err instanceof Error) return err.message;
  return "Échec de connexion — vérifie l'API et tes identifiants.";
}

function formatSupabaseLoginError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: string }).message)
        : "";
  const low = msg.toLowerCase();
  if (low.includes("invalid login") || low.includes("invalid credentials")) {
    return (
      "Identifiants refusés — crée les utilisateurs dans Supabase Auth " +
      "(voir supabaseQuickTest.ts) avec VITE_SUPABASE_TEST_PASSWORD et user_metadata.role."
    );
  }
  if (err instanceof Error) return err.message;
  return "Échec de connexion Supabase — vérifie URL, clé anon et les comptes.";
}

export function LoginForm({ onLogin, onOpenDemo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [quickRole, setQuickRole] = useState<QuickTestRoleKey | ''>('');
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (useSupabaseLogin) {
        const { user } = await signInWithEmailPassword(email.trim(), password);
        onLogin(user);
      } else {
        const response = await apiService.login({ phone, password });
        onLogin(response.user);
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(useSupabaseLogin ? formatSupabaseLoginError(err) : formatLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSupabaseLogin = async () => {
    if (!quickRole) {
      setError('Choisis un rôle dans le menu de connexion rapide.');
      return;
    }
    const testEmail = resolveSupabaseTestEmail(quickRole);
    const testPwd = getSupabaseTestPassword();
    setIsLoading(true);
    setError('');
    try {
      const { user } = await signInWithEmailPassword(testEmail, testPwd);
      onLogin(user);
    } catch (err) {
      console.error('Connexion rapide Supabase:', err);
      setError(formatSupabaseLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#006666] to-[#004d4d] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#006666] rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">AT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AL-TOPPE</h1>
          <p className="text-gray-600">Plateforme de gestion d'entreprise</p>
          {onOpenDemo ? (
            <button
              type="button"
              onClick={onOpenDemo}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[#006666]/30 bg-[#006666]/5 px-4 py-2 text-sm font-medium text-[#006666] transition-colors hover:bg-[#006666]/15"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Voir la présentation de l’application
            </button>
          ) : null}
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {useSupabaseLogin ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Compte Supabase Auth — rôle dans{' '}
                <code className="text-[11px]">user_metadata.role</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+221 XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#006666] hover:bg-[#004d4d] text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connexion...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <LogIn className="w-4 h-4" />
                <span>Se connecter</span>
              </div>
            )}
          </Button>
        </form>

        {enableQuickSupabaseLogin ? (
          <Collapsible
            open={quickPanelOpen}
            onOpenChange={setQuickPanelOpen}
            className="mt-8 overflow-hidden rounded-lg border border-[#006666]/25 bg-[#006666]/5"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-t-lg px-4 py-3 text-left text-sm font-medium text-[#004d4d] outline-none hover:bg-[#006666]/10"
              >
                <span className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 shrink-0 text-[#006666]" />
                  Connexion rapide (comptes Supabase)
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-[#006666] transition-transform duration-200',
                    quickPanelOpen && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 px-4 pb-4 pt-0">
              <p className="text-xs text-slate-600">
                Utilisateurs créés dans Supabase Authentication : même mot de passe (
                <code className="rounded bg-white px-1 text-[11px]">VITE_SUPABASE_TEST_PASSWORD</code>
                ) et <code className="rounded bg-white px-1 text-[11px]">user_metadata.role</code>{' '}
                selon le rôle choisi.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-1"
                  value={quickRole}
                  onChange={(e) =>
                    setQuickRole((e.target.value || '') as QuickTestRoleKey | '')
                  }
                  aria-label="Rôle pour connexion rapide Supabase"
                >
                  <option value="">Choisir un compte de test…</option>
                  {SUPABASE_QUICK_TEST_ROLES.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label} — {resolveSupabaseTestEmail(a.key)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full border border-[#006666]/40 bg-white text-[#006666] hover:bg-[#006666]/10 sm:w-auto"
                  disabled={isLoading || !quickRole}
                  onClick={handleQuickSupabaseLogin}
                >
                  Se connecter
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-[#006666] hover:underline">
            Mot de passe oublié ?
          </a>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>AL-TOPPE © 2024 - Votre partenaire pour entreprendre au Sénégal 🇸🇳</p>
        </div>
      </Card>
    </div>
  );
}
