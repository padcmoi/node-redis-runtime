export function normalizeKey(input: unknown) {
  if (typeof input !== "string") return "";
  const value = input.trim();
  if (!value) return "";
  return value.replace(/\s+/g, "_");
}
