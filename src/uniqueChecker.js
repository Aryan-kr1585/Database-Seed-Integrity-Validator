export function checkUnique(table, rows, schema, addIssue) {
  for (const constraint of schema.unique ?? []) {
    const fields = Array.isArray(constraint) ? constraint : [constraint];
    const seen = new Map();
    rows.forEach((row, recordIndex) => {
      if (row === null || typeof row !== "object" || Array.isArray(row)) return;
      const values = fields.map((field) => row[field]);
      // Any nullish component opts out, matching common SQL unique-index behavior.
      if (values.some((value) => value === null || value === undefined)) return;
      const key = JSON.stringify(values);
      if (seen.has(key)) {
        addIssue({ code: "DUPLICATE_VALUE", table, recordIndex, field: fields.length === 1 ? fields[0] : fields.join(", "), message: `Value for unique constraint (${fields.join(", ")}) duplicates record ${seen.get(key)}.`, details: { fields, firstRecordIndex: seen.get(key) } });
      } else seen.set(key, recordIndex);
    });
  }
}
