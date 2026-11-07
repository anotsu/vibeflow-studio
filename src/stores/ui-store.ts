// ============================================================
// VibeFlow Studio — UI State Store (Zustand)
// ============================================================

import { create } from "zustand";
import type { WorkspaceTab, CliTab, UIState } from "@/types";

interface UIStore extends UIState {
  // Workspace tabs
  setActiveWorkspaceTab: (tab: WorkspaceTab) => void;

  // CLI panel
  cliPanelMaximized: boolean;
  setActiveCliTab: (tab: CliTab) => void;
  toggleCliPanel: () => void;
  setCliPanelOpen: (open: boolean) => void;
  setCliPanelPosition: (position: "bottom" | "right") => void;
  setCliPanelMaximized: (maximized: boolean) => void;
  toggleCliPanelMaximized: () => void;

  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Project selection
  setSelectedProjectId: (id: string | null) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
  autoDismissMs?: number;
}

let notifId = 0;

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  activeWorkspaceTab: "kanban",
  activeCliTab: "bash",
  sidebarOpen: true,
  cliPanelOpen: true,
  cliPanelPosition: "bottom",
  cliPanelMaximized: false,
  selectedProjectId: null,
  notifications: [],

  // Workspace
  setActiveWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),

  // CLI
  setActiveCliTab: (tab) => set({ activeCliTab: tab }),
  toggleCliPanel: () => set((s) => ({ cliPanelOpen: !s.cliPanelOpen })),
  setCliPanelOpen: (open) => set({ cliPanelOpen: open }),
  setCliPanelPosition: (position) => set({ cliPanelPosition: position }),
  setCliPanelMaximized: (maximized) => set({ cliPanelMaximized: maximized }),
  toggleCliPanelMaximized: () => set((s) => ({ cliPanelMaximized: !s.cliPanelMaximized })),

  // Sidebar
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Project
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  // Notifications
  addNotification: (notification) => {
    const id = `notif-${++notifId}`;
    const newNotif: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };
    set((s) => ({ notifications: [...s.notifications, newNotif] }));

    // Auto-dismiss
    if (notification.autoDismissMs) {
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
      }, notification.autoDismissMs);
    }
  },
  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
