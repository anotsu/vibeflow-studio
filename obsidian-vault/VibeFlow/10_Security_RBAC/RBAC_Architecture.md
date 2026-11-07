---
tags: [vibeflow, security, rbac, authentication, admin, audit]
project: VibeFlow Studio
version: 1.0.0
updated: 2026-11-07
status: IMPLEMENTED
security_level: CRITICAL
---

# 🛡️ Architecture de Sécurité, Authentification & Console d'Administration (RBAC)

> [!IMPORTANT]
> **VibeFlow Studio** intègre un système d'authentification robuste et un contrôle d'accès basé sur les rôles (**RBAC** : *Role-Based Access Control*), garantissant l'isolation des projets, la traçabilité intégrale de toutes les actions sensibles via un journal d'audit, ainsi qu'une console d'administration centrale pour le pilotage système et la maintenance des worktrees Git.

---

## 1. Principes Fondamentaux de Sécurité

1. **Zéro Dépendance Vulnérable** : Le hachage des mots de passe utilise l'algorithme cryptographique natif de Node.js `crypto.scryptSync` avec salage individuel aléatoire (16 octets) et clé dérivée (64 octets), éliminant tout risque lié aux modules binaires compilés tiers (comme `bcrypt` ou `argon2`).
2. **Protection Anti-Timing Attack** : La validation des empreintes de mots de passe s'effectue via `crypto.timingSafeEqual`, prévenant toute analyse de temps de réponse par un attaquant réseau.
3. **Sessions Sécurisées sans État Client Non Vérifié** : Les sessions sont stockées côté serveur (avec identifiant UUID cryptographique v4) et transmises via un cookie HTTP sécurisé `vibeflow_session` (`HttpOnly`, `SameSite=Lax`, durée 7 jours).
4. **Résilience Double-Couche (In-Memory Fallback)** : En cas d'indisponibilité momentanée du serveur PostgreSQL, le moteur d'authentification bascule automatiquement et de manière transparente sur un cache sécurisé en mémoire ensemencé avec les comptes par défaut, évitant tout blocage du studio.

---

## 2. Modèle de Rôles et Permissions (RBAC)

VibeFlow applique une matrice de droits stricte entre deux rôles canoniques :

```mermaid
graph TD
    classDef admin fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#000;
    classDef user fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef action fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff;

    subgraph Roles
        ADMIN[👑 Rôle ADMIN]:::admin
        USER[👤 Rôle USER]:::user
    end

    subgraph Capacités_Utilisateur
        C1[Accès au Dashboard & Kanban]:::action
        C2[Création & Pilotage de Projets]:::action
        C3[Lancement de Duels Dual-Agent]:::action
        C4[Configuration des CLIs Pro 0€]:::action
        C5[Consultation du Store SkillsMP]:::action
    end

    subgraph Capacités_Administrateur
        A1[Console d'Administration Dédiée]:::action
        A2[Gestion des Comptes Utilisateurs Promote / Demote / Suspend]:::action
        A3[Réinitialisation des Mots de Passe]:::action
        A4[Consultation des Journaux d'Audit AUTH / SECURITY / SYSTEM]:::action
        A5[Purge des Git Worktrees Orphelins /tmp/vibeflow-worktrees/]:::action
        A6[Monitoring Santé PostgreSQL & Métriques Hôte CPU/RAM]:::action
    end

    USER --> C1
    USER --> C2
    USER --> C3
    USER --> C4
    USER --> C5

    ADMIN --> C1
    ADMIN --> C2
    ADMIN --> C3
    ADMIN --> C4
    ADMIN --> C5
    ADMIN --> A1
    ADMIN --> A2
    ADMIN --> A3
    ADMIN --> A4
    ADMIN --> A5
    ADMIN --> A6
```

### Matrice des Droits Détaillée

