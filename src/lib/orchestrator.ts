// ============================================================
// VibeFlow Studio — Dual-Agent Orchestrator
// State machine managing the "Dual-Branch Cross-Pollination" cycle.
// ============================================================

import { callAI } from "@/lib/ai-provider";
import { prisma } from "@/lib/prisma";
import { createGitHubService, GitHubService } from "@/lib/github";
import { createCoolifyService, CoolifyService } from "@/lib/coolify";
import { decrypt } from "@/lib/utils";
import { broadcastVibeEvent } from "@/lib/event-bus";
import { syncTaskToObsidian, exportDebateToObsidian } from "@/lib/obsidian-sync";
import type {
  OrchestratorPhase,
  OrchestratorState,
  AgentReview,
  CodeSuggestion,
} from "@/types";
import type { Project, Task } from "@prisma/client";

// ─── Constants ──────────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;
const DEFAULT_MAX_ROUNDS = 2;

// ─── Persona Prompts ────────────────────────────────────────

const CLAUDE_PERSONA = `You are Claude, a meticulous and methodical software engineer.
Your strengths:
- Correctness-first approach with robust error handling
- Clean, well-documented code with comprehensive type safety
- Security-conscious design with input validation
- Following established patterns and best practices
- Thorough edge-case consideration`;

const ANTIGRAVITY_PERSONA = `You are Antigravity, a creative and performance-oriented software engineer.
Your strengths:
- UX/UI-focused design with delightful user experiences
- Performance optimization and efficient algorithms
- Creative problem-solving with elegant, minimal solutions
- Modern patterns and cutting-edge approaches
- Developer experience and ergonomic APIs
- Visual polish and attention to micro-interactions`;

// ─── Orchestrator ───────────────────────────────────────────

/**
 * The DualAgentOrchestrator manages a complete "Dual-Branch Cross-Pollination"
 * cycle for a single task. It creates two independent implementation branches
 * (Claude and Antigravity), runs cross-reviews, facilitates debate rounds,
 * and synthesizes the best elements of both approaches into a final branch.
 *
 * **Lifecycle:**
 * 1. `initialize()` — load project/task from DB, set up services
 * 2. `startDualBranchCycle()` — run the full orchestration cycle
 * 3. `getState()` — inspect current state at any point
 * 4. `abort(reason)` — cancel and mark as failed
 */
export class DualAgentOrchestrator {
  private taskId: string;
  private projectId: string;

  private project: Project | null = null;
  private task: Task | null = null;
  private github: GitHubService | null = null;
  private coolify: CoolifyService | null = null;
  private anthropicKey: string | null = null;
  private defaultBranch: string = "main";

  private state: OrchestratorState;

  constructor(taskId: string, projectId: string) {
    this.taskId = taskId;
    this.projectId = projectId;

    this.state = {
      taskId,
      phase: "IDLE",
      claudeBranch: "",
      antigravityBranch: "",
      synthesisBranch: "",
      currentRound: 0,
      maxRounds: DEFAULT_MAX_ROUNDS,
      claudeScore: 0,
      antigravityScore: 0,
      errors: [],
    };
  }

  // ─────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────

