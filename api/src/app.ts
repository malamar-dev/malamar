import { Hono } from "hono";

import { agentRouter } from "./agent";
import { chatRouter } from "./chat";
import { healthRouter } from "./health";
import { taskRouter } from "./task";
import { workspaceRouter } from "./workspace";

export const app = new Hono();

app.route("/api/health", healthRouter);
app.route("/api/workspaces", workspaceRouter);
app.route("/api", agentRouter);
app.route("/api", chatRouter);
app.route("/api", taskRouter);
