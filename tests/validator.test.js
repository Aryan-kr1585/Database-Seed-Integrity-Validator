import test from "node:test";
import assert from "node:assert/strict";
import { validateSeedData, formatReport, SchemaConfigurationError } from "../src/index.js";

const schema = { users: { fields: { id: { type: "integer", required: true }, email: { type: "string", required: true }, age: { type: "integer", nullable: true, min: 0 } }, unique: ["id", "email"] } };
const codes = (data, sch = schema, options) => validateSeedData(data, sch, options).issues.map((issue) => issue.code);

test("accepts valid required fields and valid strings", () => assert.equal(validateSeedData({ users: [{ id: 1, email: "a@b.test" }] }, schema).ok, true));
test("reports missing required field", () => assert.ok(codes({ users: [{ id: 1 }] }).includes("MISSING_REQUIRED_FIELD")));
test("reports undefined required field", () => assert.ok(codes({ users: [{ id: 1, email: undefined }] }).includes("MISSING_REQUIRED_FIELD")));
test("allows nullable null", () => assert.equal(validateSeedData({ users: [{ id: 1, email: "a", age: null }] }, schema).ok, true));
test("rejects null when nullable is false", () => assert.ok(codes({ users: [{ id: 1, email: null }] }).includes("NULL_NOT_ALLOWED")));
test("validates string type", () => assert.ok(codes({ users: [{ id: 1, email: 4 }] }).includes("INVALID_TYPE")));
test("validates integer type", () => assert.ok(codes({ users: [{ id: 1.1, email: "a" }] }).includes("INVALID_TYPE")));
test("rejects NaN as number", () => assert.ok(codes({ users: [{ id: 1, email: "a", age: NaN }] }).includes("INVALID_TYPE")));
test("rejects infinity as number", () => assert.ok(codes({ users: [{ id: 1, email: "a", age: Infinity }] }).includes("INVALID_TYPE")));
test("distinguishes arrays and objects", () => {
  const s = { t: { fields: { a: { type: "array" }, o: { type: "object" } } } };
  assert.equal(validateSeedData({ t: [{ a: [], o: {} }] }, s).ok, true);
  assert.ok(codes({ t: [{ a: {}, o: [] }] }, s).filter((x) => x === "INVALID_TYPE").length === 2);
});
test("rejects null as object", () => assert.ok(codes({ t: [{ a: null }] }, { t: { fields: { a: { type: "object" } } } }).includes("NULL_NOT_ALLOWED")));
test("accepts unique values", () => assert.equal(validateSeedData({ users: [{ id: 1, email: "a" }, { id: 2, email: "b" }] }, schema).ok, true));
test("detects duplicate IDs", () => assert.ok(codes({ users: [{ id: 1, email: "a" }, { id: 1, email: "b" }] }).includes("DUPLICATE_VALUE")));
test("detects duplicate emails", () => assert.ok(codes({ users: [{ id: 1, email: "a" }, { id: 2, email: "a" }] }).includes("DUPLICATE_VALUE")));
test("detects composite duplicates", () => {
  const s = { t: { fields: { a: { type: "string" }, b: { type: "string" } }, unique: [["a", "b"]] } };
  assert.ok(codes({ t: [{ a: "x", b: "y" }, { a: "x", b: "y" }] }, s).includes("DUPLICATE_VALUE"));
});
test("reports duplicate record index information", () => {
  const report = validateSeedData({ users: [{ id: 1, email: "a" }, { id: 1, email: "b" }] }, schema);
  assert.equal(report.issues.find((i) => i.code === "DUPLICATE_VALUE").details.firstRecordIndex, 0);
});
test("nullish values do not collide for unique checks", () => assert.equal(validateSeedData({ users: [{ id: 1, email: "a" }, { id: 2, email: "b", age: null }, { id: 3, email: "c", age: null }] }, schema).ok, true));
test("validates foreign keys", () => {
  const s = { child: { fields: { parentId: { type: "integer" } }, foreignKeys: [{ field: "parentId", references: "parent.id" }] }, parent: { fields: { id: { type: "integer" } } } };
  assert.equal(validateSeedData({ child: [{ parentId: 1 }], parent: [{ id: 1 }] }, s).ok, true);
});
test("reports missing foreign-key targets", () => {
  const s = { child: { fields: { pid: { type: "integer" } }, foreignKeys: [{ field: "pid", references: "parent.id" }] }, parent: { fields: { id: { type: "integer" } } } };
  assert.ok(codes({ child: [{ pid: 7 }], parent: [] }, s).includes("FOREIGN_KEY_VIOLATION"));
});
test("rejects foreign key to undeclared table", () => assert.throws(() => validateSeedData({ a: [] }, { a: { fields: { id: { type: "integer" } }, foreignKeys: [{ field: "id", references: "b.id" }] } }), SchemaConfigurationError));
test("rejects foreign key to undeclared field", () => assert.throws(() => validateSeedData({ a: [], b: [] }, { a: { fields: { id: { type: "integer" } }, foreignKeys: [{ field: "id", references: "b.nope" }] }, b: { fields: { id: { type: "integer" } } } }), SchemaConfigurationError));
test("validates multiple foreign keys", () => {
  const s = { links: { fields: { a: { type: "integer" }, b: { type: "integer" } }, foreignKeys: [{ field: "a", references: "one.id" }, { field: "b", references: "two.id" }] }, one: { fields: { id: { type: "integer" } } }, two: { fields: { id: { type: "integer" } } } };
  assert.equal(codes({ links: [{ a: 1, b: 2 }], one: [{ id: 1 }], two: [] }, s).filter((x) => x === "FOREIGN_KEY_VIOLATION").length, 1);
});
test("permits nullable foreign key value", () => {
  const s = { a: { fields: { id: { type: "integer", nullable: true } }, foreignKeys: [{ field: "id", references: "b.id" }] }, b: { fields: { id: { type: "integer" } } } };
  assert.equal(validateSeedData({ a: [{ id: null }], b: [] }, s).ok, true);
});
test("checks numeric constraints", () => assert.ok(codes({ users: [{ id: 1, email: "a", age: -1 }] }).includes("MIN_VALUE")));
test("checks string length", () => assert.ok(codes({ t: [{ x: "a" }] }, { t: { fields: { x: { type: "string", minLength: 2 } } } }).includes("MIN_LENGTH")));
test("checks regex patterns", () => assert.ok(codes({ t: [{ x: "bad" }] }, { t: { fields: { x: { type: "string", pattern: "^ok$" } } } }).includes("PATTERN_MISMATCH")));
test("checks enum values", () => assert.ok(codes({ t: [{ x: "z" }] }, { t: { fields: { x: { type: "string", enum: ["a", "b"] } } } }).includes("ENUM_VIOLATION")));
test("runs custom rules with record context", () => {
  const s = { t: { fields: { age: { type: "integer", validate: (v, row) => v >= row.minimum || "Too young." } } } };
  const report = validateSeedData({ t: [{ age: 16, minimum: 18 }] }, s);
  assert.equal(report.issues[0].message, "Too young.");
});
test("rejects invalid custom-rule return types", () => assert.ok(codes({ t: [{ x: 1 }] }, { t: { fields: { x: { type: "integer", validate: () => undefined } } } }).includes("CUSTOM_VALIDATION_FAILED")));
test("strict mode reports unknown fields", () => assert.ok(codes({ users: [{ id: 1, email: "a", extra: true }] }, schema, { strictFields: true }).includes("UNKNOWN_FIELD")));
test("non-strict mode ignores unknown fields", () => assert.equal(validateSeedData({ users: [{ id: 1, email: "a", extra: true }] }, schema).ok, true));
test("handles empty datasets and missing declared datasets", () => assert.equal(validateSeedData({}, { users: { fields: { id: { type: "integer" } } } }).ok, true));
test("rejects malformed datasets and schemas", () => {
  assert.throws(() => validateSeedData({ users: {} }, schema), SchemaConfigurationError);
  assert.throws(() => validateSeedData({}, { users: { fields: { id: { type: "wat" } } } }), SchemaConfigurationError);
});
test("collects multiple issues, computes summary, and formats report", () => {
  const report = validateSeedData({ users: [{ id: "bad", email: null }] }, schema);
  assert.equal(report.summary.recordsChecked, 1);
  assert.equal(report.summary.errors, 2);
  assert.equal(report.ok, false);
  assert.match(formatReport(report), /Seed data validation failed/);
});
test("does not mutate input data", () => {
  const data = { users: [{ id: 1, email: "a" }] };
  const before = structuredClone(data);
  validateSeedData(data, schema);
  assert.deepEqual(data, before);
});
