import { Hono } from "hono";

import { healthRouter } from "./health";
import { workspaceRouter } from "./workspace";

export const app = new Hono();

app.route("/api/health", healthRouter);
app.route("/api/workspaces", workspaceRouter);