| Fonctionnalité / Endpoint | Utilisateur Standard (`USER`) | Administrateur (`ADMIN`) |
| :--- | :---: | :---: |
| **Accès Dashboard & Kanban** | ✅ Autorisé | ✅ Autorisé |
| **Création de Projets** | ✅ Autorisé | ✅ Autorisé |
| **Lancement de Débats & Duels** | ✅ Autorisé | ✅ Autorisé |
| **Profil Personnel & Mot de Passe** | ✅ Autorisé | ✅ Autorisé |
| **Liste de tous les Utilisateurs** | ❌ Refusé (403) | ✅ Autorisé |
| **Création Manuelle d'Utilisateurs** | ❌ Refusé (403) | ✅ Autorisé |
| **Changement de Rôle (Promote / Demote)** | ❌ Refusé (403) | ✅ Autorisé |
| **Suspension de Compte (`SUSPENDED`)** | ❌ Refusé (403) | ✅ Autorisé |
| **Suppression de Compte** | ❌ Refusé (403) | ✅ Autorisé (Auto-suppression interdite) |
| **Consultation des Journaux d'Audit** | ❌ Refusé (403) | ✅ Autorisé (Filtrage par catégorie) |
| **Purge des Git Worktrees `/tmp`** | ❌ Refusé (403) | ✅ Autorisé |
| **Test Latence Base de Données** | ❌ Refusé (403) | ✅ Autorisé |

---

## 3. Modèle de Données Prisma

Les modèles ajoutés au schéma Prisma (`prisma/schema.prisma`) :

```prisma
enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING
}

model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String
  name         String
  role         UserRole    @default(USER)
  status       UserStatus  @default(ACTIVE)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  lastLoginAt  DateTime?

  sessions     Session[]
  auditLogs    AuditLog[]
  projects     Project[]
}

model Session {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  category  String   @default("SYSTEM") // AUTH, USER_MGMT, SYSTEM, DEPLOYMENT, SECURITY
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique
  code      String   // Code de vérification à 6 chiffres
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model SystemSetting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String   // Stockage sérialisé JSON (ex: configuration SMTP)
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}
```

---

## 4. Architecture des Routes API Sécurisées

```mermaid
sequenceDiagram
    autonumber
    actor Client as 💻 Navigateur Frontend
    participant Middleware as 🛡️ Guard (requireAuth / requireAdmin)
    participant Route as ⚡ API Route (/api/admin/...)
    participant Audit as 📝 Journal d'Audit
    participant Store as 🗄️ PostgreSQL / Fallback

    Client->>Route: Requête avec Cookie 'vibeflow_session'
    Route->>Middleware: Vérification validité session & statut
    alt Session Invalide ou Absente
        Middleware-->>Client: 401 Unauthorized
    else Compte Suspendu (SUSPENDED)
        Middleware-->>Client: 403 Forbidden ("Compte suspendu")
    else Rôle Insuffisant (requireAdmin)
        Middleware-->>Client: 403 Forbidden ("Accès réservé aux administrateurs")
    else Session Valide & Droits OK
        Middleware->>Route: Context { user, session }
        Route->>Store: Exécution de l'opération (CRUD, purge, etc.)
        Route->>Audit: logAuditEvent(action, category, details)
        Route-->>Client: 200 OK + Payload JSON
    end
```

### Endpoints Implémentés

