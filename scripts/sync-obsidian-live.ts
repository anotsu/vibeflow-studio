import fs from "fs";
import path from "path";
import { pushToLiveObsidianApi } from "../src/lib/obsidian-sync";

async function main() {
  const vaultDir = path.join(process.cwd(), "obsidian-vault", "VibeFlow");
  console.log(`[Sync] Reading vault directory: ${vaultDir}`);

  if (!fs.existsSync(vaultDir)) {
    console.error(`[Sync] Vault directory not found!`);
    process.exit(1);
  }

  // Get all .md files recursively
  function getMarkdownFiles(dir: string, baseDir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getMarkdownFiles(fullPath, baseDir));
      } else if (file.endsWith(".md")) {
        results.push(path.relative(baseDir, fullPath));
      }
    }
    return results;
  }

  const files = getMarkdownFiles(vaultDir, vaultDir);
  console.log(`[Sync] Found ${files.length} markdown documents to verify and sync.`);

  let syncedCount = 0;
  let corruptedCount = 0;

  for (const relativePath of files) {
    const fullPath = path.join(vaultDir, relativePath);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Check for corrupt diamond characters
    const hasDiamond = content.includes("\uFFFD");
    if (hasDiamond) {
      console.warn(`[CORRUPT] Diamond character found in ${relativePath}`);
      corruptedCount++;
    } else {
      const normalizedPath = `VibeFlow/${relativePath.replace(/\\/g, "/")}`;
      const success = await pushToLiveObsidianApi(normalizedPath, content);
      if (success) {
        console.log(`[SUCCESS] Synced ${normalizedPath} to Obsidian REST API`);
        syncedCount++;
      } else {
        console.warn(`[WARN] Could not sync ${normalizedPath} to Obsidian REST API (server may be offline)`);
      }
    }
  }

  console.log(`\n[Sync Summary] Synced: ${syncedCount}/${files.length}, Corrupted: ${corruptedCount}`);
}

main().catch(console.error);