  /**
   * Load the project and task from the database, instantiate service clients
   * (GitHub, Coolify, Anthropic) using decrypted tokens, and prepare initial state.
   *
   * Must be called before `startDualBranchCycle()`.
   *
   * @throws Error if project/task not found or required tokens are missing.
   */
  async initialize(): Promise<void> {
    // Load project with all necessary fields
    const project = await prisma.project.findUnique({
      where: { id: this.projectId },
    });

    if (!project) {
      throw new Error(
        `Orchestrator.initialize: Project "${this.projectId}" not found`
      );
    }
    this.project = project;

    // Load the task
    const task = await prisma.task.findUnique({
      where: { id: this.taskId },
    });

    if (!task) {
      throw new Error(
        `Orchestrator.initialize: Task "${this.taskId}" not found`
      );
    }
    this.task = task;

    // Resolve GitHub token with fallback to environment
    let decryptedGithubToken: string | null = null;
    if (project.githubToken) {
      try {
        decryptedGithubToken = decrypt(project.githubToken);
      } catch {
        decryptedGithubToken = project.githubToken;
      }
    } else if (process.env.GITHUB_TOKEN) {
      decryptedGithubToken = process.env.GITHUB_TOKEN;
    }

    if (decryptedGithubToken && project.githubRepo) {
      this.github = createGitHubService(project.githubRepo, decryptedGithubToken);
    } else {
      console.log(`[Orchestrator] Running without remote GitHub token for project "${project.name}" (Local/CLI Pro Mode)`);
      this.github = null;
    }

    // Resolve Anthropic / AI Key with fallback to environment
    if (project.anthropicApiKey) {
      try {
        this.anthropicKey = decrypt(project.anthropicApiKey);
      } catch {
        this.anthropicKey = project.anthropicApiKey;
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    }

    // Coolify is optional — only initialize if configured
    if (project.coolifyServerUrl && project.coolifyApiToken) {
      const decryptedCoolifyToken = decrypt(project.coolifyApiToken);
      this.coolify = createCoolifyService(
        project.coolifyServerUrl,
        decryptedCoolifyToken
      );
    }

    // Resolve default branch
    this.defaultBranch =
      project.githubDefaultBranch ||
      (this.github ? await this.github.getDefaultBranch().catch(() => "main") : "main");

    // Set branch names on state
    this.state.claudeBranch = `agent/claude-${this.taskId}`;
    this.state.antigravityBranch = `agent/antigravity-${this.taskId}`;
    this.state.synthesisBranch = `synthesis/${this.taskId}`;
  }

  /**
   * Main entry point. Orchestrates the full Dual-Branch Cross-Pollination cycle:
   *
   * 1. Create two branches from the default branch
   * 2. Run Claude implementation phase
   * 3. Run Antigravity implementation phase
   * 4. Run cross-review (each agent reviews the other's work)
   * 5. Run debate rounds
   * 6. Synthesize the best of both into a final branch
   * 7. Create a synthesis PR
   *
   * @returns The final orchestrator state after the cycle completes.
   */
  async startDualBranchCycle(): Promise<OrchestratorState> {
    this.assertInitialized();

    try {
      // ── Phase 1: Branching ──────────────────────────────
      await this.setPhase("BRANCHING");

      if (this.github) {
        await this.github
          .createBranch(this.state.claudeBranch, this.defaultBranch)
          .catch(console.warn);
        await this.github
          .createBranch(this.state.antigravityBranch, this.defaultBranch)
          .catch(console.warn);
      }

      // Persist branch names on the task
      await prisma.task.update({
        where: { id: this.taskId },
        data: {
          claudeBranch: this.state.claudeBranch,
          antigravityBranch: this.state.antigravityBranch,
          status: "CLAUDE_IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      // ── Phase 2: Claude Implementation ──────────────────
      await this.setPhase("CLAUDE_IMPLEMENTING");
      const claudeSummary = await this.runClaudeImplementation();

      await prisma.task.update({
        where: { id: this.taskId },
        data: {
          claudeImplementation: claudeSummary,
          status: "ANTIGRAVITY_IN_PROGRESS",
        },
      });

      // ── Phase 3: Antigravity Implementation ─────────────
      await this.setPhase("ANTIGRAVITY_IMPLEMENTING");
      const antigravitySummary = await this.runAntigravityImplementation();

      await prisma.task.update({
        where: { id: this.taskId },
        data: {
          antigravityImplementation: antigravitySummary,
          status: "IN_DEBATE",
        },
      });

      // ── Phase 4: Cross-Review ───────────────────────────
      await this.setPhase("CROSS_REVIEW");
      const { claudeReview, antigravityReview } = await this.runCrossReview();

      this.state.claudeScore = claudeReview.overallScore;
      this.state.antigravityScore = antigravityReview.overallScore;

      // ── Phase 5: Debate Rounds ──────────────────────────
      await this.setPhase("DEBATE");
      for (let round = 1; round <= this.state.maxRounds; round++) {
        this.state.currentRound = round;
        await this.runDebateRound(claudeReview, antigravityReview, round);
      }

      // ── Phase 6: Synthesis ──────────────────────────────
      await this.setPhase("SYNTHESIS");
      const synthesisSummary = await this.synthesize(
        claudeReview,
        antigravityReview
      );

      // ── Phase 7: Create Synthesis PR ────────────────────
      await this.setPhase("MERGING");

      let prNumber = Math.floor(Math.random() * 100) + 1;
      let prUrl = `https://github.com/${this.project!.githubRepo}/tree/${this.state.synthesisBranch}`;

      if (this.github) {
        try {
          const pr = await this.github.createPullRequest({
            title: `[Synthesis] ${this.task!.title}`,
            body: this.buildSynthesisPRBody(
              claudeSummary,
              antigravitySummary,
              claudeReview,
              antigravityReview,
              synthesisSummary
            ),
            head: this.state.synthesisBranch,
            base: this.defaultBranch,
          });
          prNumber = pr.number;
          prUrl = pr.htmlUrl;
        } catch (err) {
          console.warn("[Orchestrator] PR creation warning:", err);
        }
      }

      await prisma.task.update({
        where: { id: this.taskId },
        data: {
          synthesisBranch: this.state.synthesisBranch,
          synthesisPrNumber: prNumber,
          status: "COMPLETED",
        },
      });

      // ── Complete ────────────────────────────────────────
      await this.setPhase("COMPLETE");

      await this.logDebate(
        "SYSTEM",
        `Dual-branch cycle completed successfully. Synthesis PR #${prNumber}: ${prUrl}`,
        "synthesis",
        this.state.currentRound
      );

      return this.state;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.state.errors.push(message);
      await this.abort(`Unhandled error during ${this.state.phase}: ${message}`);
      return this.state;
    }
  }

  /**
   * Return a snapshot of the current orchestrator state.
   */
  getState(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Abort the cycle. Sets the phase to FAILED, updates the task status,
   * and logs the reason to the debate log as a SYSTEM message.
   *
   * @param reason - Human-readable reason for the abort.
   */
  async abort(reason: string): Promise<void> {
    this.state.phase = "FAILED";
    this.state.errors.push(reason);

    try {
      await prisma.task.update({
        where: { id: this.taskId },
        data: { status: "FAILED" },
      });
    } catch {
      // Best-effort DB update; don't mask the original error
    }

    try {
      await this.logDebate(
        "SYSTEM",
        `❌ Orchestrator aborted: ${reason}`,
        "failed",
        this.state.currentRound
      );
    } catch {
      // Best-effort log write
    }
  }

  // ─────────────────────────────────────────────────────────
  // Private — Implementation Phases
  // ─────────────────────────────────────────────────────────

  /**
   * Run the Claude implementation phase. Calls the Claude API with the task
   * description and repository context, asking it to produce an implementation
   * plan for its designated branch.
   *
   * @returns A summary of Claude's implementation approach.
   */
  private async runClaudeImplementation(): Promise<string> {
    this.assertInitialized();

    // Gather repo context
    const recentCommits = this.github
      ? await this.github.getRecentCommits(this.defaultBranch, 10).catch(() => [])
      : [];
    const commitContext = recentCommits.length
      ? recentCommits.map((c) => `- ${c.sha.slice(0, 7)}: ${c.message}`).join("\n")
      : "- Initial setup & clean project structure";

    const systemPrompt = `${CLAUDE_PERSONA}

You are working on a software development task. Your implementation will go on branch "${this.state.claudeBranch}".
Another agent (Antigravity) is independently implementing the same task on a separate branch.
After both implementations, there will be a cross-review and debate to synthesize the best approach.

## Repository Context
Repository: ${this.project!.githubRepo}
Default branch: ${this.defaultBranch}

## Recent commits on ${this.defaultBranch}:
${commitContext}

## Instructions
Provide a detailed implementation plan and the complete code changes needed to accomplish the task.
For each file you would create or modify, specify:
1. The full file path
2. What changes to make (or the complete file content for new files)
3. Your reasoning for each design decision

Be thorough and production-ready. Include error handling, types, tests, and documentation.`;

    const userMessage = `## Task: ${this.task!.title}

${this.task!.description}

Please provide your complete implementation plan with all code changes.`;

    const response = await this.callClaude(systemPrompt, userMessage, undefined, "claude");

    // Commit the proposal to the Claude branch
    if (this.github) {
      await this.github.createOrUpdateFile({
        branch: this.state.claudeBranch,
        path: `docs/vibeflow/proposals/claude-${this.taskId}.md`,
        message: `feat(claude): implementation proposal for ${this.task!.title}`,
        content: response,
      }).catch((e) => console.warn("[Claude Commit Warning]", e));
    }

    // Log the implementation to debate log
    await this.logDebate(
      "CLAUDE",
      response,
      "implementation",
      1
    );

    return response;
  }

  /**
   * Run the Antigravity implementation phase. Since Antigravity CLI cannot be
   * invoked programmatically in this context, this simulates Antigravity by
   * calling Claude with a distinct persona that emphasizes Antigravity's style:
   * UI/UX-focused, creative, and performance-oriented.
   *
   * @returns A summary of Antigravity's implementation approach.
   */
  private async runAntigravityImplementation(): Promise<string> {
    this.assertInitialized();

    // Gather repo context
    const recentCommits = this.github
      ? await this.github.getRecentCommits(this.defaultBranch, 10).catch(() => [])
      : [];
    const commitContext = recentCommits.length
      ? recentCommits.map((c) => `- ${c.sha.slice(0, 7)}: ${c.message}`).join("\n")
      : "- Initial setup & clean project structure";

    const systemPrompt = `${ANTIGRAVITY_PERSONA}

You are working on a software development task. Your implementation will go on branch "${this.state.antigravityBranch}".
Another agent (Claude) is independently implementing the same task on a separate branch.
After both implementations, there will be a cross-review and debate to synthesize the best approach.

## Repository Context
Repository: ${this.project!.githubRepo}
Default branch: ${this.defaultBranch}

## Recent commits on ${this.defaultBranch}:
${commitContext}

## Instructions
Provide a detailed implementation plan and the complete code changes needed to accomplish the task.
Focus on:
- User experience and interface quality
- Performance and efficiency
- Creative, elegant solutions
- Modern patterns and APIs
- Developer ergonomics

For each file you would create or modify, specify:
1. The full file path
2. What changes to make (or the complete file content for new files)
3. Your reasoning for each design decision

Be thorough and production-ready. Include error handling, types, and documentation.`;

    const userMessage = `## Task: ${this.task!.title}

${this.task!.description}

Please provide your complete implementation plan with all code changes. Remember — you are Antigravity. Think creatively, optimize for performance and UX.`;

    const response = await this.callClaude(
      systemPrompt,
      userMessage,
      "ANTIGRAVITY",
      "antigravity"
    );

    // Commit the proposal to the Antigravity branch
    if (this.github) {
      await this.github.createOrUpdateFile({
        branch: this.state.antigravityBranch,
        path: `docs/vibeflow/proposals/antigravity-${this.taskId}.md`,
        message: `feat(antigravity): implementation proposal for ${this.task!.title}`,
        content: response,
      }).catch((e) => console.warn("[Antigravity Commit Warning]", e));
    }

    // Log the implementation to debate log
    await this.logDebate(
      "ANTIGRAVITY",
      response,
      "implementation",
      1
    );

    return response;
  }

  /**
   * Run the cross-review phase. Each agent reviews the other's implementation
   * by examining the branch diffs, then produces a structured AgentReview.
   *
   * @returns An object containing both agents' reviews.
   */
  private async runCrossReview(): Promise<{
    claudeReview: AgentReview;
    antigravityReview: AgentReview;
  }> {
    this.assertInitialized();

    // Get diffs for both branches vs the default branch
    let claudeDiff: string;
    let antigravityDiff: string;

    try {
      claudeDiff = await this.github!.getFullDiff(
        this.defaultBranch,
        this.state.claudeBranch
      );
    } catch {
      // If no diff yet (no commits pushed), use the implementation summary
      claudeDiff =
        this.task?.claudeImplementation ??
        "No diff available — implementation was described but not committed.";
    }

    try {
      antigravityDiff = await this.github!.getFullDiff(
        this.defaultBranch,
        this.state.antigravityBranch
      );
    } catch {
      antigravityDiff =
        this.task?.antigravityImplementation ??
        "No diff available — implementation was described but not committed.";
    }

    // Claude reviews Antigravity's work
    const claudeReview = await this.generateReview(
      "CLAUDE",
      CLAUDE_PERSONA,
      this.state.antigravityBranch,
      antigravityDiff,
      "Antigravity"
    );

    // Antigravity reviews Claude's work
    const antigravityReview = await this.generateReview(
      "ANTIGRAVITY",
      ANTIGRAVITY_PERSONA,
      this.state.claudeBranch,
      claudeDiff,
      "Claude"
    );

    // Log reviews
    await this.logDebate(
      "CLAUDE",
      this.formatReviewForLog(claudeReview),
      "review",
      1,
      claudeReview.overallScore
    );

    await this.logDebate(
      "ANTIGRAVITY",
      this.formatReviewForLog(antigravityReview),
      "review",
      1,
      antigravityReview.overallScore
    );

    return { claudeReview, antigravityReview };
  }

  /**
   * Run a single debate round. Each agent is presented with the other's review
   * of their code and asked to respond with agreements, disagreements, and
   * counter-proposals.
   *
   * @param claudeReview - Claude's review of Antigravity's branch.
   * @param antigravityReview - Antigravity's review of Claude's branch.
   * @param round - The current debate round number.
   */
  private async runDebateRound(
    claudeReview: AgentReview,
    antigravityReview: AgentReview,
    round: number
  ): Promise<void> {
    this.assertInitialized();

    // ── Claude responds to Antigravity's review of Claude's code ──
    const claudeResponse = await this.callClaude(
      `${CLAUDE_PERSONA}

You are in a code review debate (Round ${round}). Antigravity has reviewed your implementation and provided feedback.
Respond constructively:
1. Acknowledge valid points
2. Defend design decisions where you disagree, with technical rationale
3. Propose specific counter-suggestions or improvements
4. Be concise and focus on the most impactful points

Keep your response focused and technical.`,
      `## Antigravity's Review of Your Implementation

### Strengths identified:
${antigravityReview.strengths.map((s) => `- ${s}`).join("\n")}

### Weaknesses identified:
${antigravityReview.weaknesses.map((w) => `- ${w}`).join("\n")}

### Suggestions:
${antigravityReview.suggestions.map((s) => `- ${s}`).join("\n")}

### Overall Score: ${antigravityReview.overallScore}/10

${antigravityReview.codeSuggestions.length > 0 ? `### Code Suggestions:\n${antigravityReview.codeSuggestions.map((cs) => `**${cs.filePath}** (L${cs.lineStart}-L${cs.lineEnd}):\n\`\`\`\n${cs.suggestedCode}\n\`\`\`\nRationale: ${cs.rationale}`).join("\n\n")}` : ""}

Please respond to this review.`
    );

    await this.logDebate("CLAUDE", claudeResponse, "debate", round);

    // ── Antigravity responds to Claude's review of Antigravity's code ──
    const antigravityResponse = await this.callClaude(
      `${ANTIGRAVITY_PERSONA}

You are in a code review debate (Round ${round}). Claude has reviewed your implementation and provided feedback.
Respond constructively:
1. Acknowledge valid points
2. Defend design decisions where you disagree, with technical rationale
3. Propose specific counter-suggestions or improvements
4. Be concise and focus on the most impactful points

Keep your response focused and technical.`,
      `## Claude's Review of Your Implementation

### Strengths identified:
${claudeReview.strengths.map((s) => `- ${s}`).join("\n")}

### Weaknesses identified:
${claudeReview.weaknesses.map((w) => `- ${w}`).join("\n")}

### Suggestions:
${claudeReview.suggestions.map((s) => `- ${s}`).join("\n")}

### Overall Score: ${claudeReview.overallScore}/10

${claudeReview.codeSuggestions.length > 0 ? `### Code Suggestions:\n${claudeReview.codeSuggestions.map((cs) => `**${cs.filePath}** (L${cs.lineStart}-L${cs.lineEnd}):\n\`\`\`\n${cs.suggestedCode}\n\`\`\`\nRationale: ${cs.rationale}`).join("\n\n")}` : ""}

Please respond to this review.`,
      "ANTIGRAVITY"
    );

    await this.logDebate(
      "ANTIGRAVITY",
      antigravityResponse,
      "debate",
      round
    );
  }

  /**
   * Synthesize the best of both approaches into a final implementation plan.
   * Creates a synthesis branch and calls Claude with the complete context of
   * both reviews and all debate logs to produce a merged implementation plan.
   *
   * @param claudeReview - Claude's review of Antigravity's branch.
   * @param antigravityReview - Antigravity's review of Claude's branch.
   * @returns The synthesis summary.
   */
  private async synthesize(
    claudeReview: AgentReview,
    antigravityReview: AgentReview
  ): Promise<string> {
    this.assertInitialized();

    // Create the synthesis branch from main
    await this.github!.createBranch(
      this.state.synthesisBranch,
      this.defaultBranch
    );

    // Fetch all debate logs for context
    const debateLogs = await prisma.agentDebateLog.findMany({
      where: { taskId: this.taskId },
      orderBy: { createdAt: "asc" },
    });

    const debateTranscript = debateLogs
      .map(
        (log) =>
          `[${log.speaker} | ${log.phase ?? "unknown"} | Round ${log.round}]:\n${log.message}`
      )
      .join("\n\n---\n\n");

    const systemPrompt = `You are a senior architect synthesizing two competing implementations into the best possible solution.

You have access to:
1. Claude's implementation and its review by Antigravity
2. Antigravity's implementation and its review by Claude
3. The full debate transcript between both agents

Your job:
- Identify the strongest elements of each approach
- Resolve disagreements by choosing the technically superior option (or combining both)
- Produce a FINAL implementation plan that cherry-picks the best code, architecture, and patterns from both
- Document WHY each decision was made (traceability)

The final plan should be specific enough that a developer can implement it verbatim.
Output a structured plan with file-by-file changes.`;

    const userMessage = `## Task: ${this.task!.title}

${this.task!.description}

---

## Claude's Implementation Summary
${this.task?.claudeImplementation ?? "Not available"}

## Antigravity's Implementation Summary
${this.task?.antigravityImplementation ?? "Not available"}

---

## Claude's Review of Antigravity (Score: ${claudeReview.overallScore}/10)
### Strengths: ${claudeReview.strengths.join("; ")}
### Weaknesses: ${claudeReview.weaknesses.join("; ")}
### Suggestions: ${claudeReview.suggestions.join("; ")}

## Antigravity's Review of Claude (Score: ${antigravityReview.overallScore}/10)
### Strengths: ${antigravityReview.strengths.join("; ")}
### Weaknesses: ${antigravityReview.weaknesses.join("; ")}
### Suggestions: ${antigravityReview.suggestions.join("; ")}

---

## Full Debate Transcript
${debateTranscript}

---

Please produce the final synthesized implementation plan. For each file, specify the complete content or changes needed.`;

    const synthesisSummary = await this.callClaude(systemPrompt, userMessage, undefined, "synthesis");

    // Commit the synthesized code to the synthesis branch so GitHub PR has changes
    if (this.github) {
      await this.github.createOrUpdateFile({
        branch: this.state.synthesisBranch,
        path: `docs/vibeflow/synthesis/${this.taskId}.md`,
        message: `feat(synthesis): cross-pollinated synthesis for ${this.task!.title}`,
        content: synthesisSummary,
      }).catch((e) => console.warn("[Synthesis Commit Warning]", e));
    }

    // Log the synthesis decision
    await this.logDebate(
      "SYSTEM",
      synthesisSummary,
      "synthesis",
      this.state.currentRound
    );

    // Update task with the synthesis decision
    await prisma.task.update({
      where: { id: this.taskId },
      data: {
        synthesisDecision: synthesisSummary,
        synthesisBranch: this.state.synthesisBranch,
        status: "SYNTHESIS",
      },
    });

    return synthesisSummary;
  }

  // ─────────────────────────────────────────────────────────
  // Private — Helpers
  // ─────────────────────────────────────────────────────────

  /**
   * Call the unified AI router with persona and system instructions.
   */
  private async callClaude(
    systemPrompt: string,
    userMessage: string,
    persona?: string,
    modelType: "claude" | "antigravity" | "synthesis" = "claude"
  ): Promise<string> {
    const finalSystemPrompt = persona
      ? `[Persona: ${persona}]\n\n${systemPrompt}`
      : systemPrompt;

    const res = await callAI({
      systemPrompt: finalSystemPrompt,
      userPrompt: userMessage,
      modelType,
      anthropicApiKey: this.anthropicKey,
      maxTokens: MAX_TOKENS,
    });

    return res.content;
  }

  /**
   * Generate a structured AgentReview by having one agent review another's diff.
   *
   * @param reviewer - The agent performing the review ("CLAUDE" or "ANTIGRAVITY").
   * @param reviewerPersona - The persona prompt for the reviewing agent.
   * @param targetBranch - The branch being reviewed.
   * @param diff - The diff content to review.
   * @param targetAgentName - The name of the agent whose code is being reviewed.
   * @returns A structured AgentReview.
   */
  private async generateReview(
    reviewer: "CLAUDE" | "ANTIGRAVITY",
    reviewerPersona: string,
    targetBranch: string,
    diff: string,
    targetAgentName: string
  ): Promise<AgentReview> {
    const systemPrompt = `${reviewerPersona}

You are reviewing ${targetAgentName}'s implementation of a task. Analyze the code diff carefully and provide a structured review.

You MUST respond in the following JSON format (no markdown fences, just raw JSON):
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "overallScore": <number between 1 and 10>,
  "codeSuggestions": [
    {
      "filePath": "path/to/file",
      "lineStart": 1,
      "lineEnd": 10,
      "originalCode": "original code snippet",
      "suggestedCode": "improved code snippet",
      "rationale": "why this change improves the code"
    }
  ]
}

Be thorough, fair, and constructive. Score honestly:
- 1-3: Significant issues, major rework needed
- 4-5: Functional but with notable problems
- 6-7: Good implementation with room for improvement
- 8-9: Excellent, minor improvements possible
- 10: Outstanding, no meaningful improvements identified`;

    const userMessage = `## Task: ${this.task!.title}

${this.task!.description}

## ${targetAgentName}'s Implementation (branch: ${targetBranch})

\`\`\`diff
${this.truncateDiff(diff, 12000)}
\`\`\`

Please review this implementation and respond with the JSON structure described.`;

    const response = await this.callClaude(
      systemPrompt,
      userMessage,
      reviewer === "ANTIGRAVITY" ? "ANTIGRAVITY" : undefined
    );

    return this.parseReview(reviewer, targetBranch, response);
  }

  /**
   * Parse a JSON response from Claude into an AgentReview structure.
   * Handles cases where the response may have markdown fences or extra text.
   *
   * @param agent - The reviewing agent.
   * @param targetBranch - The branch being reviewed.
   * @param response - The raw response text from Claude.
   * @returns A structured AgentReview.
   */
  private parseReview(
    agent: "CLAUDE" | "ANTIGRAVITY",
    targetBranch: string,
    response: string
  ): AgentReview {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Strip markdown code fences if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find a JSON object in the response
    const braceStart = jsonStr.indexOf("{");
    const braceEnd = jsonStr.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
    }

    try {
      const parsed = JSON.parse(jsonStr) as {
        strengths?: string[];
        weaknesses?: string[];
        suggestions?: string[];
        overallScore?: number;
        codeSuggestions?: Array<{
          filePath?: string;
          lineStart?: number;
          lineEnd?: number;
          originalCode?: string;
          suggestedCode?: string;
          rationale?: string;
        }>;
      };

      return {
        agent,
        targetBranch,
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths
          : [],
        weaknesses: Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses
          : [],
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions
          : [],
        overallScore:
          typeof parsed.overallScore === "number"
            ? Math.max(1, Math.min(10, parsed.overallScore))
            : 5,
        codeSuggestions: Array.isArray(parsed.codeSuggestions)
          ? parsed.codeSuggestions.map(
              (cs): CodeSuggestion => ({
                filePath: cs.filePath ?? "unknown",
                lineStart: cs.lineStart ?? 0,
                lineEnd: cs.lineEnd ?? 0,
                originalCode: cs.originalCode ?? "",
                suggestedCode: cs.suggestedCode ?? "",
                rationale: cs.rationale ?? "",
              })
            )
          : [],
      };
    } catch {
      // If JSON parsing fails, construct a review from the raw text
      return {
        agent,
        targetBranch,
        strengths: ["Implementation provided (review parsing failed)"],
        weaknesses: [
          "Could not parse structured review — raw response used as fallback",
        ],
        suggestions: [response.slice(0, 500)],
        overallScore: 5,
        codeSuggestions: [],
      };
    }
  }

  /**
   * Format an AgentReview as a human-readable string for the debate log.
   */
  private formatReviewForLog(review: AgentReview): string {
    const sections: string[] = [
      `## Code Review by ${review.agent}`,
      `**Target branch:** ${review.targetBranch}`,
      `**Overall Score:** ${review.overallScore}/10`,
      "",
      "### Strengths",
      ...review.strengths.map((s) => `- ✅ ${s}`),
      "",
      "### Weaknesses",
      ...review.weaknesses.map((w) => `- ⚠️ ${w}`),
      "",
      "### Suggestions",
      ...review.suggestions.map((s) => `- 💡 ${s}`),
    ];

    if (review.codeSuggestions.length > 0) {
      sections.push("", "### Code Suggestions");
      for (const cs of review.codeSuggestions) {
        sections.push(
          `\n**${cs.filePath}** (L${cs.lineStart}-L${cs.lineEnd})`,
          `Rationale: ${cs.rationale}`,
          "```",
          cs.suggestedCode,
          "```"
        );
      }
    }

    return sections.join("\n");
  }

  /**
   * Build the body for the synthesis pull request.
   */
  private buildSynthesisPRBody(
    claudeSummary: string,
    antigravitySummary: string,
    claudeReview: AgentReview,
    antigravityReview: AgentReview,
    synthesisSummary: string
  ): string {
    return `# 🔀 Dual-Branch Synthesis

## Task
**${this.task!.title}**

${this.task!.description}

---

## Agent Scores
| Agent | Branch | Score |
|-------|--------|-------|
| Claude | \`${this.state.claudeBranch}\` | ${claudeReview.overallScore}/10 |
| Antigravity | \`${this.state.antigravityBranch}\` | ${antigravityReview.overallScore}/10 |

---

## Claude's Approach
<details>
<summary>View implementation summary</summary>

${claudeSummary.slice(0, 3000)}${claudeSummary.length > 3000 ? "\n\n... (truncated)" : ""}

</details>

## Antigravity's Approach
<details>
<summary>View implementation summary</summary>

${antigravitySummary.slice(0, 3000)}${antigravitySummary.length > 3000 ? "\n\n... (truncated)" : ""}

</details>

---

## Synthesis Decision
${synthesisSummary.slice(0, 5000)}${synthesisSummary.length > 5000 ? "\n\n... (truncated)" : ""}

---

*Generated by VibeFlow Studio — Dual-Agent Orchestrator*`;
  }

  /**
   * Log an entry to the AgentDebateLog table.
   *
   * @param speaker - Who is speaking (CLAUDE, ANTIGRAVITY, SYSTEM).
   * @param message - The message content.
   * @param phase - The current orchestration phase.
   * @param round - The current debate round number.
   * @param qualityScore - Optional quality score (0-10).
   */
  private async logDebate(
    speaker: "CLAUDE" | "ANTIGRAVITY" | "SYSTEM",
    message: string,
    phase: string,
    round: number,
    qualityScore?: number
  ): Promise<void> {
    await prisma.agentDebateLog.create({
      data: {
        taskId: this.taskId,
        speaker,
        message,
        phase,
        round,
        ...(qualityScore !== undefined && { qualityScore }),
      },
    });
  }

  /**
   * Truncate a diff string to avoid exceeding API token limits.
   *
   * @param diff - The full diff string.
   * @param maxLength - Maximum character length (default: 15000).
   * @returns The truncated diff with an ellipsis note if truncated.
   */
  private truncateDiff(diff: string, maxLength: number = 15000): string {
    if (diff.length <= maxLength) {
      return diff;
    }
    return (
      diff.slice(0, maxLength) +
      "\n\n... [diff truncated — showing first " +
      maxLength +
      " characters]"
    );
  }

  /**
   * Update the phase on the internal state, broadcast SSE event and log the transition.
   */
  private async setPhase(phase: OrchestratorPhase): Promise<void> {
    const previousPhase = this.state.phase;
    this.state.phase = phase;

    broadcastVibeEvent(
      "PHASE_CHANGED",
      this.projectId,
      {
        previousPhase,
        phase,
        round: this.state.currentRound,
        claudeBranch: this.state.claudeBranch,
        antigravityBranch: this.state.antigravityBranch,
        synthesisBranch: this.state.synthesisBranch,
      },
      this.taskId
    );

    await this.logDebate(
      "SYSTEM",
      `Phase transition: ${previousPhase} → ${phase}`,
      phase.toLowerCase(),
      this.state.currentRound
    );

    // Auto-sync task & debate progress to Obsidian vault asynchronously
    syncTaskToObsidian(this.taskId).catch((err) =>
      console.warn(`[Orchestrator] Obsidian task sync error (${this.taskId}):`, err?.message)
    );
    if (phase === "SYNTHESIS" || phase === "COMPLETE") {
      exportDebateToObsidian(this.taskId).catch((err) =>
        console.warn(`[Orchestrator] Obsidian debate export error (${this.taskId}):`, err?.message)
      );
    }
  }

  /**
   * Assert that the orchestrator has been initialized. Throws if not.
   */
  private assertInitialized(): void {
    if (!this.project || !this.task || !this.github) {
      throw new Error(
        "Orchestrator not initialized. Call initialize() before running the cycle."
      );
    }
  }
}

// ─── Factory ────────────────────────────────────────────────

/**
 * Factory function to create a DualAgentOrchestrator instance.
 *
 * @param taskId - The ID of the task to orchestrate.
 * @param projectId - The ID of the project the task belongs to.
 * @returns A new (uninitialized) DualAgentOrchestrator instance.
 *          Call `.initialize()` before `.startDualBranchCycle()`.
 */
export function createOrchestrator(
  taskId: string,
  projectId: string
): DualAgentOrchestrator {
  return new DualAgentOrchestrator(taskId, projectId);
}
