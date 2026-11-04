// ============================================================
// API Route: /api/projects/analyze-github
// Scan an existing GitHub repo & return AI synthesized project architecture
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { scanAndAnalyzeGitHubRepo } from "@/lib/github-project-scanner";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { githubRepo, token } = body;

    if (!githubRepo || typeof githubRepo !== "string" || githubRepo.trim().length === 0) {
      return NextResponse.json(
        { error: "Le paramètre githubRepo est requis (ex: 'owner/repo' ou URL)" },
        { status: 400 }
      );
    }

    const analysis = await scanAndAnalyzeGitHubRepo(githubRepo.trim(), token);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("[POST /api/projects/analyze-github] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'analyse du dépôt GitHub",
      },
      { status: 500 }
    );
  }
}
