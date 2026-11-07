// ============================================================
// VibeFlow Studio — Custom Skills & Personas Marketplace
// Phase 8.3: Pluggable domain skills (OWASP Security, 60fps Web Vitals,
// WCAG/RGAA Accessibility, Clean Architecture DDD, SEO) and
// customizable behavioral personas for Claude Code Pro and Antigravity CLI.
// ============================================================

import { getInstalledSkillsMpPrompts } from "@/lib/skillsmp-client";

export interface AgentSkill {
  id: string;
  name: string;
  category: "SECURITY" | "PERFORMANCE" | "ACCESSIBILITY" | "ARCHITECTURE" | "SEO";
  badge: string;
  icon: string;
  description: string;
  enabled: boolean;
  systemPromptInjection: string;
}

export interface AgentPersona {
  id: string;
  name: string;
  agent: "claude" | "antigravity";
  temperament: string;
  description: string;
  customPrompt?: string;
  isDefault?: boolean;
}

// In-memory persistent registry for active skills & personas
const globalSkills = global as unknown as {
  __vibeflowSkills?: AgentSkill[];
  __vibeflowPersonas?: {
    claude: AgentPersona;
    antigravity: AgentPersona;
  };
};

export const DEFAULT_SKILLS: AgentSkill[] = [
  {
    id: "owasp-security",
    name: "Bouclier Sécurité OWASP Top 10",
    category: "SECURITY",
    badge: "Sécurité",
    icon: "🛡️",
    description: "Impératif absolu de protection CSRF/XSS, validation d'entrées via Zod, requêtes SQL paramétrées et chiffrement des secrets.",
    enabled: true,
    systemPromptInjection: `[RÈGLE STRICTE - SKILL OWASP] Vous devez auditer chaque endpoint et composant contre les failles OWASP Top 10 : aucune injection SQL, typage strict Zod pour tout payload entrant, pas de secrets dans le code client, protection CSRF sur les mutations POST/PUT/DELETE.`,
  },
  {
    id: "web-vitals-60fps",
    name: "Optimiseur 60fps & Core Web Vitals",
    category: "PERFORMANCE",
    badge: "60 FPS",
    icon: "⚡",
    description: "Garantit LCP < 1.2s, CLS < 0.05, absence de re-renders inutiles (useMemo, useCallback), et animations GPU (transform / opacity).",
    enabled: true,
    systemPromptInjection: `[RÈGLE STRICTE - SKILL 60FPS] Chaque composant React doit viser un rendu à 60 images par seconde. Évitez les calculs coûteux dans la boucle de rendu, préférez CSS transform3d pour les animations, et minimisez le Cumulative Layout Shift (CLS) avec des placeholders dimensionnés.`,
  },
  {
    id: "wcag-accessibility",
    name: "Accessibilité RGAA & WCAG 2.1 AA",
    category: "ACCESSIBILITY",
    badge: "Accessibilité",
    icon: "♿",
    description: "Navigation clavier intégrale (tabindex, focus visible), contraste de couleurs >= 4.5:1, et attributs ARIA natifs.",
    enabled: false,
    systemPromptInjection: `[RÈGLE STRICTE - SKILL ACCESSIBILITÉ] Tous les composants interactifs doivent être 100% accessibles au clavier, disposer de focus visible cohérent, respecter un ratio de contraste 4.5:1, et comporter des aria-label explicites pour les lecteurs d'écran.`,
  },
  {
    id: "clean-architecture-ddd",
    name: "Domain-Driven Design & Typage Strict",
    category: "ARCHITECTURE",
    badge: "Clean Code",
    icon: "🏛️",
    description: "Séparation hermétique des couches UI, Cas d'usage (services/libs) et Infrastructure (Prisma). Zéro type 'any'.",
    enabled: true,
    systemPromptInjection: `[RÈGLE STRICTE - SKILL CLEAN ARCHITECTURE] Interdiction formelle du type 'any'. Les mutations d'état doivent résider dans les stores ou les services dédiés, jamais dispersées dans les composants UI. Les modèles Prisma doivent être mappés via des DTOs explicites.`,
  },
  {
    id: "seo-metadata",
    name: "Spécialiste SEO & OpenGraph Enrichi",
    category: "SEO",
    badge: "SEO / SMO",
    icon: "🌐",
    description: "Génération automatique des balises Meta, aperçus OpenGraph dynamiques et données structurées JSON-LD.",
    enabled: false,
    systemPromptInjection: `[RÈGLE STRICTE - SKILL SEO] Chaque page publique doit comporter des métadonnées dynamiques complètes (title, description, canonical, openGraph, twitter cards) et un balisage Schema.org JSON-LD conforme.`,
  },
];

