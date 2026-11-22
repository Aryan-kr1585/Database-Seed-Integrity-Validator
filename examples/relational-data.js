import { validateSeedData, formatReport } from "../src/index.js";

const seedData = {
  users: [{ id: 1, name: "Arnav", email: "arnav@example.com" }],
  orders: [{ id: 101, userId: 1, amount: 1500 }]
};
const schema = {
  users: { fields: { id: { type: "integer", required: true }, name: { type: "string", required: true }, email: { type: "string", required: true } }, unique: ["id", "email"] },
  orders: { fields: { id: { type: "integer", required: true }, userId: { type: "integer", required: true }, amount: { type: "number", required: true, min: 0 } }, unique: ["id"], foreignKeys: [{ field: "userId", references: "users.id" }] }
};
console.log(formatReport(validateSeedData(seedData, schema)));
