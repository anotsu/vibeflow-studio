// ============================================================
// VibeFlow Studio — Polyglot Multi-Stack Detector & Launcher
// Phase 6.1: Detects frameworks & runtimes across any GitHub repo:
// Next.js, Vite (React/Vue/Svelte), Nuxt, SvelteKit, Astro,
// FastAPI/Python, Rust (Axum/Actix), and Go.
// Generates dynamic preview dev server commands with custom port binding.
// ============================================================

import fs from "fs";
import path from "path";

export type SupportedStack =
  | "nextjs"
  | "vite"
  | "nuxt"
  | "sveltekit"
  | "astro"
  | "fastapi"
  | "rust_axum"
  | "golang"
  | "node_generic"
  | "static";

export interface StackConfig {
  id: SupportedStack;
  name: string;
  category: "FRONTEND" | "FULLSTACK" | "BACKEND" | "SYSTEM";
  icon: string;
  defaultPort: number;
  command: string;
  args: (port: number) => string[];
  env: (port: number) => Record<string, string>;
}

export interface DetectedStackInfo {
  stack: SupportedStack;
  displayName: string;
  frameworkVersion?: string;
  language: "TypeScript" | "JavaScript" | "Python" | "Rust" | "Go" | "HTML/CSS";
  devCommand: string[];
  envOverrides: Record<string, string>;
  detectedFiles: string[];
}

/**
 * Standard configurations for supported stacks.
 */
export const STACK_CONFIGS: Record<SupportedStack, StackConfig> = {
  nextjs: {
    id: "nextjs",
    name: "Next.js",
    category: "FULLSTACK",
    icon: "▲",
    defaultPort: 3000,
    command: "npx",
    args: (port) => ["next", "dev", "-p", String(port)],
    env: (port) => ({
      PORT: String(port),
      NEXT_TELEMETRY_DISABLED: "1",
    }),
  },
  vite: {
    id: "vite",
    name: "Vite",
    category: "FRONTEND",
    icon: "⚡",
    defaultPort: 5173,
    command: "npx",
    args: (port) => ["vite", "--port", String(port), "--host", "127.0.0.1"],
    env: (port) => ({
      VITE_PORT: String(port),
      PORT: String(port),
    }),
  },
  nuxt: {
    id: "nuxt",
    name: "Nuxt 3",
    category: "FULLSTACK",
    icon: "💚",
    defaultPort: 3000,
    command: "npx",
    args: (port) => ["nuxt", "dev", "--port", String(port)],
    env: (port) => ({
      PORT: String(port),
    }),
  },
  sveltekit: {
    id: "sveltekit",
    name: "SvelteKit",
    category: "FULLSTACK",
    icon: "🧡",
    defaultPort: 5173,
    command: "npx",
    args: (port) => ["vite", "dev", "--port", String(port)],
    env: (port) => ({
      PORT: String(port),
    }),
  },
  astro: {
    id: "astro",
    name: "Astro",
    category: "FRONTEND",
    icon: "🚀",
    defaultPort: 4321,
    command: "npx",
    args: (port) => ["astro", "dev", "--port", String(port)],
    env: (port) => ({
      PORT: String(port),
    }),
  },
  fastapi: {
    id: "fastapi",
    name: "FastAPI / Python",
    category: "BACKEND",
    icon: "🐍",
    defaultPort: 8000,
    command: "python",
    args: (port) => [
      "-m",
      "uvicorn",
      "main:app",
      "--port",
      String(port),
      "--host",
      "127.0.0.1",
      "--reload",
    ],
    env: (port) => ({
      PORT: String(port),
      PYTHONUNBUFFERED: "1",
    }),
  },
  rust_axum: {
    id: "rust_axum",
    name: "Rust (Axum / Cargo)",
    category: "BACKEND",
    icon: "🦀",
    defaultPort: 8080,
    command: "cargo",
    args: () => ["run"],
    env: (port) => ({
      PORT: String(port),
      ROCKET_PORT: String(port),
      AXUM_PORT: String(port),
      RUST_LOG: "info",
    }),
  },
  golang: {
    id: "golang",
    name: "Go Server",
    category: "BACKEND",
    icon: "🦫",
    defaultPort: 8080,
    command: "go",
    args: () => ["run", "."],
    env: (port) => ({
      PORT: String(port),
    }),
  },
  node_generic: {
    id: "node_generic",
    name: "Node.js (Custom Dev)",
    category: "FULLSTACK",
    icon: "🟢",
    defaultPort: 3000,
    command: "npm",
    args: (port) => ["run", "dev", "--", "-p", String(port)],
    env: (port) => ({
      PORT: String(port),
    }),
  },
  static: {
    id: "static",
    name: "Static HTML/CSS",
    category: "FRONTEND",
    icon: "🌐",
    defaultPort: 8080,
    command: "npx",
    args: (port) => ["serve", "-p", String(port), "."],
    env: (port) => ({
      PORT: String(port),
    }),
  },
};

