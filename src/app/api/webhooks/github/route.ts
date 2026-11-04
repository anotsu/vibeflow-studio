// ============================================================
// API Route: /api/webhooks/github
// Handle GitHub webhook events (push, pull_request)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Verify GitHub webhook signature using HMAC-SHA256.
 * Returns true if the signature is valid, false otherwise.
 */
function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Check if a branch name matches a tracked agent or synthesis pattern.
 * Patterns: agent/claude-*, agent/antigravity-*, synthesis/*
 */
function isTrackedBranch(branchRef: string): boolean {
  const branch = branchRef.replace("refs/heads/", "");
  return (
    branch.startsWith("agent/claude-") ||
    branch.startsWith("agent/antigravity-") ||
    branch.startsWith("synthesis/")
  );
}

/**
 * Extract the clean branch name from a ref string.
 */
function extractBranch(ref: string): string {
  return ref.replace("refs/heads/", "");
}

/**
 * POST /api/webhooks/github
 * Handle GitHub webhook events.
 * - Verifies webhook signature
 * - Handles `push` events: updates task status for tracked branches
 * - Handles `pull_request` events: marks tasks COMPLETED when synthesis PRs are merged
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");

    // ── Verify webhook signature ──────────────────────────────
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(
        "[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not configured"
      );
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    if (!verifyGitHubSignature(rawBody, signature, webhookSecret)) {
      console.warn(
        `[GitHub Webhook] Invalid signature for delivery ${deliveryId}`
      );
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    // ── Handle ping event (webhook setup verification) ────────
    if (event === "ping") {
      return NextResponse.json({
        received: true,
        event: "ping",
        zen: payload.zen,
      });
    }

    // ── Handle push event ─────────────────────────────────────
    if (event === "push") {
      return handlePushEvent(payload);
    }

    // ── Handle pull_request event ─────────────────────────────
    if (event === "pull_request") {
      return handlePullRequestEvent(payload);
    }

    // Unhandled event type — acknowledge but don't process
    return NextResponse.json({
      received: true,
      event,
      processed: false,
      message: `Event type '${event}' is not handled`,
    });
  } catch (error) {
    console.error("[POST /api/webhooks/github] Error:", error);
    return NextResponse.json(
      { received: true, processed: false, error: "Internal processing error" },
      { status: 200 }
    );
  }
}

/**
 * Handle GitHub push events.
 * If the push is to a tracked branch (agent/* or synthesis/*),
 * update the related task status accordingly.
 */
async function handlePushEvent(
  payload: Record<string, unknown>
): Promise<NextResponse> {
  const ref = payload.ref as string;
  const repoFullName = (payload.repository as Record<string, unknown>)
    ?.full_name as string;

  if (!ref || !isTrackedBranch(ref)) {
    return NextResponse.json({
      received: true,
      event: "push",
      processed: false,
      message: "Not a tracked branch",
    });
  }

  const branch = extractBranch(ref);

  // Find the task associated with this branch
  let task = null;

  if (branch.startsWith("agent/claude-")) {
    task = await prisma.task.findFirst({
      where: { claudeBranch: branch },
      select: { id: true, status: true, projectId: true },
    });

    // Update status to CLAUDE_IN_PROGRESS if still in BACKLOG
    if (task && task.status === "BACKLOG") {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "CLAUDE_IN_PROGRESS",
          startedAt: new Date(),
        },
      });
    }
  } else if (branch.startsWith("agent/antigravity-")) {
    task = await prisma.task.findFirst({
      where: { antigravityBranch: branch },
      select: { id: true, status: true, projectId: true },
    });

    // Update status to ANTIGRAVITY_IN_PROGRESS if still in BACKLOG
    if (task && task.status === "BACKLOG") {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "ANTIGRAVITY_IN_PROGRESS",
          startedAt: new Date(),
        },
      });
    }
  } else if (branch.startsWith("synthesis/")) {
    task = await prisma.task.findFirst({
      where: { synthesisBranch: branch },
      select: { id: true, status: true, projectId: true },
    });

    // A push to synthesis branch means synthesis is in progress
    if (task && task.status !== "COMPLETED" && task.status !== "FAILED") {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "SYNTHESIS" },
      });
    }
  }

  return NextResponse.json({
    received: true,
    event: "push",
    processed: true,
    branch,
    repo: repoFullName,
    taskId: task?.id || null,
  });
}

/**
 * Handle GitHub pull_request events.
 * If a PR is merged for a synthesis branch, mark the task as COMPLETED.
 */
async function handlePullRequestEvent(
  payload: Record<string, unknown>
): Promise<NextResponse> {
  const action = payload.action as string;
  const pr = payload.pull_request as Record<string, unknown>;

  if (!pr) {
    return NextResponse.json({
      received: true,
      event: "pull_request",
      processed: false,
      message: "No pull_request data in payload",
    });
  }

  const merged = pr.merged as boolean;
  const headRef = (pr.head as Record<string, unknown>)?.ref as string;
  const prNumber = pr.number as number;

  // Only process when a PR is closed + merged
  if (action !== "closed" || !merged) {
    return NextResponse.json({
      received: true,
      event: "pull_request",
      processed: false,
      message: `PR action '${action}' with merged=${merged} — not handled`,
    });
  }

  // Check if this is a synthesis branch PR
  if (headRef && headRef.startsWith("synthesis/")) {
    const task = await prisma.task.findFirst({
      where: { synthesisBranch: headRef },
      select: { id: true, status: true },
    });

    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          synthesisPrNumber: prNumber,
        },
      });

      return NextResponse.json({
        received: true,
        event: "pull_request",
        processed: true,
        action: "task_completed",
        taskId: task.id,
        prNumber,
        branch: headRef,
      });
    }
  }

  // Check if this is a Claude agent branch PR
  if (headRef && headRef.startsWith("agent/claude-")) {
    const task = await prisma.task.findFirst({
      where: { claudeBranch: headRef },
      select: { id: true },
    });

    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: { claudePrNumber: prNumber },
      });
    }
  }

  // Check if this is an Antigravity agent branch PR
  if (headRef && headRef.startsWith("agent/antigravity-")) {
    const task = await prisma.task.findFirst({
      where: { antigravityBranch: headRef },
      select: { id: true },
    });

    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: { antigravityPrNumber: prNumber },
      });
    }
  }

  return NextResponse.json({
    received: true,
    event: "pull_request",
    processed: true,
    branch: headRef,
    prNumber,
  });
}