- `POST /api/auth/register` : Inscription d'un nouvel utilisateur (le premier utilisateur inscrit reçoit automatiquement le rôle `ADMIN`).
- `POST /api/auth/login` : Authentification, génération de session, cookie `vibeflow_session` et log d'audit.
- `POST /api/auth/logout` : Révocation de session et purge du cookie.
- `GET /api/auth/me` : Données du compte connecté (`SafeUser`).
- `POST /api/auth/change-password` : Changement autonome du mot de passe utilisateur (vérification préalable de l'ancien mot de passe via `crypto.timingSafeEqual`).
- `POST /api/auth/forgot-password` : Demande de réinitialisation avec génération d'un token sécurisé (256-bit) et code court à 6 chiffres (validité 1h) ; expédition par email SMTP ou mode de secours direct.
- `POST /api/auth/reset-password` : Validation du token/code et attribution du nouveau mot de passe haché par scrypt.
- `GET /api/admin/users` : Liste exhaustive des utilisateurs avec statut, rôle, nombre de projets et dernière connexion.
- `POST /api/admin/users` : Création administrative directe d'un compte.
- `PATCH /api/admin/users/[id]` : Modification du rôle (`USER` $\leftrightarrow$ `ADMIN`), statut (`ACTIVE` $\leftrightarrow$ `SUSPENDED`) ou réinitialisation directe par l'administrateur.
- `DELETE /api/admin/users/[id]` : Suppression d'un compte (avec garde-fou interdisant l'auto-suppression de l'admin connecté).
- `GET /api/admin/smtp` : Consultation de la configuration SMTP actuelle (mots de passe masqués).
- `POST /api/admin/smtp` : Sauvegarde des paramètres du serveur de messagerie et déclenchement d'un email de test avec diagnostic en direct.
- `GET /api/admin/audit-logs` : Consultation chronologique des journaux d'audit avec filtrage catégoriel.
- `GET /api/admin/system` : Rapport de santé hôte (CPU, RAM, Uptime, version Node, statut PostgreSQL, liste des worktrees actifs).
- `POST /api/admin/system` : Déclenchement de la purge des dossiers `/tmp/vibeflow-worktrees/` ou test de latence base de données.

---

## 5. Interface Utilisateur & Intégration Visuelle

1. **TopBar Interactive (`src/components/layout/TopBar.tsx`)** :
   - Affichage de l'avatar utilisateur avec badge de rôle dynamique : `ADMIN` en doré (`bg-amber-500/20 text-amber-300`) ou `USER` en bleu (`bg-blue-500/20 text-blue-300`).
   - Menu déroulant avec informations du profil, indicateur de statut en temps réel, lien d'accès à la **Console d'Administration** (visible uniquement pour les administrateurs).
   - Accès direct au bouton **"Changer mon mot de passe"** ouvrant la modale dédiée `<ChangePasswordModal />`.
   - Bouton de déconnexion immédiate.
   - Bouton "Se Connecter" avec ouverture de la boîte de dialogue si l'utilisateur est invité.
2. **Boîte d'Authentification (`src/components/auth/AuthDialog.tsx`)** :
   - Vues commutables : **Connexion**, **Inscription**, **Mot de passe oublié** et **Nouveau mot de passe**.
   - Flux de réinitialisation sans friction : saisie de l'email, réception du code de sécurité à 6 chiffres, attribution du nouveau mot de passe avec jauge de validation.
   - En environnement de test ou si SMTP est désactivé, le code de validation et le lien direct sont affichés directement dans la modale pour une validation instantanée.
3. **Modale Changement de Mot de Passe (`src/components/auth/ChangePasswordModal.tsx`)** :
   - Formulaire dédié pour l'utilisateur connecté avec contrôle de l'ancien mot de passe, confirmation du nouveau mot de passe (8+ caractères) et messages de retour contextuels.
4. **Console d'Administration Complète (`src/components/admin/AdminConsoleModal.tsx`)** :
   - **Onglet 1 : Utilisateurs & Droits** : Tableau de bord des comptes, promotion/rétrogradation instantanée de rôle, suspension en un clic, bouton dédié **"Réinitialiser le mot de passe"** pour forcer un nouveau mot de passe sur n'importe quel compte cible, et suppression protégée.
   - **Onglet 2 : Journaux d'Audit** : Visualisation en direct de tous les événements avec pastilles de sévérité et métadonnées JSON détaillées.
   - **Onglet 3 : Santé Système & Worktrees** : Métriques système en direct (RAM utilisée, cœurs CPU, latence DB, nombre de worktrees actifs) et bouton de purge complète des worktrees orphelins.
   - **Onglet 4 : Messagerie & SMTP** : Formulaire de configuration complet (Hôte SMTP, Port 25/465/587, Sécurité SSL/TLS, Identifiant, Mot de passe masqué, Adresse d'expédition, Interrupteur d'activation) et outil d'envoi d'email de test avec rapport d'analyse de connexion en direct.

---

## 6. Comptes Initiaux par Défaut (Environnement Local & Démo)

| Rôle | Adresse Email | Mot de Passe par Défaut | Usage |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@vibeflow.local` | `AdminVibe2026!` | Administration globale de la solution |
| **USER** | `dev@vibeflow.local` | `UserVibe2026!` | Développeur standard & création de projets |

> [!TIP]
> Lors du premier lancement en production sur une base de données vierge, le premier compte créé via le formulaire d'inscription se voit automatiquement attribuer le rôle **ADMIN**. Tous les comptes suivants sont créés avec le rôle **USER** par défaut.

---

## 7. Gestion des Mots de Passe & Procédure "Mot de Passe Oublié"

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Utilisateur
    participant UI as 💻 AuthDialog / ChangePasswordModal
    participant AuthAPI as ⚡ API Auth (/api/auth/...)
    participant Mailer as 📧 Service Mailer (Nodemailer)
    participant SMTP as 🌐 Serveur SMTP
    participant DB as 🗄️ PostgreSQL / Cache Mémoire

    alt 1. Changement de mot de passe par l'utilisateur connecté
        User->>UI: Saisit Ancien Mot de Passe + Nouveau Mot de Passe
        UI->>AuthAPI: POST /api/auth/change-password
        AuthAPI->>DB: Vérification scrypt de l'ancien mot de passe
        AuthAPI->>DB: Mise à jour avec le nouveau hash scrypt
        AuthAPI-->>UI: 200 OK + Journal d'audit créé
    else 2. Demande "Mot de passe oublié"
        User->>UI: Saisit son adresse email
        UI->>AuthAPI: POST /api/auth/forgot-password
        AuthAPI->>DB: Génère Token aléatoire + Code 6 chiffres (1h expiry)
        alt SMTP Activé & Connecté
            AuthAPI->>Mailer: sendPasswordResetEmail(email, token, code)
            Mailer->>SMTP: Envoi message HTML responsive
            AuthAPI-->>UI: 200 OK ("Code envoyé par email")
        else SMTP Inactif / Non joignable (Fallback)
            AuthAPI-->>UI: 200 OK + Code 6 chiffres & Lien retournés directement
        end
        User->>UI: Saisit le Code à 6 chiffres + Nouveau mot de passe
        UI->>AuthAPI: POST /api/auth/reset-password
        AuthAPI->>DB: Validation du token/code non expiré et non utilisé
        AuthAPI->>DB: Invalidation du token (used=true) & Enregistrement nouveau hash
        AuthAPI-->>UI: 200 OK (Mot de passe réinitialisé)
    else 3. Réinitialisation administrative
        User->>UI: Admin clique sur "Réinitialiser mot de passe"
        UI->>AuthAPI: PATCH /api/admin/users/:id { password: "NouveauMotDePasse" }
        AuthAPI->>DB: Hash scrypt + logAuditEvent("USER_PASSWORD_RESET_BY_ADMIN")
        AuthAPI-->>UI: 200 OK
    end
```

---

## 8. Configuration de Messagerie & Serveur SMTP

Le module de messagerie transactionnelle (`src/lib/mailer.ts`) intègre les fonctionnalités suivantes :

1. **Compatibilité Standardisée (Nodemailer)** : Prise en charge universelle des serveurs SMTP d'entreprise (Port 25/587 STARTTLS ou Port 465 SSL/TLS direct) ainsi que des fournisseurs cloud (Postmark, SendGrid, Amazon SES, Brevo, Mailgun).
2. **Stockage Persistant & Masquage de Clé** : Les paramètres SMTP sont conservés dans la table PostgreSQL `SystemSetting` sous la clé `smtp_config` (ou en cache mémoire global résilient). Les mots de passe ne sont jamais renvoyés en clair dans les réponses API (`••••••••`).
3. **Template Responsive avec Charte VibeFlow** : L'email de réinitialisation est généré avec un design moderne (dégradé violet/indigo, logo VibeFlow Studio, boîte d'affichage du code à 6 chiffres en grand format, bouton d'action directe et avertissement de sécurité sur l'expiration d'une heure).
4. **Diagnostic & Test d'Envoi en Direct** : Depuis l'onglet "Messagerie & SMTP" de la console d'administration, les administrateurs peuvent tester la connectivité SMTP en temps réel avec message de diagnostic précis (authentification, port bloqué, timeout) et envoi d'un email de test.
5. **Autonomie Totale (Mode Sans Serveur Mail)** : Pour éviter tout blocage en environnement de développement local ou sur un serveur isolé, si le serveur SMTP n'est pas configuré ou désactivé, le système active automatiquement un mode Fallback fournissant immédiatement le code et le lien de validation à l'utilisateur dans l'interface.
