# seed-integrity-validator

Validate JavaScript seed datasets before passing them to a database or ORM. The package checks fields and relationships in memory; it never connects to a database or changes records.

## Why use it?

Seed scripts can contain missing values, duplicate keys, invalid amounts, or references to records that are not in the same seed batch. This small, database-independent utility checks those conditions together before your insertion code runs.

## Installation

```sh
npm install seed-integrity-validator
```

Requires Node.js 18 or later. The package has no runtime dependencies and uses ES modules.

## Basic usage

```js
import { validateSeedData, formatReport } from "seed-integrity-validator";

const data = { users: [{ id: 1, email: "arnav@example.com" }] };
const schema = {
  users: {
    fields: {
      id: { type: "integer", required: true },
      email: { type: "string", required: true }
    },
    unique: ["id", "email"]
  }
};

const report = validateSeedData(data, schema);
console.log(formatReport(report));
if (!report.ok) throw new Error("Seed data validation failed.");
```

`validateSeedData(data, schema, options?)` is synchronous. It validates all declared tables and returns a report, rather than throwing for invalid records. Invalid configuration throws `SchemaConfigurationError`.

## Schema

The schema is an object keyed by table name. Each table has a `fields` object; every field has one of `string`, `number`, `integer`, `boolean`, `array`, or `object` as its `type`.

`required: true` means the property must exist and must not be `undefined`. `nullable: true` separately allows an explicit `null`. Without `nullable: true`, null is reported as an error. Missing optional values are allowed. No values are coerced or converted.

Numbers must be finite; integers must be safe integers. Arrays are distinct from ordinary objects, and null is not an object.

Field constraints include `min`/`max` for numbers; `minLength`/`maxLength` for strings and arrays; `pattern` (string or RegExp) and `enum` for supported values. Constraints are checked only after a value passes its declared type.

```js
const schema = {
  products: { fields: {
    name: { type: "string", required: true, minLength: 2, maxLength: 80, pattern: /^[\w -]+$/ },
    price: { type: "number", required: true, min: 0, max: 100000 },
    status: { type: "string", enum: ["draft", "active"] },
    tags: { type: "array", minLength: 1, maxLength: 10 }
  } }
};
```

## Unique values

Declare `unique: ["id", "email"]` for individual fields and `unique: [["firstName", "lastName"]]` for a composite key. Duplicate issues include the duplicate record's zero-based index and the first matching index. If any component is null or undefined, that record is skipped for that uniqueness constraint (similar to common SQL unique-index behavior).

## Foreign keys

Use `foreignKeys: [{ field: "userId", references: "users.id" }]`. References are matched by strict JavaScript value equality against the supplied target dataset. All tables are available for checking regardless of declaration order. Nullish foreign-key values are skipped by the relationship check; use `nullable: true` to allow null at the field level. A reference to an undeclared table or field is a schema configuration error.

## Custom rules

`validate(value, record, context)` runs synchronously after the type and built-in constraints pass. Return `true` when valid, or a non-empty string with the reason it is invalid. Any other return value produces a custom-rule configuration-of-result issue. Context contains `table`, `field`, `recordIndex`, and the original `data` object. Exceptions thrown by custom code propagate to the caller.

```js
age: {
  type: "integer",
  validate: (value) => value >= 18 || "Age must be at least 18."
}
```

## Strict fields

Unknown properties are ignored by default. Enable reporting with `validateSeedData(data, schema, { strictFields: true })`.

## Report and error codes

The report contains `ok`, `summary` (`tablesChecked`, `recordsChecked`, `errors`, `warnings`) and `issues`. Issues provide a stable `code`, `severity`, table, optional zero-based `recordIndex`, optional field, plain-language `message`, and optional details. Current codes are `INVALID_RECORD`, `MISSING_REQUIRED_FIELD`, `NULL_NOT_ALLOWED`, `INVALID_TYPE`, `DUPLICATE_VALUE`, `FOREIGN_KEY_VIOLATION`, `UNKNOWN_FIELD`, `MIN_VALUE`, `MAX_VALUE`, `MIN_LENGTH`, `MAX_LENGTH`, `PATTERN_MISMATCH`, `ENUM_VIOLATION`, and `CUSTOM_VALIDATION_FAILED`.

## Prisma-style integration

```js
import { PrismaClient } from "@prisma/client";
import { validateSeedData, formatReport } from "seed-integrity-validator";

const prisma = new PrismaClient();
const seedData = {
  users: [{ id: 1, name: "Arnav", email: "arnav@example.com" }],
  orders: [{ id: 101, userId: 1, amount: 1500 }]
};
const schema = {
  users: { fields: { id: { type: "integer", required: true }, name: { type: "string", required: true }, email: { type: "string", required: true } }, unique: ["id", "email"] },
  orders: { fields: { id: { type: "integer", required: true }, userId: { type: "integer", required: true }, amount: { type: "number", min: 0 } }, unique: ["id"], foreignKeys: [{ field: "userId", references: "users.id" }] }
};

const report = validateSeedData(seedData, schema);
console.log(formatReport(report));
if (!report.ok) throw new Error("Seed data validation failed.");
// Insert only after validation. Database writes are deliberately outside this package.
await prisma.user.createMany({ data: seedData.users });
await prisma.order.createMany({ data: seedData.orders });
await prisma.$disconnect();
```

Prisma is not a dependency of this package. Validation covers only the supplied in-memory data and schema. It cannot discover live database constraints or guarantee that later writes will succeed.

## Development

```sh
npm test
npm run lint
```

Tests use Node's built-in test runner. Examples are in `examples/`.

## Limitations

There is no database connection, SQL, migration management, coercion, asynchronous validation, CLI, or schema introspection. Custom validators are trusted synchronous JavaScript and may throw. Foreign-key checks only see the datasets passed to this call.

## Contributing

Keep the API small, add a focused `node:test` case for behavior changes, and run `npm test` and `npm run lint` before submitting changes.

## License

MIT. See [LICENSE](./LICENSE).
