# 🚀 AL-TOPPE - Plateforme de Gestion pour Entrepreneurs Sénégalais

**Version** : 1.0.0  
**Statut** : ✅ Production Ready  
**Date de livraison** : Janvier 2026

---

## 📋 Vue d'Ensemble

AL-TOPPE est une plateforme complète de gestion financière et d'accompagnement entrepreneurial pour les entrepreneurs sénégalais. Le projet comprend trois applications principales :

- **Backend API** : Django REST Framework (Python)
- **Application Mobile** : React Native / Expo (iOS, Android)
- **Interface Web** : React + TypeScript (Coaches, Admins, Bailleurs)

---

## 🔗 Dépôts GitHub

### 📦 Backend API (Django)
**Repository** : [https://github.com/Souley97/Al_Toppe_Backend](https://github.com/Souley97/Al_Toppe_Backend)

### 📱 Application Mobile (React Native)
**Repository** : [https://github.com/Souley97/Al_Toppe_Frontend](https://github.com/Souley97/Al_Toppe_Frontend)

### 🌐 Interface Web (React)
**Repository** : [https://github.com/Souley97/Al_Toppe_Web](https://github.com/Souley97/Al_Toppe_Web)

---

## 🚀 Démarrage Rapide

### Backend

```bash
git clone https://github.com/Souley97/Al_Toppe_Backend.git
cd Al_Toppe_Backend/Django
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Mobile

```bash
git clone https://github.com/Souley97/Al_Toppe_Frontend.git
cd Al_Toppe_Frontend/Native
npm install
npx expo start
```

### Web

```bash
git clone https://github.com/Souley97/Al_Toppe_Web.git
cd Al_Toppe_Web/React
npm install
npm run dev
```

---

## 📚 Documentation

### Documentation Complète

📖 **[Documentation de Livraison Complète](docs/DOCUMENTATION_LIVRAISON_COMPLETE.md)**

Cette documentation inclut :
- Vue d'ensemble du projet
- Liens vers tous les dépôts GitHub
- Instructions d'installation détaillées
- Liste complète des fonctionnalités livrées
- Guide de déploiement
- Accès et credentials
- Guide pour nouveaux développeurs

### Documentation par Module

- **[Installation Backend](docs/BACKEND_SETUP.md)** - Configuration du backend Django
- **[Installation Mobile](docs/MOBILE_SETUP.md)** - Configuration de l'app mobile
- **[Installation Web](docs/WEB_SETUP.md)** - Configuration de l'interface web
- **[Déploiement VPS](docs/VPS_DEPLOYMENT.md)** - Guide de déploiement sur VPS
- **[Checklist de Livraison](docs/DELIVERY_CHECKLIST.md)** - Checklist complète

---

## ✅ Fonctionnalités Principales

### 🔐 Authentification
- Inscription et connexion par téléphone
- Vérification OTP
- Mot de passe oublié / Réinitialisation
- Gestion des rôles (Entrepreneur, Coach, Bailleur, Admin)

### 💰 Finances
- Gestion des transactions (revenus/dépenses)
- 23 catégories prédéfinies
- Compte de résultat en temps réel
- Analyse financière IA (Gemini)
- Alertes intelligentes
- Mode offline avec synchronisation

### 📋 Business Plans
- Création guidée par secteur
- Génération assistée par IA
- Export PDF fonctionnel
- Workflow de validation multi-étapes
- Gestion des statuts

### 🎤 Voice AI
- Enregistrement audio vocal
- Extraction intelligente (Regex + Gemini)
- Support multilingue (Wolof, Français)
- Détection d'intentions et extraction d'entités

### 🎓 Coaching
- Dashboard coach moderne
- Gestion des entrepreneurs assignés
- Création et gestion de sessions
- Rapports de performance avec graphiques
- Assignation en masse (Admin)

### 🔔 Alertes & Notifications
- Alertes personnalisées par utilisateur
- Notifications système
- Alertes financières intelligentes
- Rappels automatiques

### 🛡️ Administration
- Dashboard admin moderne
- Gestion des utilisateurs
- Statistiques globales
- Journal des transactions

---

## 🌐 Déploiement

### URLs de Production

- **API** : https://api.altoppe.sn/api
- **Web** : https://altoppe.sn/
- **Documentation API** : https://api.altoppe.sn/api/docs/

### VPS

- **IP** : 72.60.189.237
- **OS** : Ubuntu 24.04 LTS
- **Documentation** : Voir [docs/VPS_DEPLOYMENT.md](docs/VPS_DEPLOYMENT.md)

---

## 🛠️ Technologies

### Backend
- Django 5.0.2
- Django REST Framework
- PostgreSQL 15
- Redis 7
- Celery
- Google Gemini AI
- JWT Authentication

### Mobile
- React Native (Expo)
- TypeScript
- AsyncStorage (cache offline)
- React Navigation
- Expo Audio

### Web
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts

---

## 📊 Statistiques

- **13 modules** Django backend
- **100+ endpoints** API
- **15+ écrans** mobile
- **20+ composants** web
- **4 rôles** utilisateurs supportés

---

## 📞 Support

Pour toute question ou problème, consulter :
- **[Documentation de Livraison Complète](docs/DOCUMENTATION_LIVRAISON_COMPLETE.md)**
- Les issues GitHub sur les repositories respectifs
- La documentation API : https://api.altoppe.sn/api/docs/

---

## 📝 Licence

Propriétaire - Tous droits réservés

---

**Dernière mise à jour** : Janvier 2026
