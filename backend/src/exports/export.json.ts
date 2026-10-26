import type { ProjectExport } from "@smartpathy/shared";

/** AC9.4: indented, with accents kept as they are (JSON.stringify does not escape them). */
export function renderJson(data: ProjectExport): Buffer {
  return Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8");
}
