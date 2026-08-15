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
