export class BrechaError extends Error { constructor(message: string, readonly code: string, readonly details?: unknown) { super(message); this.name = new.target.name } }
export class DuplicateRecordError extends BrechaError { constructor(id: string) { super(`Record already exists: ${id}`, "DUPLICATE_RECORD") } }
export class RecordNotFoundError extends BrechaError { constructor(id: string) { super(`Record not found: ${id}`, "RECORD_NOT_FOUND") } }
export class SchemaValidationError extends BrechaError { constructor(details: unknown) { super("Schema validation failed", "SCHEMA_VALIDATION", details) } }
export class InvalidTransitionError extends BrechaError { constructor(from: string, to: string) { super(`Invalid state transition: ${from} -> ${to}`, "INVALID_TRANSITION", { from, to }) } }
export class ControlPlaneError extends BrechaError { constructor(message: string, details?: unknown) { super(message, "CONTROL_PLANE_ERROR", details) } }
