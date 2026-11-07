// ============================================================
// VibeFlow Studio — Kanban Board
// ============================================================
"use client";

import React, { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Clock,
  Zap,
  GitBranch,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Bot,
  Rocket,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUIStore } from "@/stores/ui-store";
import type { TaskWithRelations } from "@/types";
import type { TaskStatus, TaskPriority } from "@prisma/client";

interface KanbanColumn {
  id: string;
  title: string;
  statuses: TaskStatus[];
  color: string;
  icon: React.ReactNode;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    statuses: ["BACKLOG"],
    color: "border-muted-foreground/30",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  {
    id: "in-progress",
    title: "En cours (2 branches)",
    statuses: ["CLAUDE_IN_PROGRESS", "ANTIGRAVITY_IN_PROGRESS"],
    color: "border-primary/50",
    icon: <GitBranch className="w-3.5 h-3.5" />,
  },
  {
    id: "debate",
    title: "En débat",
    statuses: ["IN_DEBATE", "SYNTHESIS"],
    color: "border-yellow-400/50",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  {
    id: "testing",
    title: "Tests",
    statuses: ["TESTING"],
    color: "border-blue-400/50",
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    id: "completed",
    title: "Terminé",
    statuses: ["COMPLETED"],
    color: "border-green-400/50",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-muted-foreground/20 text-muted-foreground",
  MEDIUM: "bg-blue-500/20 text-blue-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  CRITICAL: "bg-red-500/20 text-red-400",
};

const ORIGIN_ICONS: Record<string, React.ReactNode> = {
  USER: null,
  AI_GENERATED: <Sparkles className="w-3 h-3 text-primary" />,
  AUTO_OPTIMIZATION: <Zap className="w-3 h-3 text-yellow-400" />,
};

export function KanbanBoard() {
  const { tasks, selectedProject, startOrchestration } = useProjectStore();
  const { addNotification } = useUIStore();
  const [syncingObsidian, setSyncingObsidian] = useState(false);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const getTasksForColumn = (column: KanbanColumn): TaskWithRelations[] => {
    return safeTasks.filter((t) =>
      t && column.statuses.includes(t.status as TaskStatus)
    );
  };

  const handleStartDuel = async (task: TaskWithRelations) => {
    if (!selectedProject) return;
    await startOrchestration(task.id, selectedProject.id);
  };

  const handleSyncObsidian = async () => {
    setSyncingObsidian(true);
    try {
      const res = await fetch("/api/obsidian/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject?.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification({
          type: "success",
          title: "Synchronisation Obsidian Réussie",
          message: data.message || "Coffre et API Obsidian mis à jour.",
          autoDismissMs: 3500,
        });
      } else {
        throw new Error(data.error || "Échec synchronisation");
      }
    } catch (err: any) {
      addNotification({
        type: "error",
        title: "Erreur Sync Obsidian",
        message: err.message,
        autoDismissMs: 4000,
      });
    } finally {
      setSyncingObsidian(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/40 border-b border-border text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Flux Kanban 5 Phases</span>
          <span className="text-muted-foreground">· {safeTasks.length} tâche(s) au total</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncObsidian}
            disabled={syncingObsidian}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            title="Synchroniser le Kanban avec le coffre Obsidian (03_Kanban_Tasks)"
          >
            {syncingObsidian ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>Sync Obsidian</span>
          </button>
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
      {COLUMNS.map((column) => {
        const columnTasks = getTasksForColumn(column);
        return (
          <div
            key={column.id}
            className={`flex flex-col min-w-[280px] max-w-[320px] bg-card/50 rounded-lg border-t-2 ${column.color}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                {column.icon}
                <span>{column.title}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStartDuel={() => handleStartDuel(task)}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground/50">
                  Aucune tâche
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ─── Task Card Component ────────────────────────────────────

function TaskCard({
  task,
  onStartDuel,
}: {
  task: TaskWithRelations;
  onStartDuel: () => void;
}) {
  const hasDebate =
    task.debateLogs && task.debateLogs.length > 0;
  const isInProgress =
    task.status === "CLAUDE_IN_PROGRESS" ||
    task.status === "ANTIGRAVITY_IN_PROGRESS";

  return (
    <div className="kanban-card bg-card border border-border rounded-lg p-3 cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {ORIGIN_ICONS[task.origin]}
          <h4 className="text-sm font-medium truncate">{task.title}</h4>
        </div>
        <button className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {task.description}
      </p>

      {/* Branch Status */}
      {(task.claudeBranch || task.antigravityBranch) && (
        <div className="mt-2 space-y-1">
          {task.claudeBranch && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Bot className="w-3 h-3 text-claude" />
              <span className="text-claude font-mono truncate">
                {task.claudeBranch}
              </span>
            </div>
          )}
          {task.antigravityBranch && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Rocket className="w-3 h-3 text-antigravity" />
              <span className="text-antigravity font-mono truncate">
                {task.antigravityBranch}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {/* Priority badge */}
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority as TaskPriority]}`}
          >
            {task.priority}
          </span>

          {/* Debate count */}
          {hasDebate && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {task.debateLogs.length}
            </span>
          )}
        </div>

        {/* Action button */}
        {task.status === "BACKLOG" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartDuel();
            }}
            className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowRight className="w-3 h-3" />
            Lancer le duel
          </button>
        )}

        {isInProgress && (
          <div className="flex items-center gap-1 text-[10px] text-primary">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            En cours...
          </div>
        )}
      </div>
    </div>
  );
}
