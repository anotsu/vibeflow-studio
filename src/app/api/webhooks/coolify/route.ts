// ============================================================
// API Route: /api/webhooks/coolify
// Handle Coolify webhook callbacks
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerSelfHealing } from "@/lib/self-healing";

/** Map Coolify status strings to our DeploymentStatus enum */
function mapCoolifyStatus(
  coolifyStatus: string
): "QUEUED" | "BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "CANCELLED" {
  const statusMap: Record<string, "QUEUED" | "BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "CANCELLED"> = {
    queued: "QUEUED",
    building: "BUILDING",
    deploying: "BUILDING",
    running: "RUNNING",
    healthy: "RUNNING",
    stopped: "STOPPED",
    exited: "STOPPED",
    failed: "FAILED",
    error: "FAILED",
    cancelled: "CANCELLED",
  };

  return statusMap[coolifyStatus.toLowerCase()] || "FAILED";
}

/**
 * POST /api/webhooks/coolify
 * Handle Coolify webhook callbacks.
 * - Parses the payload for deployment UUID, status, and logs
 * - Updates the corresponding Deployment record in the DB
 * - If status is FAILED and healingAttempts < maxHealingAttempts,
 *   enqueues a self-healing agent execution job
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // ── Extract fields from Coolify webhook payload ───────────
    // Coolify sends various payload shapes; handle flexibly
    const deploymentUuid: string | undefined =
      payload.uuid ||
      payload.deployment_uuid ||
      payload.data?.uuid ||
      payload.data?.deployment_uuid;

    const coolifyStatus: string | undefined =
      payload.status ||
      payload.data?.status ||
      payload.action;

    const logs: string | undefined =
      payload.logs ||
      payload.data?.logs ||
      payload.message;

    if (!deploymentUuid) {
      console.warn(
        "[Coolify Webhook] Received payload without deployment UUID:",
        JSON.stringify(payload).slice(0, 500)
      );
      // Return 200 to acknowledge receipt even if we can't process it
      return NextResponse.json({ received: true, processed: false });
    }

    // ── Find the matching deployment record ───────────────────
    const deployment = await prisma.deployment.findFirst({
      where: { coolifyDeploymentUuid: deploymentUuid },
      include: {
        project: {
          select: { id: true, githubRepo: true },
        },
      },
    });

    if (!deployment) {
      console.warn(
        `[Coolify Webhook] No deployment found for UUID: ${deploymentUuid}`
      );
      return NextResponse.json({ received: true, processed: false });
    }

    // ── Map and update the deployment status ──────────────────
    const mappedStatus = coolifyStatus
      ? mapCoolifyStatus(coolifyStatus)
      : deployment.status;

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
    };

    // Append logs if present
    if (logs) {
      updateData.logs = deployment.logs
        ? `${deployment.logs}\n---\n${logs}`
        : logs;
    }

    // Set timestamps based on status
    if (mappedStatus === "BUILDING" && !deployment.startedAt) {
      updateData.startedAt = new Date();
    }
    if (
      mappedStatus === "RUNNING" ||
      mappedStatus === "FAILED" ||
      mappedStatus === "STOPPED"
    ) {
      updateData.finishedAt = new Date();
    }

    // Store error message if failed
    if (mappedStatus === "FAILED") {
      updateData.errorMessage =
        logs || payload.error || payload.data?.error || "Deployment failed";
    }

    // Extract preview URL if provided
    if (payload.preview_url || payload.data?.preview_url || payload.fqdn) {
      updateData.previewUrl =
        payload.preview_url || payload.data?.preview_url || payload.fqdn;
    }

    const updatedDeployment = await prisma.deployment.update({
      where: { id: deployment.id },
      data: updateData,
    });

    // ── Self-healing: trigger automated diagnosis & fix loop ───────────────
    let selfHealingResult = null;
    if (
      mappedStatus === "FAILED" &&
      updatedDeployment.healingAttempts < updatedDeployment.maxHealingAttempts
    ) {
      try {
        selfHealingResult = await triggerSelfHealing(deployment.id);
        console.log(
          `[Coolify Webhook] Self-healing successfully executed for deployment ${deployment.id}`
        );
      } catch (err: any) {
        console.error(`[Coolify Webhook] Self-healing trigger failed:`, err);
      }
    }

    return NextResponse.json({
      received: true,
      processed: true,
      deploymentId: deployment.id,
      status: mappedStatus,
      selfHealing: selfHealingResult,
    });
  } catch (error) {
    console.error("[POST /api/webhooks/coolify] Error:", error);
    // Always return 200 on webhooks to prevent retries for processing errors
    return NextResponse.json(
      { received: true, processed: false, error: "Internal processing error" },
      { status: 200 }
    );
  }
}
