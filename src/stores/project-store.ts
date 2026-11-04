// ============================================================
// VibeFlow Studio — Project Store (Zustand)
// ============================================================

import { create } from "zustand";
import type {
  ProjectWithRelations,
  CreateProjectInput,
  TaskWithRelations,
  CreateTaskInput,
} from "@/types";
import type { ToolboxItem, Deployment, Milestone, AgentDebateLog } from "@prisma/client";

// ─── State Interface ────────────────────────────────────────

interface ProjectState {
  // Data
  projects: ProjectWithRelations[];
  selectedProject: ProjectWithRelations | null;
  tasks: TaskWithRelations[];
  toolboxItems: ToolboxItem[];
  deployments: Deployment[];
  debateLogs: AgentDebateLog[];

  // Loading states
  loading: boolean;
  tasksLoading: boolean;
  toolboxLoading: boolean;

  // Actions — Projects
  fetchProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<ProjectWithRelations>;
  updateProject: (
    projectId: string,
    updates: Partial<CreateProjectInput & { mode: "ASSISTED" | "AUTO" }>
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  toggleMode: (projectId: string) => Promise<void>;

  // Actions — Tasks
  fetchTasks: (projectId: string, status?: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<TaskWithRelations>;
  updateTask: (
    taskId: string,
    updates: Partial<{ status: string; priority: string }>
  ) => Promise<void>;
  fetchTaskDebate: (taskId: string) => Promise<void>;

  // Actions — Toolbox
  fetchToolbox: (projectId: string) => Promise<void>;
  triggerToolboxScan: (projectId: string) => Promise<void>;

  // Actions — Deployments
  fetchDeployments: (projectId: string) => Promise<void>;
  triggerDeployment: (
    projectId: string,
    branch: string,
    environment?: string
  ) => Promise<void>;

  // Actions — Orchestration
  startOrchestration: (taskId: string, projectId: string) => Promise<void>;
}

// ─── Store Implementation ───────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  selectedProject: null,
  tasks: [],
  toolboxItems: [],
  deployments: [],
  debateLogs: [],
  loading: false,
  tasksLoading: false,
  toolboxLoading: false,

  // ── Projects ────────────────────────────────────────────

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      set({ projects: data, loading: false });
    } catch (error) {
      console.error("fetchProjects error:", error);
      set({ loading: false });
    }
  },

  selectProject: async (projectId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const project = await res.json();
      set({ selectedProject: project, loading: false });

      // Fetch related data in parallel
      const state = get();
      await Promise.all([
        state.fetchTasks(projectId),
        state.fetchToolbox(projectId),
        state.fetchDeployments(projectId),
      ]);
    } catch (error) {
      console.error("selectProject error:", error);
      set({ loading: false });
    }
  },

  createProject: async (input: CreateProjectInput) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create project");
    }
    const project = await res.json();
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  updateProject: async (projectId, updates) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update project");
    const updated = await res.json();
    set((state) => ({
      projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
      selectedProject:
        state.selectedProject?.id === projectId
          ? { ...state.selectedProject, ...updated }
          : state.selectedProject,
    }));
  },

  deleteProject: async (projectId) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete project");
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      selectedProject:
        state.selectedProject?.id === projectId
          ? null
          : state.selectedProject,
    }));
  },

  toggleMode: async (projectId) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const newMode = project.mode === "ASSISTED" ? "AUTO" : "ASSISTED";
    await state.updateProject(projectId, { mode: newMode });
  },

  // ── Tasks ───────────────────────────────────────────────

  fetchTasks: async (projectId, status) => {
    set({ tasksLoading: true });
    try {
      const params = new URLSearchParams({ projectId });
      if (status) params.set("status", status);
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      set({ tasks: data, tasksLoading: false });
    } catch (error) {
      console.error("fetchTasks error:", error);
      set({ tasksLoading: false });
    }
  },

  createTask: async (input) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create task");
    const task = await res.json();
    set((state) => ({ tasks: [task, ...state.tasks] }));
    return task;
  },

  updateTask: async (taskId, updates) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update task");
    const updated = await res.json();
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
    }));
  },

  fetchTaskDebate: async (taskId) => {
    try {
      const res = await fetch(`/api/agents/debate/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch debate");
      const data = await res.json();
      set({ debateLogs: data });
    } catch (error) {
      console.error("fetchTaskDebate error:", error);
    }
  },

  // ── Toolbox ─────────────────────────────────────────────

  fetchToolbox: async (projectId) => {
    set({ toolboxLoading: true });
    try {
      const res = await fetch(`/api/toolbox?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch toolbox");
      const data = await res.json();
      set({ toolboxItems: data, toolboxLoading: false });
    } catch (error) {
      console.error("fetchToolbox error:", error);
      set({ toolboxLoading: false });
    }
  },

  triggerToolboxScan: async (projectId) => {
    try {
      const res = await fetch("/api/toolbox/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to trigger scan");
    } catch (error) {
      console.error("triggerToolboxScan error:", error);
    }
  },

  // ── Deployments ─────────────────────────────────────────

  fetchDeployments: async (projectId) => {
    try {
      const res = await fetch(`/api/deployments?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch deployments");
      const data = await res.json();
      set({ deployments: data });
    } catch (error) {
      console.error("fetchDeployments error:", error);
    }
  },

  triggerDeployment: async (projectId, branch, environment = "PREVIEW") => {
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, branch, environment }),
      });
      if (!res.ok) throw new Error("Failed to trigger deployment");
      const deployment = await res.json();
      set((state) => ({
        deployments: [deployment, ...state.deployments],
      }));
    } catch (error) {
      console.error("triggerDeployment error:", error);
    }
  },

  // ── Orchestration ───────────────────────────────────────

  startOrchestration: async (taskId, projectId) => {
    try {
      const res = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, projectId }),
      });
      if (!res.ok) throw new Error("Failed to start orchestration");

      // Update task status locally
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: "CLAUDE_IN_PROGRESS" as const }
            : t
        ),
      }));
    } catch (error) {
      console.error("startOrchestration error:", error);
    }
  },
}));
