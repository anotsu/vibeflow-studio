// ============================================================
// VibeFlow Studio — API Route: /api/projects/overview
// Multi-tenancy & fleet overview of all projects & autonomous daemons
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAutonomousDaemonTick } from "@/lib/daemon";
import { listActiveWorktrees, cleanupProjectWorktrees } from "@/lib/git-worktree-manager";
import { listProjectPreviews, stopProjectPreviews } from "@/lib/preview-orchestrator";

export const dynamic = "force-dynamic";

export interface ProjectOverviewItem {
  id: string;
  name: string;
  slug: string;
  vibeDescription: string;
  githubRepo: string;
  githubDefaultBranch: string;
  mode: "AUTO" | "ASSISTED";
  daemon: {
    mode: "AUTO" | "ASSISTED";
    state: "RUNNING_TASK" | "IDLE_WATCHING" | "STANDBY";
    stateLabel: string;
    activeTask: {
      id: string;
      title: string;
      status: string;
      priority: string;
      updatedAt: string;
    } | null;
    lastTickAt: string | null;
  };
  taskStats: {
    total: number;
    backlog: number;
    inProgress: number;
    completed: number;
    failed: number;
    completionRate: number;
  };
  milestoneStats: {
    total: number;
    completed: number;
    progressPct: number;
  };
  latestDeployment: {
    id: string;
    status: string;
    environment: string;
    previewUrl: string | null;
    createdAt: string;
  } | null;
  isolation: {
    activeWorktrees: number;
    activePreviews: number;
  };
  updatedAt: string;
}

export interface FleetStats {
  totalProjects: number;
  autoDaemonsCount: number;
  assistedCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  liveDeploymentsCount: number;
  totalIsolatedWorktrees: number;
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            updatedAt: true,
          },
        },
        milestones: {
          select: {
            id: true,
            status: true,
            progress: true,
          },
        },
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            environment: true,
            previewUrl: true,
            createdAt: true,
          },
        },
      },
    });

    const activeWorktrees = await listActiveWorktrees();
    const activePreviews = listProjectPreviews();

    const items: ProjectOverviewItem[] = projects.map((p) => {
      const tasks = p.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
      const failedTasks = tasks.filter((t) => t.status === "FAILED").length;
      const backlogTasks = tasks.filter((t) => t.status === "BACKLOG").length;

      const inProgressTask = tasks.find((t) =>
        [
          "CLAUDE_IN_PROGRESS",
          "ANTIGRAVITY_IN_PROGRESS",
          "IN_DEBATE",
          "SYNTHESIS",
          "TESTING",
        ].includes(t.status)
      );

      const inProgressCount = tasks.filter((t) =>
        [
          "CLAUDE_IN_PROGRESS",
          "ANTIGRAVITY_IN_PROGRESS",
          "IN_DEBATE",
          "SYNTHESIS",
          "TESTING",
        ].includes(t.status)
      ).length;

      const completionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Milestones
      const milestones = p.milestones || [];
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter((m) => m.status === "COMPLETED").length;
      const progressPct =
        totalMilestones > 0
          ? Math.round(
              (milestones.reduce((acc, m) => acc + (m.progress || 0), 0) /
                totalMilestones) *
                100
            )
          : 0;

      // Isolation
      const projectWorktrees = activeWorktrees.filter((w) => w.projectId === p.id);
      const projectPreviews = activePreviews.filter((pv) => pv.projectId === p.id);

      // Daemon status
      let daemonState: "RUNNING_TASK" | "IDLE_WATCHING" | "STANDBY" = "STANDBY";
      let daemonLabel = "Mode manuel accompagné";

      if (p.mode === "AUTO") {
        if (inProgressTask) {
          daemonState = "RUNNING_TASK";
          daemonLabel = "Tâche en cours d'arbitrage";
        } else {
          daemonState = "IDLE_WATCHING";
          daemonLabel = "Veille active 24/7";
        }
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        vibeDescription: p.vibeDescription,
        githubRepo: p.githubRepo,
        githubDefaultBranch: p.githubDefaultBranch,
        mode: p.mode,
        daemon: {
          mode: p.mode,
          state: daemonState,
          stateLabel: daemonLabel,
          activeTask: inProgressTask
            ? {
                id: inProgressTask.id,
                title: inProgressTask.title,
                status: inProgressTask.status,
                priority: inProgressTask.priority,
                updatedAt: inProgressTask.updatedAt.toISOString(),
              }
            : null,
          lastTickAt: inProgressTask ? inProgressTask.updatedAt.toISOString() : null,
        },
        taskStats: {
          total: totalTasks,
          backlog: backlogTasks,
          inProgress: inProgressCount,
          completed: completedTasks,
          failed: failedTasks,
          completionRate,
        },
        milestoneStats: {
          total: totalMilestones,
          completed: completedMilestones,
          progressPct,
        },
        latestDeployment: p.deployments[0]
          ? {
              id: p.deployments[0].id,
              status: p.deployments[0].status,
              environment: p.deployments[0].environment,
              previewUrl: p.deployments[0].previewUrl,
              createdAt: p.deployments[0].createdAt.toISOString(),
            }
          : null,
        isolation: {
          activeWorktrees: projectWorktrees.length,
          activePreviews: projectPreviews.length,
        },
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    const fleetStats: FleetStats = {
      totalProjects: items.length,
      autoDaemonsCount: items.filter((p) => p.mode === "AUTO").length,
      assistedCount: items.filter((p) => p.mode === "ASSISTED").length,
      activeTasksCount: items.reduce((acc, p) => acc + p.taskStats.inProgress, 0),
      completedTasksCount: items.reduce((acc, p) => acc + p.taskStats.completed, 0),
      liveDeploymentsCount: items.filter(
        (p) => p.latestDeployment?.status === "RUNNING"
      ).length,
      totalIsolatedWorktrees: activeWorktrees.length,
    };

    return NextResponse.json({
      success: true,
      fleetStats,
      projects: items,
    });
  } catch (error: any) {
    console.error("[GET /api/projects/overview] Error:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer la vue multi-projets", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, mode } = body || {};

    if (action === "toggle_mode" && projectId) {
      const targetMode = mode === "AUTO" ? "AUTO" : "ASSISTED";
      const updated = await prisma.project.update({
        where: { id: projectId },
        data: { mode: targetMode },
      });

      let tickResult = null;
      if (targetMode === "AUTO") {
        tickResult = await runAutonomousDaemonTick(projectId);
      }

      return NextResponse.json({
        success: true,
        project: updated,
        tickResult,
        message: `Projet "${updated.name}" basculé en mode ${targetMode}`,
      });
    }

    if (action === "trigger_daemon") {
      const result = await runAutonomousDaemonTick(projectId || undefined);
      return NextResponse.json({
        success: true,
        result,
        message: `Cycle autonome exécuté pour ${result.projectsChecked} projet(s)`,
      });
    }

    if (action === "clean_worktrees" && projectId) {
      const cleanedWorktrees = await cleanupProjectWorktrees(projectId);
      const stoppedPreviews = stopProjectPreviews(projectId);

      return NextResponse.json({
        success: true,
        cleanedWorktrees,
        stoppedPreviews,
        message: `Environnement isolé nettoyé : ${cleanedWorktrees} worktrees et ${stoppedPreviews} previews purgés`,
      });
    }

    return NextResponse.json(
      { error: "Action non reconnue", details: { action, projectId } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[POST /api/projects/overview] Error:", error);
    return NextResponse.json(
      { error: "Action multi-projets échouée", details: error?.message },
      { status: 500 }
    );
  }
}
