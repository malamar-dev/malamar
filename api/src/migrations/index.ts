import * as entries from "./entries";
import type { Migration } from "./types";

export const migrations: Migration[] = Object.values(entries);

export type { Migration } from "./types";
