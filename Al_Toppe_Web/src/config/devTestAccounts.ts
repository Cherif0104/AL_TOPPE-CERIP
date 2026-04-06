/**
 * Comptes alignés sur `python manage.py seed_test_users` (backend).
 * Si tu changes le mot de passe avec --password, mets à jour DEV_TEST_LOGIN_PASSWORD
 * ou définis VITE_DEV_TEST_PASSWORD dans .env (optionnel, voir LoginForm).
 */
export const DEV_TEST_LOGIN_PASSWORD = "Testaltoppe2026!";

export const DEV_TEST_ACCOUNTS = [
  {
    key: "entrepreneur",
    label: "Entrepreneur",
    phone: "221701001001",
  },
  {
    key: "coach",
    label: "Coach",
    phone: "221701001002",
  },
  {
    key: "bailleur",
    label: "Bailleur",
    phone: "221701001003",
  },
  {
    key: "admin",
    label: "Administrateur",
    phone: "221701001004",
  },
] as const;

export type DevTestAccountKey = (typeof DEV_TEST_ACCOUNTS)[number]["key"];