/**
 * Analyzes a local workspace or directory to identify its technology stack.
 */
export function detectWorkspaceStack(worktreePath: string): DetectedStackInfo {
  const detectedFiles: string[] = [];

  const checkExists = (relPath: string): boolean => {
    const full = path.join(worktreePath, relPath);
    if (fs.existsSync(full)) {
      detectedFiles.push(relPath);
      return true;
    }
    return false;
  };

  // 1. Rust Cargo check
  if (checkExists("Cargo.toml")) {
    const cargoContent = fs.readFileSync(path.join(worktreePath, "Cargo.toml"), "utf-8");
    const isAxum = cargoContent.includes("axum") || cargoContent.includes("actix-web");
    const config = STACK_CONFIGS.rust_axum;
    return {
      stack: "rust_axum",
      displayName: isAxum ? "Rust Axum / Actix" : "Rust Cargo App",
      language: "Rust",
      devCommand: [config.command, ...config.args(config.defaultPort)],
      envOverrides: config.env(config.defaultPort),
      detectedFiles,
    };
  }

  // 2. Go check
  if (checkExists("go.mod")) {
    const config = STACK_CONFIGS.golang;
    return {
      stack: "golang",
      displayName: "Go Web Service",
      language: "Go",
      devCommand: [config.command, ...config.args(config.defaultPort)],
      envOverrides: config.env(config.defaultPort),
      detectedFiles,
    };
  }

  // 3. Python FastAPI / Django / Flask check
  if (checkExists("pyproject.toml") || checkExists("requirements.txt") || checkExists("main.py")) {
    let hasFastAPI = false;
    if (checkExists("requirements.txt")) {
      const req = fs.readFileSync(path.join(worktreePath, "requirements.txt"), "utf-8");
      if (req.toLowerCase().includes("fastapi") || req.toLowerCase().includes("uvicorn")) {
        hasFastAPI = true;
      }
    }
    if (checkExists("pyproject.toml")) {
      const pyp = fs.readFileSync(path.join(worktreePath, "pyproject.toml"), "utf-8");
      if (pyp.toLowerCase().includes("fastapi")) {
        hasFastAPI = true;
      }
    }

    const config = STACK_CONFIGS.fastapi;
    return {
      stack: "fastapi",
      displayName: hasFastAPI ? "FastAPI Backend" : "Python Web Application",
      language: "Python",
      devCommand: [config.command, ...config.args(config.defaultPort)],
      envOverrides: config.env(config.defaultPort),
      detectedFiles,
    };
  }

  // 4. Node.js & JavaScript ecosystem
  const pkgPath = path.join(worktreePath, "package.json");
  if (fs.existsSync(pkgPath)) {
    detectedFiles.push("package.json");
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      const isTs = Boolean(allDeps["typescript"]) || checkExists("tsconfig.json");

      // Next.js
      if (allDeps["next"] || checkExists("next.config.js") || checkExists("next.config.mjs") || checkExists("next.config.ts")) {
        const config = STACK_CONFIGS.nextjs;
        return {
          stack: "nextjs",
          displayName: `Next.js ${allDeps["next"] || ""}`.trim(),
          frameworkVersion: allDeps["next"],
          language: isTs ? "TypeScript" : "JavaScript",
          devCommand: [config.command, ...config.args(config.defaultPort)],
          envOverrides: config.env(config.defaultPort),
          detectedFiles,
        };
      }

      // Nuxt
      if (allDeps["nuxt"] || checkExists("nuxt.config.ts") || checkExists("nuxt.config.js")) {
        const config = STACK_CONFIGS.nuxt;
        return {
          stack: "nuxt",
          displayName: "Nuxt 3",
          frameworkVersion: allDeps["nuxt"],
          language: isTs ? "TypeScript" : "JavaScript",
          devCommand: [config.command, ...config.args(config.defaultPort)],
          envOverrides: config.env(config.defaultPort),
          detectedFiles,
        };
      }

      // SvelteKit
      if (allDeps["@sveltejs/kit"] || checkExists("svelte.config.js")) {
        const config = STACK_CONFIGS.sveltekit;
        return {
          stack: "sveltekit",
          displayName: "SvelteKit",
          language: isTs ? "TypeScript" : "JavaScript",
          devCommand: [config.command, ...config.args(config.defaultPort)],
          envOverrides: config.env(config.defaultPort),
          detectedFiles,
        };
      }

      // Astro
      if (allDeps["astro"] || checkExists("astro.config.mjs")) {
        const config = STACK_CONFIGS.astro;
        return {
          stack: "astro",
          displayName: "Astro",
          language: isTs ? "TypeScript" : "JavaScript",
          devCommand: [config.command, ...config.args(config.defaultPort)],
          envOverrides: config.env(config.defaultPort),
          detectedFiles,
        };
      }

      // Vite (React / Vue)
      if (allDeps["vite"] || checkExists("vite.config.ts") || checkExists("vite.config.js")) {
        const config = STACK_CONFIGS.vite;
        const framework = allDeps["vue"] ? "Vue + Vite" : allDeps["react"] ? "React + Vite" : "Vite App";
        return {
          stack: "vite",
          displayName: framework,
          language: isTs ? "TypeScript" : "JavaScript",
          devCommand: [config.command, ...config.args(config.defaultPort)],
          envOverrides: config.env(config.defaultPort),
          detectedFiles,
        };
      }

      // Generic Node with npm run dev
      if (pkg.scripts?.dev || pkg.scripts?.start) {
        const config = STACK_CONFIGS.node_generic;
        return {
          stack: "node_generic",
          displayName: "Node.js Application",
          language: isTs ? "TypeScript" : "JavaScript",
          devCommand: [config.command, ...config.args(config.defaultPort)],
          envOverrides: config.env(config.defaultPort),
          detectedFiles,
        };
      }
    } catch {}
  }

  // 5. Default static HTML fallback
  const config = STACK_CONFIGS.static;
  return {
    stack: "static",
    displayName: "Site Statique (HTML/CSS)",
    language: "HTML/CSS",
    devCommand: [config.command, ...config.args(config.defaultPort)],
    envOverrides: config.env(config.defaultPort),
    detectedFiles,
  };
}

/**
 * Computes exact command line arguments and environment variables for launching a preview dev server.
 */
export function getDevExecutionPlan(
  worktreePath: string,
  port: number
): { command: string; args: string[]; env: Record<string, string>; stackName: string } {
  const stackInfo = detectWorkspaceStack(worktreePath);
  const config = STACK_CONFIGS[stackInfo.stack] || STACK_CONFIGS.node_generic;

  return {
    command: config.command,
    args: config.args(port),
    env: config.env(port),
    stackName: stackInfo.displayName,
  };
}
