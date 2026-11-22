import { SchemaConfigurationError } from "./errors.js";

const TYPES = new Set(["string", "number", "integer", "boolean", "array", "object"]);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function config(condition, message) {
  if (!condition) throw new SchemaConfigurationError(message);
}

export function validateSchema(schema, data, options) {
  config(isPlainObject(schema), "Schema must be an object keyed by table name.");
  config(isPlainObject(data), "Seed data must be an object keyed by table name.");
  config(isPlainObject(options), "Options must be an object.");
  if (own(options, "strictFields")) config(typeof options.strictFields === "boolean", "strictFields must be a boolean.");

  for (const [table, tableSchema] of Object.entries(schema)) {
    config(table.length > 0 && isPlainObject(tableSchema), `Schema for table '${table}' must be an object.`);
    config(isPlainObject(tableSchema.fields), `Schema for table '${table}' must define a fields object.`);
    for (const [field, rule] of Object.entries(tableSchema.fields)) {
      config(isPlainObject(rule), `Rule for '${table}.${field}' must be an object.`);
      config(TYPES.has(rule.type), `Unsupported or missing type for '${table}.${field}'. Supported types: ${[...TYPES].join(", ")}.`);
      if (own(rule, "required")) config(typeof rule.required === "boolean", `'${table}.${field}.required' must be a boolean.`);
      if (own(rule, "nullable")) config(typeof rule.nullable === "boolean", `'${table}.${field}.nullable' must be a boolean.`);
      for (const key of ["min", "max", "minLength", "maxLength"]) {
        if (own(rule, key)) config(typeof rule[key] === "number" && Number.isFinite(rule[key]), `'${table}.${field}.${key}' must be a finite number.`);
      }
      if (own(rule, "minLength")) config(rule.minLength >= 0, `'${table}.${field}.minLength' must be non-negative.`);
      if (own(rule, "maxLength")) config(rule.maxLength >= 0, `'${table}.${field}.maxLength' must be non-negative.`);
      if (own(rule, "min") && own(rule, "max")) config(rule.min <= rule.max, `'${table}.${field}.min' cannot exceed max.`);
      if (own(rule, "minLength") && own(rule, "maxLength")) config(rule.minLength <= rule.maxLength, `'${table}.${field}.minLength' cannot exceed maxLength.`);
      if (own(rule, "pattern")) {
        config(typeof rule.pattern === "string" || rule.pattern instanceof RegExp, `'${table}.${field}.pattern' must be a string or RegExp.`);
        try { new RegExp(rule.pattern); } catch { throw new SchemaConfigurationError(`'${table}.${field}.pattern' is not a valid regular expression.`); }
      }
      if (own(rule, "enum")) config(Array.isArray(rule.enum) && rule.enum.length > 0, `'${table}.${field}.enum' must be a non-empty array.`);
      if (own(rule, "validate")) config(typeof rule.validate === "function", `'${table}.${field}.validate' must be a function.`);
    }
    if (own(tableSchema, "unique")) {
      config(Array.isArray(tableSchema.unique), `'${table}.unique' must be an array.`);
      for (const entry of tableSchema.unique) {
        const fields = Array.isArray(entry) ? entry : [entry];
        config(fields.length > 0 && fields.every((f) => typeof f === "string" && own(tableSchema.fields, f)), `Unique constraint in '${table}' must reference declared fields.`);
      }
    }
    if (own(tableSchema, "foreignKeys")) {
      config(Array.isArray(tableSchema.foreignKeys), `'${table}.foreignKeys' must be an array.`);
      for (const fk of tableSchema.foreignKeys) {
        config(isPlainObject(fk) && typeof fk.field === "string" && own(tableSchema.fields, fk.field) && typeof fk.references === "string", `Invalid foreign key configuration in '${table}'.`);
        const match = /^([^.]+)\.([^.]+)$/.exec(fk.references);
        config(match, `Foreign key '${table}.${fk.field}' must reference 'table.field'.`);
        config(own(schema, match[1]), `Foreign key '${table}.${fk.field}' references undefined table '${match[1]}'.`);
        config(own(schema[match[1]].fields ?? {}, match[2]), `Foreign key '${table}.${fk.field}' references undefined field '${fk.references}'.`);
      }
    }
  }
  for (const [table, rows] of Object.entries(data)) {
    config(Array.isArray(rows), `Dataset '${table}' must be an array.`);
    config(own(schema, table), `Seed data includes undeclared table '${table}'.`);
  }
}

export { isPlainObject };
