// ============================================================
// VibeFlow Studio — 24/7 Autonomous Daemon Engine
// Monitors projects in AUTO mode, detects debt, generates tasks,
// and orchestrates continuous improvement cycles without human input
// ============================================================

import { prisma } from "@/lib/prisma";
import { enqueueTaskOrchestration } from "@/lib/queue";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { callAI } from "@/lib/ai-provider";

export interface DaemonTickResult {
  projectsChecked: number;
  tasksTriggered: string[];
  tasksGenerated: string[];
  timestamp: string;
}

/**
 * Main heartbeat tick for the 24/7 autonomous daemon.
 * Can be triggered periodically via interval, cron, or Coolify webhook.
 */
export async function runAutonomousDaemonTick(
  targetProjectId?: string
): Promise<DaemonTickResult> {
  const whereClause = targetProjectId
    ? { id: targetProjectId }
    : { mode: "AUTO" as const };

  const autoProjects = await prisma.project.findMany({
    where: whereClause,
    include: {
      tasks: {
        orderBy: { createdAt: "asc" },
      },
      milestones: {
        orderBy: { order: "asc" },
      },
      toolboxItems: true,
    },
  });

  const triggeredTaskIds: string[] = [];
  const generatedTaskIds: string[] = [];

  for (const project of autoProjects) {
    // 1. Check if a task is already in progress for this project
    const activeTask = project.tasks.find((t) =>
      [
        "CLAUDE_IN_PROGRESS",
        "ANTIGRAVITY_IN_PROGRESS",
        "IN_DEBATE",
        "SYNTHESIS",
      ].includes(t.status)
    );

    if (activeTask) {
      console.log(
        `[Daemon 24/7] Project "${project.name}" has task "${activeTask.title}" currently active (${activeTask.status}). Skipping new task launch.`
      );
      continue;
    }

    // 2. Look for existing backlog tasks
    const backlogTask = project.tasks.find((t) => t.status === "BACKLOG");

    if (backlogTask) {
      console.log(
        `[Daemon 24/7] Project "${project.name}" picking pending backlog task: "${backlogTask.title}" (${backlogTask.id})`
      );

      await enqueueTaskOrchestration({
        taskId: backlogTask.id,
        projectId: project.id,
        action: "start_dual_branch",
      });

      triggeredTaskIds.push(backlogTask.id);

      broadcastVibeEvent(
        "AUTO_MODE_TICK",
        project.id,
        {
          action: "task_started_from_backlog",
          taskId: backlogTask.id,
          taskTitle: backlogTask.title,
        },
        backlogTask.id
      );

      continue;
    }

    // 3. Backlog is empty: Generate an autonomous optimization task!
    console.log(
      `[Daemon 24/7] Backlog empty for "${project.name}". Generating autonomous code optimization task...`
    );

    const activeMilestone =
      project.milestones.find((m) => m.status === "IN_PROGRESS") ||
      project.milestones.find((m) => m.status === "PENDING") ||
      project.milestones[0];

    const promptContext = `
Projet : "${project.name}"
Description : "${project.vibeDescription}"
Jalon actif : "${activeMilestone?.title || "Architecture"}" (${activeMilestone?.phase || "MVP"})
Tâches déjà complétées : ${project.tasks.filter((t) => t.status === "COMPLETED").map((t) => t.title).join(", ") || "Aucune"}
Boîte à outils acquise : ${project.toolboxItems.filter((t) => t.status === "ACQUIRED").map((t) => t.name).join(", ") || "Standard"}

Vous êtes l'Architecte Logiciel Autonome de VibeFlow Studio.
Générez UNE SEULE tâche d'optimisation technique hautement prioritaire (ex: refactoring de performance, typage strict, ajout de tests de régression, résilience réseau, sécurité OWASP).
Répondez UNIQUEMENT sous forme de JSON valide :
{
  "title": "Titre concis et percutant de la tâche",
  "description": "Description technique précise des fichiers à modifier et des critères d'acceptation",
  "priority": "HIGH" | "MEDIUM" | "LOW"
}
`;

    try {
      const aiResponse = await callAI({
        systemPrompt: "Vous êtes un générateur de tâches d'ingénierie logicielle autonome.",
        userPrompt: promptContext,
        modelType: "synthesis",
      });

      let parsed: { title: string; description: string; priority?: string };
      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse.content);
      } catch {
        parsed = {
          title: "Optimisation de la résilience d'état et gestion des erreurs réseau",
          description: "Mise en place de retry exponentiel, validation Zod des réponses et feedbacks visuels non-bloquants.",
          priority: "HIGH",
        };
      }

      const newTask = await prisma.task.create({
        data: {
          projectId: project.id,
          milestoneId: activeMilestone?.id,
          title: parsed.title,
          description: parsed.description,
          priority: (parsed.priority as any) || "HIGH",
          origin: "AUTO_OPTIMIZATION",
          status: "BACKLOG",
        },
      });

      generatedTaskIds.push(newTask.id);

      console.log(
        `[Daemon 24/7] Created autonomous task: "${newTask.title}" (${newTask.id}). Starting dual-branch cycle...`
      );

      await enqueueTaskOrchestration({
        taskId: newTask.id,
        projectId: project.id,
        action: "start_dual_branch",
      });

      triggeredTaskIds.push(newTask.id);

      broadcastVibeEvent(
        "TASK_UPDATED",
        project.id,
        {
          task: newTask,
          origin: "AUTO_OPTIMIZATION",
        },
        newTask.id
      );

      broadcastVibeEvent(
        "AUTO_MODE_TICK",
        project.id,
        {
          action: "autonomous_task_generated_and_launched",
          taskId: newTask.id,
          taskTitle: newTask.title,
        },
        newTask.id
      );
    } catch (genError) {
      console.error("[Daemon 24/7] Failed to generate autonomous task:", genError);
    }
  }

  return {
    projectsChecked: autoProjects.length,
    tasksTriggered: triggeredTaskIds,
    tasksGenerated: generatedTaskIds,
    timestamp: new Date().toISOString(),
  };
}
