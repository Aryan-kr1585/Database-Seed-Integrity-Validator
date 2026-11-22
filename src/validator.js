import { validateSchema, isPlainObject } from "./schemaValidator.js";
import { matchesType, actualType } from "./typeChecker.js";
import { checkConstraints } from "./constraintChecker.js";
import { checkUnique } from "./uniqueChecker.js";
import { checkForeignKeys } from "./foreignKeyChecker.js";

/** Validate in-memory seed datasets against a schema without changing the data. */
export function validateSeedData(data, schema, options = {}) {
  validateSchema(schema, data, options);
  const issues = [];
  const addIssue = (issue) => issues.push({ severity: "error", ...issue });
  let recordsChecked = 0;

  for (const [table, tableSchema] of Object.entries(schema)) {
    const rows = data[table] ?? [];
    for (let recordIndex = 0; recordIndex < rows.length; recordIndex += 1) {
      recordsChecked += 1;
      const row = rows[recordIndex];
      if (!isPlainObject(row)) {
        addIssue({ code: "INVALID_RECORD", table, recordIndex, message: "Record must be a plain object." });
        continue;
      }
      for (const [field, rule] of Object.entries(tableSchema.fields)) {
        const exists = Object.prototype.hasOwnProperty.call(row, field);
        const value = row[field];
        if (!exists || value === undefined) {
          if (rule.required) addIssue({ code: "MISSING_REQUIRED_FIELD", table, recordIndex, field, message: "Required field is missing." });
          continue;
        }
        if (value === null) {
          if (!rule.nullable) addIssue({ code: "NULL_NOT_ALLOWED", table, recordIndex, field, message: "Field cannot be null." });
          continue;
        }
        if (!matchesType(value, rule.type)) {
          addIssue({ code: "INVALID_TYPE", table, recordIndex, field, message: `Expected ${rule.type}, received ${actualType(value)}.`, details: { expected: rule.type, actual: actualType(value) } });
          continue;
        }
        for (const [code, message] of checkConstraints(value, rule)) addIssue({ code, table, recordIndex, field, message });
        if (rule.validate) {
          const result = rule.validate(value, row, { table, field, recordIndex, data });
          if (result !== true) {
            const message = typeof result === "string" && result.length ? result : result === false ? "Custom validation failed." : "Custom validator must return true or an error message.";
            addIssue({ code: "CUSTOM_VALIDATION_FAILED", table, recordIndex, field, message });
          }
        }
      }
      if (options.strictFields) for (const field of Object.keys(row)) {
        if (!Object.prototype.hasOwnProperty.call(tableSchema.fields, field)) addIssue({ code: "UNKNOWN_FIELD", table, recordIndex, field, message: "Field is not defined in the schema." });
      }
    }
    checkUnique(table, rows, tableSchema, addIssue);
  }
  checkForeignKeys(data, schema, addIssue);
  const errors = issues.filter((issue) => issue.severity === "error").length;
  return { ok: errors === 0, summary: { tablesChecked: Object.keys(schema).length, recordsChecked, errors, warnings: 0 }, issues };
}
