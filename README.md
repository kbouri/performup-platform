# PerformUp Platform

Plateforme collaborative d'accompagnement d'étudiants pour les candidatures aux masters des grandes écoles européennes.

## Stack Technique

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui (Radix UI)
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon recommandé)
- **Auth**: Better Auth
- **Storage**: Vercel Blob

## Structure du Projet

```
performup-platform/
├── prisma/
│   └── schema.prisma       # Schéma de base de données complet
├── src/
│   ├── app/
│   │   ├── (auth)/         # Pages d'authentification
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/    # Pages protégées
│   │   │   ├── dashboard/
│   │   │   ├── students/
│   │   │   ├── planning/
│   │   │   ├── documents/
│   │   │   └── essays/
│   │   └── api/
│   │       └── auth/       # API Better Auth
│   ├── components/
│   │   ├── layout/         # Composants de layout
│   │   ├── students/       # Composants étudiants
│   │   └── ui/             # Design System
│   ├── lib/
│   │   ├── auth.ts         # Configuration Better Auth
│   │   ├── auth-client.ts  # Client auth pour le frontend
│   │   ├── db/             # Client Prisma
│   │   └── utils.ts        # Utilitaires
│   └── types/
│       └── auth.d.ts       # Types personnalisés
├── tailwind.config.ts      # Configuration Tailwind + Design System
└── package.json
```

## Design System

### Couleurs

- **PerformUp Blue**: `#495C93` - Couleur principale
- **PerformUp Gold**: `#C8B38D` - Couleur d'accent
- **Success**: `#22C55E`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`

### Typographie

- **Headings**: DM Serif Display
- **Body**: Plus Jakarta Sans

### Règles Importantes

- **JAMAIS** d'emojis dans l'interface
- **JAMAIS** de pourcentages affichés (utiliser des barres de progression visuelles avec messages encourageants)

## Rôles et Permissions

| Rôle | Description |
|------|-------------|
| **Admin** | Accès complet à toute la plateforme |
| **Chef Exécutif** | Lecture seule sur les mentors supervisés |
| **Mentor** | Gestion complète de ses étudiants |
| **Professeur** | Accès aux cours et planning (Quant/Verbal) |
| **Étudiant** | Accès à son propre espace |

## Installation

1. **Cloner et installer les dépendances**

```bash
cd performup-platform
npm install
```

2. **Configuration**

Créer un fichier `.env` basé sur `.env.example`:

```bash
cp .env.example .env
```

Configurer les variables d'environnement:

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="votre-secret-minimum-32-caracteres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. **Base de données**

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations (ou push pour dev)
npx prisma db push
```

4. **Lancer le serveur de développement**

```bash
npm run dev
```

## Commandes Utiles

```bash
# Développement
npm run dev

# Build production
npm run build

# Linting
npm run lint

# Prisma Studio (visualiser la DB)
npx prisma studio

# Générer le client Prisma
npx prisma generate

# Push schema vers DB
npx prisma db push
```

## Fonctionnalités Implémentées

- [x] Authentification (login/register) avec Better Auth
- [x] Design System complet avec composants UI
- [x] Navigation par rôle
- [x] Dashboard avec statistiques
- [x] Gestion des étudiants (CRM)
- [x] Onboarding étudiant en 4 étapes
- [x] Planning interactif (vue semaine/jour/liste)
- [x] Système de documents avec dossiers
- [x] Tracker d'essays par école
- [x] Schéma Prisma complet

## À Développer

- [ ] API endpoints complets
- [ ] Intégration Google Calendar
- [ ] Upload de documents (Vercel Blob)
- [ ] Système de notifications temps réel (WebSocket)
- [ ] Module comptabilité
- [ ] Tests unitaires et E2E

## Licence

Propriétaire - PerformUp
