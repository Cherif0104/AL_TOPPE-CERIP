# DOCUMENTATION DE LIVRAISON — AL-TOPPE

**Version**: 1.0  
**Date**: 2026-01-27  
**Contenu**: Backend (Django API) + Mobile (Expo) + Web (React)  

---

## Vue d’ensemble

AL‑TOPPE est composé de 3 applications :

- **Backend API**: `Django/` (Django REST Framework, JWT, PostgreSQL)
- **Mobile**: `Native/` (React Native + Expo Router, offline cache, Voice AI)
- **Web**: `React/` (React + TypeScript + shadcn/ui, Coach/Admin/Bailleur)

URL API (prod): `https://api.altoppe.sn/api`  
Docs API (prod): `https://api.altoppe.sn/api/docs/` (Swagger) et `https://api.altoppe.sn/api/redoc/`

---

## 1) Pré-requis

### Backend (Django)
- Python **3.10+**
- PostgreSQL **13+**
- (Optionnel) Docker + Docker Compose

### Mobile (Expo)
- Node.js **18+**
- Expo CLI (via `npx expo`)
- Android Studio (pour Android) / Xcode (pour iOS)

### Web (React)
- Node.js **18+**

---

## 2) Arborescence (résumé)

```
AL-TOPPE/
  Django/    # API + admin + services IA (Gemini)
  Native/    # App mobile Expo (Android/iOS + web export)
  React/     # Interface web (coach/admin/bailleur)
```

---

## 3) Backend — Installation & lancement (Django)

### 3.1 Variables d’environnement (exemple)

Créer un fichier `.env` (ou exporter les variables) pour la prod/staging.

Variables minimales recommandées :
- `SECRET_KEY`
- `DEBUG` = `False` en prod
- `ALLOWED_HOSTS` (ex: `api.altoppe.sn`)
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `GEMINI_API_KEY` (si IA activée)
- `USE_GEMINI` (`true/false`)
- `USE_GEMINI_ONLY_FOR_AUDIO` (`true/false`) — mode collecte

### 3.2 Installation

Depuis le dossier `Django/` :

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 3.3 Lancement

```bash
python manage.py runserver 0.0.0.0:8000
```

API locale: `http://localhost:8000/api/`  
Docs locales: `http://localhost:8000/api/docs/`

---

## 4) Mobile — Installation & lancement (Expo)

### 4.1 Config API

Le mobile lit la base URL dans `Native/constants/config.ts`.  
En production, la valeur attendue est:
- `https://api.altoppe.sn/api`

### 4.2 Installation

Depuis `Native/` :

```bash
npm install
npx expo start
```

Pour lancer sur Android :

```bash
npx expo run:android
```

---

## 5) Web — Installation & lancement (React)

Depuis `React/` :

```bash
npm install
npm run dev
```

Build production :

```bash
npm run build
```

---

## 6) Authentification & rôles (résumé)

Rôles supportés :
- **entrepreneur**
- **coach**
- **admin**
- **bailleur**

Authentification :
- JWT access/refresh
- Stockage tokens:
  - **Mobile**: AsyncStorage
  - **Web**: localStorage

---

## 7) Endpoints clés (raccourci)

Base: `/api/`

- Auth: `/api/auth/*`
- Entrepreneurs: `/api/entrepreneurs/*`
- Finances: `/api/finances/*`
- Business plans: `/api/business-plans/*`
- Coaching: `/api/coaching/*`
- Alerts & IA: `/api/alerts_ai/*`
- IA (Gemini/Hybrid): `/api/ai/*`

Pour la liste complète, utiliser Swagger: `/api/docs/`.

---

## 8) Déploiement (résumé)

### Backend
- Mettre `DEBUG=False`
- Configurer PostgreSQL
- Configurer HTTPS (reverse proxy Nginx/Apache)
- Lancer via Gunicorn/Uvicorn (selon votre setup)
- Exécuter `collectstatic`

### Web
- `npm run build`
- Servir `React/dist/` via Nginx/Apache

### Mobile
- Build via EAS (Expo) ou `expo run:*`
- Publier Play Store / App Store

---

## 9) Checklist de livraison (recommandée)

- [ ] Repo/Archive code (Backend + Mobile + Web)
- [ ] Fichier(s) `.env.example` + variables prod/staging
- [ ] Accès serveur (SSH) + domaine + certificats (si applicable)
- [ ] Accès DB (host/user/pass) + backup
- [ ] Accès admin Django
- [ ] Lien Swagger/Redoc + URL prod
- [ ] Procès-verbal de livraison (périmètre livré + limites + éléments remis)

---

## 10) Dépannage rapide

- **401 Authentification requise**: vérifier token JWT et header `Authorization: Bearer <token>`
- **CORS**: vérifier `CORS_ALLOWED_ORIGINS` et domaines web
- **PDF**: vérifier permissions (coach/admin/propriétaire) + headers Accept
- **Mobile “Network request failed”**: vérifier `API_BASE_URL` + HTTPS + certificat

