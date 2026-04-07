# AL_TOPPE-CERIP

Plateforme **AL-TOPPE** — gestion d’accompagnement d’entrepreneurs (web + API + app mobile).

Ce dépôt regroupe le nécessaire pour **reprendre le développement** : backend Django, frontend web (Vite/React), client mobile Expo.

## Structure du dépôt

| Dossier | Rôle |
|--------|------|
| `Al_Toppe_Backend/` | API REST Django, JWT, modèles métier |
| `Al_Toppe_Web/` | Application web (React, Vite, shadcn/ui) — interface principale actuelle |
| `Al_Toppe_Frontend/` | Application mobile **Expo** (React Native) |

## Connexion rapide (comptes Supabase)

Avec **`VITE_SUPABASE_AUTH_ENABLED=true`**, l’écran de connexion propose un panneau **« Connexion rapide (comptes Supabase) »** (en dev automatiquement ; en preview/prod : **`VITE_ENABLE_TEST_LOGIN=true`**).

Crée les 4 utilisateurs dans **Supabase → Authentication** avec les emails par défaut (`test-*@example.com`, surchargeables via `VITE_SUPABASE_TEST_EMAIL_*` — voir `Al_Toppe_Web/src/config/supabaseQuickTest.ts`), le mot de passe **`VITE_SUPABASE_TEST_PASSWORD`** (ou défaut dans ce fichier), et **`user_metadata.role`** = `entrepreneur` | `coach` | `bailleur` | `admin`.

Pour l’auth **Django** (téléphone + JWT), il n’y a plus de connexion rapide côté front : utilise des comptes réels ou `seed_test_users` en local depuis l’API.

## Prérequis

- Python 3.10+ (backend)
- Node.js 20+ et npm (web + mobile)
- PostgreSQL en prod ; en local SQLite possible via `USE_SQLITE` (voir `Al_Toppe_Backend/.env.example`)

## Démarrage — API Django

```bash
cd Al_Toppe_Backend
python -m venv venv
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_test_users
python manage.py runserver 0.0.0.0:8000
```

Healthcheck : `GET http://127.0.0.1:8000/api/health/` (si exposé).

## Démarrage — Web (Vite)

```bash
cd Al_Toppe_Web
npm install
cp .env.example .env
npm run dev
```

Port par défaut : **3000** (`vite.config.ts`).

## Authentification

- **Django (téléphone + mot de passe)** : `VITE_SUPABASE_AUTH_ENABLED=false` — connexion classique vers l’API ; pas de raccourci de test sur le front.
- **Supabase (email + mot de passe)** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_AUTH_ENABLED=true` — **connexion rapide** par rôle si les comptes existent dans Supabase (voir section ci-dessus). Ne pas laisser `VITE_SUPABASE_*` vides dans `.env.local`.

## Déploiement Vercel (frontend web)

Le dépôt est un **monorepo** : la webapp est dans `Al_Toppe_Web/`.

**Option A (recommandée avec ce repo)** : ne rien changer de spécial dans l’UI Vercel pour le dossier racine — un fichier **`vercel.json` à la racine** du dépôt lance `install` / `build` dans `Al_Toppe_Web` et publie `Al_Toppe_Web/dist`.

**Option B** : dans Vercel → Project → Settings → General → **Root Directory** = `Al_Toppe_Web`, puis Framework Vite, build `npm run build`, output `dist`.

Dans les deux cas, ajoute les variables d’environnement **`VITE_*`** (voir `Al_Toppe_Web/.env.example`), surtout `VITE_API_BASE_URL` vers ton API Django en HTTPS.

Si tu voyais **404 NOT_FOUND** sur l’URL `*.vercel.app`, c’était en général : mauvaise racine de build (rien dans `dist`) ou build en échec — vérifie l’onglet **Deployments → Build Logs**.

Le backend Django doit être hébergé ailleurs (Railway, Render, VPS, etc.) avec CORS autorisé vers l’URL Vercel.

## Variables d’environnement

- Backend : `Al_Toppe_Backend/.env.example` → `.env`
- Web : `Al_Toppe_Web/.env.example` → `.env` ; `.env.local` pour overrides locaux

Ne jamais committer les `.env` contenant des secrets.

## Mobile (Expo)

```bash
cd Al_Toppe_Frontend
npm install
npx expo start
```

## GitHub — remote

```bash
git remote add origin https://github.com/Cherif0104/AL_TOPPE-CERIP.git
git branch -M main
git push -u origin main
```

---

*AL_TOPPE-CERIP — continuité et reprise du projet.*
