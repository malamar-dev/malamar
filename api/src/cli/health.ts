import type { CliHealthResult, CliType } from "./types";

const healthStore = new Map<CliType, CliHealthResult>();

export function getCliHealth(type: CliType): CliHealthResult | undefined {
  return healthStore.get(type);
}

export function getAllCliHealth(): CliHealthResult[] {
  return Array.from(healthStore.values());
}

export function setCliHealth(result: CliHealthResult): void {
  healthStore.set(result.type, result);
}
