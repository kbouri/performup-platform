# 🌱 Guide de Seeding de la Base de Données Production

Ce guide explique comment initialiser la base de données de production sur Vercel avec les utilisateurs de test.

## 📋 Prérequis

1. **Vercel CLI installé**
   ```bash
   npm i -g vercel
   ```

2. **Authentifié avec Vercel**
   ```bash
   vercel login
   ```

3. **Lié au projet**
   ```bash
   vercel link
   ```

## 🚀 Méthode 1: Seed via Vercel CLI (Recommandé)

### Étape 1: Récupérer l'URL de la base de données de production

```bash
vercel env pull .env.production
```

Cela va télécharger les variables d'environnement de production dans `.env.production`.

### Étape 2: Exécuter le seed script

```bash
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npm run db:seed
```

Ou manuellement:

1. Ouvrez `.env.production` et copiez la valeur de `DATABASE_URL`
2. Exécutez:
   ```bash
   DATABASE_URL="votre_url_de_production" npm run db:seed
   ```

### Étape 3: Vérifier

Connectez-vous sur https://performup-platform.vercel.app/login avec:
- **Email**: `admin@performup.fr`
- **Mot de passe**: `PerformUp2024!`

## 🔐 Utilisateurs Créés

Le script de seed crée les utilisateurs suivants (tous avec le mot de passe `PerformUp2024!`):

| Email | Rôle | Description |
|-------|------|-------------|
| `admin@performup.fr` | ADMIN | Administrateur principal |
| `prof@performup.fr` | PROFESSOR | Professeur (Quant) |
| `mentor@performup.fr` | MENTOR | Mentor |
| `exec@performup.fr` | EXECUTIVE_CHEF | Chef Exécutif |
| `student@performup.fr` | STUDENT | Étudiant |

## 🛠️ Méthode 2: Via Vercel Postgres Dashboard

Si vous utilisez Vercel Postgres, vous pouvez aussi:

1. Aller sur le dashboard Vercel → Storage → Votre base de données
2. Ouvrir l'onglet "Query"
3. Exécuter les commandes SQL manuellement (voir section suivante)

## 📝 Méthode 3: Commandes SQL Manuelles

Si vous préférez créer uniquement l'utilisateur admin manuellement:

```sql
-- 1. Créer l'utilisateur
INSERT INTO "User" (id, email, name, "firstName", "lastName", role, active, "emailVerified", "createdAt", "updatedAt")
VALUES (
  'admin-user-id-001',
  'admin@performup.fr',
  'Admin PerformUp',
  'Admin',
  'PerformUp',
  'ADMIN',
  true,
  true,
  NOW(),
  NOW()
);

-- 2. Créer le compte avec mot de passe haché
-- Note: Le mot de passe doit être haché avec scrypt selon les paramètres de Better Auth
-- Il est plus simple d'utiliser le script de seed pour cela

-- 3. Créer le profil admin
INSERT INTO "Admin" (id, "userId", "createdAt", "updatedAt")
VALUES (
  'admin-profile-001',
  'admin-user-id-001',
  NOW(),
  NOW()
);
```

> ⚠️ **Attention**: Cette méthode nécessite de hasher le mot de passe manuellement avec les bons paramètres scrypt. Il est fortement recommandé d'utiliser la Méthode 1.

## 🔍 Dépannage

### Erreur: "User already exists"

Si vous obtenez cette erreur, cela signifie que les utilisateurs existent déjà. Le script de seed supprime automatiquement les utilisateurs existants avant de les recréer.

### Erreur de connexion à la base de données

Vérifiez que:
- L'URL de la base de données est correcte
- Vous avez les permissions nécessaires
- La base de données est accessible depuis votre machine

### Le login ne fonctionne toujours pas

1. Vérifiez que le seed s'est bien exécuté (regardez les logs)
2. Vérifiez que l'utilisateur existe dans la base de données
3. Vérifiez que le compte (Account) a bien été créé avec le mot de passe

## 📚 Scripts Disponibles

```bash
# Pousser le schéma Prisma vers la base de données
npm run db:push

# Exécuter le seed
npm run db:seed
```

## 🔒 Sécurité

> ⚠️ **Important**: Les utilisateurs créés par le seed sont des utilisateurs de TEST. En production:
> 
> 1. Changez immédiatement le mot de passe de l'admin après la première connexion
> 2. Supprimez les autres utilisateurs de test si vous ne les utilisez pas
> 3. Ne commitez JAMAIS le fichier `.env.production` dans Git

## 📞 Support

Si vous rencontrez des problèmes, vérifiez:
1. Les logs de Vercel
2. Les logs de la console lors du seed
3. La structure de la base de données avec Prisma Studio: `npx prisma studio`
