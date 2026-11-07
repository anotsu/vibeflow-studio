// ============================================================
// VibeFlow Studio — API Route: /api/stats/credits
// GET: Returns remaining credits for Claude & Gemini + Overage status
// POST: Toggles overage authorization and updates spending limits
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getCreditStatus,
  updateOverageSettings,
  getOverageSettings,
} from "@/lib/credit-service";

export async function GET() {
  try {
    const status = await getCreditStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    console.error("[Credits API] Error fetching credit status:", err);
    return NextResponse.json(
      { error: err.message || "Erreur de récupération des crédits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, overageAllowed, overageLimitEur } = body;

    if (action === "toggle_overage") {
      const current = await getOverageSettings();
      const updated = await updateOverageSettings({
        overageAllowed:
          typeof overageAllowed === "boolean"
            ? overageAllowed
            : !current.overageAllowed,
      });

      return NextResponse.json({
        success: true,
        message: updated.overageAllowed
          ? "Overage ACTIVÉ : Les crédits payants seront utilisés en cas de dépassement."
          : "Overage DÉSACTIVÉ : Protection 0€ active (aucun frais imprévu).",
        settings: updated,
      });
    }

    if (action === "update_settings") {
      const updated = await updateOverageSettings({
        ...(typeof overageAllowed === "boolean" ? { overageAllowed } : {}),
        ...(typeof overageLimitEur === "number" ? { overageLimitEur } : {}),
      });

      return NextResponse.json({
        success: true,
        message: "Paramètres de crédits et overage enregistrés.",
        settings: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[Credits API] Error updating overage:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erreur de mise à jour" },
      { status: 500 }
    );
  }
}
