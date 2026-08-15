import fs from "node:fs";
import path from "node:path";
import type { HonestyFile, RawTemplatesFile, TemplatesFile } from "./types";

const DATA = path.join(process.cwd(), "data");

function load<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8")) as T;
}

export function loadRawTemplates(): RawTemplatesFile {
  return load<RawTemplatesFile>("raw-templates.json");
}

export function loadLabels(): TemplatesFile {
  return load<TemplatesFile>("templates.json");
}

export function loadHonesty(): HonestyFile {
  return load<HonestyFile>("honesty.json");
}

export interface BoroughsRawFile {
  pulledAt: string;
  since: string;
  types: { complaint_type: string; rows: { borough: string; text: string; n: number }[]; receiptUrl: string }[];
}

/** Borough drill-down data is optional — null until `npm run boroughs` has run. */
export function loadBoroughs(): BoroughsRawFile | null {
  try {
    return load<BoroughsRawFile>("boroughs-raw.json");
  } catch {
    return null;
  }
}

export interface BoomerangFile {
  builtAt: string;
  complaint_type: string;
  cohort: { start: string; end: string; windowDays: number };
  receiptUrl: string;
  buckets: Record<string, { n: number; refiled: number; rate: number; medianDaysToClose: number | null }>;
}

export function loadBoomerang(): BoomerangFile | null {
  try {
    return load<BoomerangFile>("boomerang.json");
  } catch {
    return null;
  }
}

export interface AgenciesRawFile {
  pulledAt: string;
  since: string;
  receiptUrl: string;
  rows: { agency: string; text: string; n: number }[];
}

export function loadAgencies(): AgenciesRawFile | null {
  try {
    return load<AgenciesRawFile>("agencies-raw.json");
  } catch {
    return null;
  }
}

export interface WorstBuildingsFile {
  builtAt: string;
  since: string;
  types: string[];
  receiptUrl: string;
  buildings: { address: string; borough: string; noAccess: number }[];
}

export function loadWorstBuildings(): WorstBuildingsFile | null {
  try {
    return load<WorstBuildingsFile>("worst-buildings.json");
  } catch {
    return null;
  }
}
