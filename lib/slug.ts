import crypto from "crypto";

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const code = crypto.randomBytes(2).toString("hex");
  return `${base || "item"}-${code}`;
}
