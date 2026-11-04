// ============================================================
// API Route: /api/projects
// List all projects & create new projects
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, encrypt } from "@/lib/utils";
import type { MilestonePhase } from "@prisma/client";

/**
 * GET /api/projects
 * List all projects with milestone count, task count, and latest deployment status.
 */
export async function GET(request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            milestones: true,
            tasks: true,
            deployments: true,
            toolboxItems: true,
          },
        },
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            branch: true,
            environment: true,
            previewUrl: true,
            createdAt: true,
          },
        },
      },
    });

    // Shape response to include latestDeployment as a flat field
    const shaped = projects.map((project) => ({
      ...project,
      latestDeployment: project.deployments[0] ?? null,
      deployments: undefined, // Remove raw deployments array
      // Strip encrypted tokens from list responses
      anthropicApiKey: project.anthropicApiKey ? "••••••••" : null,
      coolifyApiToken: project.coolifyApiToken ? "••••••••" : null,
      githubToken: project.githubToken ? "••••••••" : null,
    }));

    return NextResponse.json(shaped);
  } catch (error) {
    console.error("[GET /api/projects] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

/** Default milestone definitions auto-generated for new projects */
const DEFAULT_MILESTONES: {
  phase: MilestonePhase;
  title: string;
  description: string;
  order: number;
}[] = [
  {
    phase: "ARCHITECTURE",
    title: "Architecture & Planning",
    description:
      "Define project structure, tech stack decisions, and high-level architecture.",
    order: 1,
  },
  {
    phase: "MVP",
    title: "Minimum Viable Product",
    description:
      "Build core features and essential functionality to validate the concept.",
    order: 2,
  },
  {
    phase: "UI_UX",
    title: "UI/UX Polish",
    description:
      "Refine user interface, improve user experience, and add visual polish.",
    order: 3,
  },
  {
    phase: "INTEGRATIONS",
    title: "Integrations & APIs",
    description:
      "Connect third-party services, APIs, and external integrations.",
    order: 4,
  },
  {
    phase: "DEPLOYMENT",
    title: "Deployment & Launch",
    description:
      "Configure CI/CD, deploy to production, and prepare for launch.",
    order: 5,
  },
];

/**
 * POST /api/projects
 * Create a new project with auto-generated milestones.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      vibeDescription,
      githubRepo,
      githubDefaultBranch,
      coolifyAppUuid,
      coolifyServerUrl,
      githubToken,
      anthropicApiKey,
      coolifyApiToken,
    } = body;

    // ── Validate required fields ──────────────────────────────
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }
    if (
      !vibeDescription ||
      typeof vibeDescription !== "string" ||
      vibeDescription.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Vibe description is required" },
        { status: 400 }
      );
    }
    if (
      !githubRepo ||
      typeof githubRepo !== "string" ||
      githubRepo.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "GitHub repo is required" },
        { status: 400 }
      );
    }

    // ── Generate slug & check uniqueness ──────────────────────
    let slug = slugify(name.trim());
    const existingSlug = await prisma.project.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      // Append a random suffix to avoid collision
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // ── Encrypt sensitive tokens ──────────────────────────────
    const encryptedGithubToken = githubToken ? encrypt(githubToken) : null;
    const encryptedAnthropicKey = anthropicApiKey
      ? encrypt(anthropicApiKey)
      : null;
    const encryptedCoolifyToken = coolifyApiToken
      ? encrypt(coolifyApiToken)
      : null;

    // ── Create project with default milestones in a transaction ─
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        slug,
        vibeDescription: vibeDescription.trim(),
        githubRepo: githubRepo.trim(),
        githubDefaultBranch: githubDefaultBranch?.trim() || "main",
        coolifyAppUuid: coolifyAppUuid?.trim() || null,
        coolifyServerUrl: coolifyServerUrl?.trim() || null,
        githubToken: encryptedGithubToken,
        anthropicApiKey: encryptedAnthropicKey,
        coolifyApiToken: encryptedCoolifyToken,
        milestones: {
          create: DEFAULT_MILESTONES.map((m) => ({
            title: m.title,
            description: m.description,
            phase: m.phase,
            order: m.order,
          })),
        },
      },
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Strip encrypted tokens from the response
    const responseProject = {
      ...project,
      anthropicApiKey: project.anthropicApiKey ? "••••••••" : null,
      coolifyApiToken: project.coolifyApiToken ? "••••••••" : null,
      githubToken: project.githubToken ? "••••••••" : null,
    };

    return NextResponse.json(responseProject, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects] Error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
