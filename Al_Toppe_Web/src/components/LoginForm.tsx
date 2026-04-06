import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Phone, Lock, LogIn, AlertCircle, FlaskConical, Mail, ChevronDown } from 'lucide-react';
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
  DEV_TEST_ACCOUNTS,
  DEV_TEST_LOGIN_PASSWORD,
  getSupabaseTestPassword,
  resolveSupabaseTestEmail,
  type DevTestAccountKey,
} from '../config/devTestAccounts';

const useSupabaseLogin = isSupabaseAuthActive();

const enableQuickTestLogin =
  !useSupabaseLogin &&
  (import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true');

/** Comptes de démo Supabase (même flag que Django : dev ou VITE_ENABLE_TEST_LOGIN). */
const enableSupabaseQuickTest =
  useSupabaseLogin &&
  (import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true');

const quickTestPassword =
  import.meta.env.VITE_DEV_TEST_PASSWORD || DEV_TEST_LOGIN_PASSWORD;

interface LoginFormProps {
  onLogin: (user: User) => void;
}

function formatLoginError(err: unknown): string {
  const msg =
    err instanceof NetworkError
      ? err.message
      : err instanceof Error
        ? err.message
        : '';
  const low = msg.toLowerCase();
  // Connexion refusée / hors ligne → fetch() échoue souvent avec "Failed to fetch"
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
  return "Échec de connexion — vérifie l'API, seed_test_users et le mot de passe test.";
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
      "Identifiants refusés — crée les utilisateurs de test dans Supabase Auth " +
      "(emails par défaut dans devTestAccounts.ts) avec le mot de passe VITE_SUPABASE_TEST_PASSWORD " +
      "ou celui par défaut, et user_metadata.role."
    );
  }
  if (err instanceof Error) return err.message;
  return "Échec de connexion Supabase — vérifie URL, clé anon et les comptes de test.";
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [testRole, setTestRole] = useState<DevTestAccountKey | ''>('');
  const [testPanelOpen, setTestPanelOpen] = useState(false);
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

  const handleQuickTestLogin = async () => {
    if (!testRole) {
      setError('Choisis un rôle de test dans le menu.');
      return;
    }
    const account = DEV_TEST_ACCOUNTS.find((a) => a.key === testRole);
    if (!account) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.login({
        phone: account.phone,
        password: quickTestPassword,
      });
      onLogin(response.user);
    } catch (err) {
      console.error('Connexion test:', err);
      setError(formatLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#006666] to-[#004d4d] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#006666] rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">AT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AL-TOPPE</h1>
          <p className="text-gray-600">Plateforme de gestion d'entreprise</p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Formulaire de connexion */}
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
                Compte Supabase Auth — rôle dans les métadonnées utilisateur (
                <code className="text-[11px]">user_metadata.role</code>).
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

          {/* Mot de passe */}
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

          {/* Bouton de connexion */}
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

        {enableQuickTestLogin ? (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <FlaskConical className="h-4 w-4 text-[#006666]" />
              <span>Connexion rapide (test)</span>
            </div>
            <p className="text-xs text-slate-600">
              Choisis un rôle, puis connecte-toi sans saisir le mot de passe.
              Les comptes viennent de{' '}
              <code className="text-[11px] bg-slate-100 px-1 rounded">
                seed_test_users
              </code>{' '}
              côté API.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* <select> natif : évite l’erreur React/Radix removeChild sur SelectValue (connexion test) */}
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-1"
                value={testRole}
                onChange={(e) =>
                  setTestRole((e.target.value || '') as DevTestAccountKey | '')
                }
                aria-label="Rôle de test"
              >
                <option value="">Rôle de test…</option>
                {DEV_TEST_ACCOUNTS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto border border-[#006666]/30 text-[#006666] hover:bg-[#006666]/10"
                disabled={isLoading || !testRole}
                onClick={handleQuickTestLogin}
              >
                Se connecter avec ce rôle
              </Button>
            </div>
          </div>
        ) : null}

        {enableSupabaseQuickTest ? (
          <Collapsible
            open={testPanelOpen}
            onOpenChange={setTestPanelOpen}
            className="mt-8 overflow-hidden rounded-lg border border-[#006666]/25 bg-[#006666]/5"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-[#004d4d] outline-none hover:bg-[#006666]/10 rounded-t-lg"
              >
                <span className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 shrink-0 text-[#006666]" />
                  Comptes de test (Supabase)
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-[#006666] transition-transform duration-200',
                    testPanelOpen && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 px-4 pb-4 pt-0">
              <p className="text-xs text-slate-600">
                Crée dans Supabase Authentication les utilisateurs avec les emails ci-dessous, le
                mot de passe défini par{' '}
                <code className="rounded bg-white px-1 text-[11px]">VITE_SUPABASE_TEST_PASSWORD</code>{' '}
                (ou le défaut du code), et{' '}
                <code className="rounded bg-white px-1 text-[11px]">user_metadata.role</code> = rôle
                correspondant.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-1"
                  value={testRole}
                  onChange={(e) =>
                    setTestRole((e.target.value || '') as DevTestAccountKey | '')
                  }
                  aria-label="Rôle de test Supabase"
                >
                  <option value="">Choisir un utilisateur de test…</option>
                  {DEV_TEST_ACCOUNTS.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label} — {resolveSupabaseTestEmail(a.key)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full border border-[#006666]/40 bg-white text-[#006666] hover:bg-[#006666]/10 sm:w-auto"
                  disabled={isLoading || !testRole}
                  onClick={handleSupabaseQuickTestLogin}
                >
                  Se connecter
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {/* Liens supplémentaires */}
        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-[#006666] hover:underline">
            Mot de passe oublié ?
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>AL-TOPPE © 2024 - Votre partenaire pour entreprendre au Sénégal 🇸🇳</p>
        </div>
      </Card>
    </div>
  );
}
