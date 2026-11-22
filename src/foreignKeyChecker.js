export function checkForeignKeys(data, schema, addIssue) {
  for (const [table, tableSchema] of Object.entries(schema)) {
    const rows = data[table] ?? [];
    for (const fk of tableSchema.foreignKeys ?? []) {
      const [targetTable, targetField] = fk.references.split(".");
      const targets = new Set((data[targetTable] ?? []).filter((row) => row !== null && typeof row === "object").map((row) => row[targetField]).filter((value) => value !== null && value !== undefined));
      rows.forEach((row, recordIndex) => {
        if (row === null || typeof row !== "object" || Array.isArray(row)) return;
        const value = row[fk.field];
        if (value === null || value === undefined) return;
        if (!targets.has(value)) addIssue({ code: "FOREIGN_KEY_VIOLATION", table, recordIndex, field: fk.field, message: `Referenced record ${fk.references} was not found.`, details: { value, references: fk.references } });
      });
    }
  }
}