export const AVAILABLE_PERSONAS: AgentPersona[] = [
  // Claude Personas
  {
    id: "claude-security-architect",
    agent: "claude",
    name: "Auditeur Sécurité & Architecte Paranoïaque",
    temperament: "Exigeant, rigoureux, intraitable sur la gestion des erreurs",
    description: "Scrute chaque ligne de backend, valide les transactions atomiques et traque les failles potentielles.",
    isDefault: true,
    customPrompt: "Vous êtes Claude, Senior Principal Architect. Votre priorité absolue est la résilience des APIs, le respect du schéma de données, la sécurité et la clarté algorithmique.",
  },
  {
    id: "claude-pragmatic-mvp",
    agent: "claude",
    name: "Pragmatique Lean Startup",
    temperament: "Focalisé sur la simplicité, évite la sur-ingénierie",
    description: "Favorise les solutions simples et directes pour expédier le code le plus rapidement possible en production.",
    customPrompt: "Vous êtes Claude, Startup CTO. Votre priorité est la vélocité et la concision : la meilleure ligne de code est celle qu'on n'a pas besoin d'écrire.",
  },

  // Antigravity Personas
  {
    id: "agy-apple-designer",
    agent: "antigravity",
    name: "Designer Apple & UX Minimaliste 60fps",
    temperament: "Esthète obsessionnel, passionné de micro-interactions fluides",
    description: "Conçoit des interfaces épurées, typographies soignées, glassmorphism subtil et rétroaction tactile immédiate.",
    isDefault: true,
    customPrompt: "Vous êtes Antigravity, Lead Designer & Frontend Architect. Votre obsession est l'élégance visuelle, la fluidité 60fps, les transitions subtiles et une ergonomie intuitive sans friction.",
  },
  {
    id: "agy-creative-hacker",
    agent: "antigravity",
    name: "Hacker Créatif & Effets Visuels Révolutionnaires",
    temperament: "Audacieux, utilise les dernières capacités de Tailwind et CSS moderne",
    description: "Propose des animations audacieuses, graphismes dynamiques et présentations interactives époustouflantes.",
    customPrompt: "Vous êtes Antigravity, Créative Tech Lead. Vous poussez les limites de Tailwind, Canvas et SVG pour créer une expérience visuelle mémorable.",
  },
];

// Initialize global state
if (!globalSkills.__vibeflowSkills) {
  globalSkills.__vibeflowSkills = [...DEFAULT_SKILLS];
}
if (!globalSkills.__vibeflowPersonas) {
  globalSkills.__vibeflowPersonas = {
    claude: AVAILABLE_PERSONAS.find((p) => p.id === "claude-security-architect")!,
    antigravity: AVAILABLE_PERSONAS.find((p) => p.id === "agy-apple-designer")!,
  };
}

export function getAllSkills(): AgentSkill[] {
  return globalSkills.__vibeflowSkills || DEFAULT_SKILLS;
}

export function toggleSkill(skillId: string, enabled: boolean): AgentSkill | undefined {
  const skills = getAllSkills();
  const skill = skills.find((s) => s.id === skillId);
  if (skill) {
    skill.enabled = enabled;
  }
  return skill;
}

export function getCurrentPersonas(): { claude: AgentPersona; antigravity: AgentPersona } {
  return (
    globalSkills.__vibeflowPersonas || {
      claude: AVAILABLE_PERSONAS.find((p) => p.id === "claude-security-architect")!,
      antigravity: AVAILABLE_PERSONAS.find((p) => p.id === "agy-apple-designer")!,
    }
  );
}

export function setAgentPersona(agent: "claude" | "antigravity", personaId: string): AgentPersona {
  const persona = AVAILABLE_PERSONAS.find((p) => p.agent === agent && p.id === personaId);
  if (!persona) {
    throw new Error(`Persona not found: ${personaId}`);
  }
  if (!globalSkills.__vibeflowPersonas) {
    globalSkills.__vibeflowPersonas = {
      claude: AVAILABLE_PERSONAS.find((p) => p.id === "claude-security-architect")!,
      antigravity: AVAILABLE_PERSONAS.find((p) => p.id === "agy-apple-designer")!,
    };
  }
  globalSkills.__vibeflowPersonas[agent] = persona;
  return persona;
}

/**
 * Builds the contextual skills and persona prompt additions injected into agent debates.
 */
export function buildSkillsAndPersonaPrompt(): string {
  const skills = getAllSkills().filter((s) => s.enabled);
  const personas = getCurrentPersonas();

  const lines: string[] = [];

  lines.push(`\n=== PERSONAS ACTIFS DES AGENTS ===`);
  lines.push(`• Claude (${personas.claude.name}) : ${personas.claude.temperament}.`);
  lines.push(`• Antigravity (${personas.antigravity.name}) : ${personas.antigravity.temperament}.`);

  if (skills.length > 0) {
    lines.push(`\n=== COMPÉTENCES MÉTIERS PLUGGÉES (SKILLS ACTIFS) ===`);
    for (const skill of skills) {
      lines.push(`${skill.systemPromptInjection}`);
    }
  }

  // Inject active SkillsMP marketplace skills
  const skillsMpPrompt = getInstalledSkillsMpPrompts();
  if (skillsMpPrompt) {
    lines.push(skillsMpPrompt);
  }

  return lines.join("\n");
}
