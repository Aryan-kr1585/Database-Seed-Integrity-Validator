export function checkConstraints(value, rule) {
  const issues = [];
  if (typeof value === "string" || Array.isArray(value)) {
    if (rule.minLength !== undefined && value.length < rule.minLength) issues.push(["MIN_LENGTH", `Must contain at least ${rule.minLength} ${typeof value === "string" ? "characters" : "items"}.`]);
    if (rule.maxLength !== undefined && value.length > rule.maxLength) issues.push(["MAX_LENGTH", `Must contain at most ${rule.maxLength} ${typeof value === "string" ? "characters" : "items"}.`]);
  }
  if (typeof value === "number") {
    if (rule.min !== undefined && value < rule.min) issues.push(["MIN_VALUE", `Must be at least ${rule.min}.`]);
    if (rule.max !== undefined && value > rule.max) issues.push(["MAX_VALUE", `Must be at most ${rule.max}.`]);
  }
  if (rule.pattern !== undefined && typeof value === "string") {
    const pattern = rule.pattern instanceof RegExp ? new RegExp(rule.pattern.source, rule.pattern.flags.replace("g", "").replace("y", "")) : new RegExp(rule.pattern);
    if (!pattern.test(value)) issues.push(["PATTERN_MISMATCH", `Must match pattern ${String(rule.pattern)}.`]);
  }
  if (rule.enum !== undefined && !rule.enum.some((item) => Object.is(item, value))) issues.push(["ENUM_VIOLATION", `Must be one of: ${rule.enum.map(String).join(", ")}.`]);
  return issues;
}
