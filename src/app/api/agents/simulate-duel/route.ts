// ============================================================
// VibeFlow Studio — Live Dual-Branch Duel Simulation API
// Step-by-step cross-pollination generator with SSE streaming
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastVibeEvent } from "@/lib/event-bus";

export async function POST(request: NextRequest) {
  try {
    const { taskId, projectId } = await request.json();

    if (!taskId || !projectId) {
      return NextResponse.json({ error: "taskId and projectId are required" }, { status: 400 });
    }

    // Load or create demo task
    let task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { debateLogs: true },
    });

    if (!task) {
      task = await prisma.task.create({
        data: {
          id: taskId,
          projectId,
          title: "Optimisation Architecture State & UI Transitions",
          description: "Mise en place d'un store réactif avec gestion optimiste des erreurs et micro-animations.",
          status: "BACKLOG",
          priority: "HIGH",
          origin: "AI_GENERATED",
        },
        include: { debateLogs: true },
      });
    }

    // 1. Branching Phase
    const claudeBranch = `agent/claude-${taskId.slice(-6)}`;
    const antigravityBranch = `agent/antigravity-${taskId.slice(-6)}`;
    const synthesisBranch = `synthesis/${taskId.slice(-6)}`;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "CLAUDE_IN_PROGRESS",
        claudeBranch,
        antigravityBranch,
        synthesisBranch,
        startedAt: new Date(),
      },
    });

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "CLAUDE_IMPLEMENTING", taskTitle: task.title },
      task.id
    );

    // 2. Claude Implementation
    const claudeCode = `// [Claude Code Solution - Architecture & Robustesse]
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface CheckoutEngineState {
  cartChecksum: string;
  isProcessing: boolean;
  rollbackState: Record<string, unknown> | null;
  verifyIntegrity: () => Promise<boolean>;
  commitTransaction: (payload: unknown) => Promise<void>;
}

export const useCheckoutEngine = create<CheckoutEngineState>()(
  devtools(
    persist(
      (set, get) => ({
        cartChecksum: '',
        isProcessing: false,
        rollbackState: null,
        verifyIntegrity: async () => {
          // Strict SHA-256 state hashing before network submission
          return true;
        },
        commitTransaction: async (payload) => {
          set({ isProcessing: true });
          // Atomic operation
          set({ isProcessing: false });
        }
      }),
      { name: 'checkout-engine-v2' }
    )
  )
);`;

    const antigravityCode = `// [Antigravity Solution - Fluidité UI/UX & Micro-interactions]
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface CheckoutUIState {
  itemCount: number;
  hapticFeedbackEnabled: boolean;
  activeAnimation: 'idle' | 'pulse' | 'success';
  triggerQuickBuy: (item: { id: string; price: number }) => void;
}

export const useCheckoutUI = create<CheckoutUIState>()(
  subscribeWithSelector(
    immer((set) => ({
      itemCount: 0,
      hapticFeedbackEnabled: true,
      activeAnimation: 'idle',
      triggerQuickBuy: (item) => {
        set((s) => {
          s.itemCount += 1;
          s.activeAnimation = 'pulse';
        });
        // 60FPS UI spring transition trigger
        setTimeout(() => set((s) => { s.activeAnimation = 'idle'; }), 300);
      }
    }))
  )
);`;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        claudeImplementation: claudeCode,
        antigravityImplementation: antigravityCode,
        status: "IN_DEBATE",
      },
    });

    // 3. Log Cross-Reviews
    const log1 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "CLAUDE",
        phase: "review",
        round: 1,
        qualityScore: 8.5,
        message: `Examen de la branche Antigravity : L'usage d'Immer et le déclenchement de micro-interactions spring à 60 FPS procurent une sensation de fluidité immédiate remarquable.
Cependant, l'absence de vérification d'intégrité avant le commit serveur risque de provoquer des désynchronisations en cas de latence réseau.`,
        filePath: "src/stores/checkout-ui.ts",
        lineStart: 12,
        lineEnd: 35,
      },
    });

    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log1 }, task.id);

    const log2 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "ANTIGRAVITY",
        phase: "review",
        round: 1,
        qualityScore: 8.9,
        message: `Examen de la branche Claude : L'architecture transactionnelle avec hachage SHA-256 et middleware persistant est un chef-d'œuvre de robustesse défensive.
Toutefois, verrouiller l'interface sans retour tactile ou visuel immédiat dégrade le plaisir utilisateur. Intégrons votre checksum dans un dispatch non-bloquant.`,
        filePath: "src/stores/checkout-engine.ts",
        lineStart: 18,
        lineEnd: 42,
      },
    });

    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log2 }, task.id);

    // 4. Synthesis Consensus
    const synthesisText = `Décision de Synthèse Finale (Consensus Claude × Antigravity) :
1. Intégrité Transactionnelle (Apport Claude) : Checksum d'état et vérification asynchrone côté serveur.
2. Expérience Utilisateur Ultime (Apport Antigravity) : Dispatch optimiste réactif avec Immer et feedback haptique/visuel en <16ms.
3. Branche de Synthèse : 'synthesis/${taskId.slice(-6)}' validée avec succès. Pull Request prête pour fusion.`;

    const log3 = await prisma.agentDebateLog.create({
      data: {
        taskId: task.id,
        speaker: "SYSTEM",
        phase: "synthesis",
        round: 2,
        qualityScore: 9.6,
        message: synthesisText,
      },
    });

    broadcastVibeEvent("DEBATE_MESSAGE", projectId, { log: log3 }, task.id);

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "SYNTHESIS",
        synthesisDecision: synthesisText,
        completedAt: new Date(),
      },
    });

    broadcastVibeEvent(
      "PHASE_CHANGED",
      projectId,
      { phase: "SYNTHESIS", status: "READY_FOR_MERGE" },
      task.id
    );

    return NextResponse.json({
      success: true,
      taskId: task.id,
      claudeBranch,
      antigravityBranch,
      synthesisBranch,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de simulation" },
      { status: 500 }
    );
  }
}
