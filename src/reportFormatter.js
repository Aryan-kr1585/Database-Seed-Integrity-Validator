/** Format a validation report for terminal output. */
export function formatReport(report) {
  if (!report || !report.summary || !Array.isArray(report.issues)) throw new TypeError("Expected a validation report returned by validateSeedData().");
  const { summary } = report;
  const lines = [report.ok ? "Seed data validation passed." : "Seed data validation failed.", `${summary.tablesChecked} table(s), ${summary.recordsChecked} record(s), ${summary.errors} error(s), ${summary.warnings} warning(s).`];
  for (const issue of report.issues) {
    lines.push("", `[${issue.code}] ${issue.table}${issue.recordIndex === undefined ? "" : ` record ${issue.recordIndex}`}${issue.field === undefined ? "" : `, field ${issue.field}`}: ${issue.message}`);
  }
  return lines.join("\n");
}
