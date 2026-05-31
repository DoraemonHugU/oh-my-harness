import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export const OhMyHarnessTreePlugin = async ({ directory, worktree }) => {
  const root = path.resolve(worktree || directory || process.cwd());
  const script = path.join(root, ".oh-my-harness", "hooks", "tree.mjs");
  let running = false;

  async function refreshTree() {
    if (running || !existsSync(script)) {
      return;
    }

    running = true;
    try {
      await new Promise((resolve) => {
        const child = spawn("node", [script, "--force"], {
          cwd: root,
          stdio: "ignore",
        });
        child.on("error", resolve);
        child.on("close", resolve);
      });
    } finally {
      running = false;
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type === "file.edited" || event.type === "file.watcher.updated") {
        await refreshTree();
      }
    },
  };
};
