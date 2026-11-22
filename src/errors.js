/** Error raised when a schema or validation configuration is invalid. */
export class SchemaConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SchemaConfigurationError";
  }
}
