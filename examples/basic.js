import { validateSeedData, formatReport } from "../src/index.js";

const seedData = { users: [{ id: 1, name: "Arnav", email: "arnav@example.com" }] };
const schema = { users: { fields: { id: { type: "integer", required: true }, name: { type: "string", required: true, minLength: 2 }, email: { type: "string", required: true } }, unique: ["id", "email"] } };

const report = validateSeedData(seedData, schema);
console.log(formatReport(report));
