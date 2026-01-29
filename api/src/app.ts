import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";

import { agentRouter } from "./agent";
import { chatRouter } from "./chat";
import { healthRouter } from "./health";
import { taskRouter } from "./task";
import { workspaceRouter } from "./workspace";

export const app = new Hono();

// API routes (must come first)
app.route("/api/health", healthRouter);
app.route("/api/workspaces", workspaceRouter);
app.route("/api", agentRouter);
app.route("/api", chatRouter);
app.route("/api", taskRouter);

// Static file serving for production (embedded UI)
// Only enabled when ui-dist exists (after build)
const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIST_PATH = join(__dirname, "../ui-dist");

if (existsSync(UI_DIST_PATH)) {
  // MIME type mapping
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
  };

  // Serve static files and SPA fallback
  app.get("*", async (c) => {
    const path = c.req.path;

    // Try to serve the requested file
    const filePath = join(UI_DIST_PATH, path === "/" ? "index.html" : path);

    const file = Bun.file(filePath);
    if (await file.exists()) {
      const ext = filePath.substring(filePath.lastIndexOf("."));
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const content = await file.arrayBuffer();
      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    }

    // SPA fallback: serve index.html for non-file routes
    const indexFile = Bun.file(join(UI_DIST_PATH, "index.html"));
    if (await indexFile.exists()) {
      return c.html(await indexFile.text());
    }

    return c.text("Not Found", 404);
  });
}
