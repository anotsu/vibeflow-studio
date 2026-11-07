---
tags: [vibeflow, skillsmp, agent-skill, marketplace]
skill_id: skillsmp/stripe-webhook-guardian
name: Stripe Webhook Guardian & Idempotency
author: anthropics-community
category: Payment
stars: 1420
source_url: https://skillsmp.com/skills/stripe-webhook-guardian
installed_at: 2026-11-07
project_id: test-saas
---

# ⚡ Compétence Agent SkillsMP : Stripe Webhook Guardian & Idempotency

> [!NOTE] Module Intégré depuis SkillsMP (skillsmp.com)
> Cette compétence spécialisée enrichit dynamiquement l'intelligence des agents Claude Code Pro et Antigravity CLI.
> Elle est injectée dans les débats d'architecture et les phases de synthèse.

### Métadonnées
- **Auteur** : `anthropics-community`
- **Catégorie** : `Payment`
- **Popularité** : ⭐ 1420
- **Fiche Officielle** : [https://skillsmp.com/skills/stripe-webhook-guardian](https://skillsmp.com/skills/stripe-webhook-guardian)
- **Dépôt GitHub** : [https://github.com/skillsmp/stripe-webhook-guardian](https://github.com/skillsmp/stripe-webhook-guardian)

---

## 📋 Description & Rôle
Protection et traitement transactionnel robuste des webhooks Stripe, validation de signature, gestion de l'idempotence et récupération automatique en cas d'échec.

---

## 💉 Règle d'Injection Système (Prompt Injecté dans les Agents)
```markdown
[SKILLMP - STRIPE GUARDIAN] Toutes les routes de webhooks Stripe doivent impérativement vérifier la signature brute (raw body) avec le STRIPE_WEBHOOK_SECRET. Toute mutation d'abonnement ou de facture doit être enveloppée dans une transaction idempotente (enregistrement de l'event.id pour interdire le double traitement).
```

---

## 🏷️ Mots-Clés Déclencheurs
`#stripe` `#payment` `#webhooks` `#idempotency` `#fintech`
