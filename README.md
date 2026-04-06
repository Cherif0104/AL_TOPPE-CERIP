# AL_TOPPE-CERIP

Plateforme **AL-TOPPE** — gestion d’accompagnement d’entrepreneurs (web + API + app mobile).

Ce dépôt regroupe le nécessaire pour **reprendre le développement** : backend Django, frontend web (Vite/React), client mobile Expo.

## Structure du dépôt

| Dossier | Rôle |
|--------|------|
| `Al_Toppe_Backend/` | API REST Django, JWT, modèles métier |
| `Al_Toppe_Web/` | Application web (React, Vite, shadcn/ui) — interface principale actuelle |
| `Al_Toppe_Frontend/` | Application mobile **Expo** (React Native) |

## Comptes de test rapide (rôles)

Sur l’écran de connexion web, la section **« Connexion rapide (test) »** n’apparaît **que si l’auth Supabase est désactivée** (`VITE_SUPABASE_AUTH_ENABLED=false`). Elle utilise l’API Django avec les numéros définis dans `Al_Toppe_Web/src/config/devTestAccounts.ts` (alignés sur `python manage.py seed_test_users` côté backend).

| Rôle | Téléphone (login test) |
|------|-------------------------|
| Entrepreneur | `221701001001` |
| Coach | `221701001002` |
| Bailleur | `221701001003` |
| Administrateur | `221701001004` |

Mot de passe par défaut : voir `DEV_TEST_LOGIN_PASSWORD` dans `devTestAccounts.ts`, ou variable **`VITE_DEV_TEST_PASSWORD`** dans `.env`.

En **production / preview** (ex. Vercel), tu peux afficher cette zone en définissant **`VITE_ENABLE_TEST_LOGIN=true`** (à utiliser seulement sur un environnement de démo, pas en prod publique avec données réelles).

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

- **Django (téléphone + mot de passe)** : `VITE_SUPABASE_AUTH_ENABLED=false` — permet la **connexion rapide par rôle** ci-dessus.
- **Supabase (email + mot de passe)** : renseigner `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_AUTH_ENABLED=true`. Ne pas laisser `VITE_SUPABASE_*` vides dans `.env.local` (priorité sur `.env`).

## Déploiement Vercel (frontend web)

1. Importer le dépôt GitHub dans Vercel.
2. **Root Directory** : `Al_Toppe_Web`
3. **Framework** : Vite (détection auto) — **Build** : `npm run build` — **Output** : `dist`
4. Variables d’environnement : copier depuis `.env.example` (`VITE_*` uniquement), notamment `VITE_API_BASE_URL` pointant vers ton API déployée (HTTPS).

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
