import { Hono } from "hono";

import { healthRouter } from "./health";

export const app = new Hono();

app.route("/api/health", healthRouter);
