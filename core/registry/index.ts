import type { ArtifactRecord, CheckpointRecord, ProjectRecord, RegistryRecord, RunRecord } from "../contracts"
import { DuplicateRecordError, RecordNotFoundError, SchemaValidationError } from "../errors"
import type { Registry } from "../interfaces"
import { ArtifactRecordSchema, CheckpointRecordSchema, ProjectRecordSchema, RunRecordSchema } from "../schemas"
import type { ZodType } from "zod"

const clone = <T>(value: T): T => structuredClone(value)
export class InMemoryRegistry<T extends RegistryRecord> implements Registry<T> {
  private readonly records = new Map<string, T>()
  constructor(private readonly schema: ZodType<T>) {}
  create(record: T): T { if (this.records.has(record.id)) throw new DuplicateRecordError(record.id); const valid = this.parse(record); this.records.set(valid.id, clone(valid)); return clone(valid) }
  update(id: string, patch: Partial<T>): T { const current = this.getById(id); const valid = this.parse({ ...current, ...patch, id, updatedAt: new Date().toISOString() }); this.records.set(id, clone(valid)); return clone(valid) }
  getById(id: string): T { const value = this.records.get(id); if (!value) throw new RecordNotFoundError(id); return clone(value) }
  listByProject(projectId: string): T[] { return this.listAll().filter((item) => item.projectId === projectId) }
  listAll(): T[] { return [...this.records.values()].map(clone) }
  private parse(value: unknown): T { const result = this.schema.safeParse(value); if (!result.success) throw new SchemaValidationError(result.error.issues); return result.data }
}
export class ProjectRegistry extends InMemoryRegistry<ProjectRecord> { constructor() { super(ProjectRecordSchema) } }
export class RunRegistry extends InMemoryRegistry<RunRecord> { constructor() { super(RunRecordSchema) } }
export class ArtifactRegistry extends InMemoryRegistry<ArtifactRecord> { constructor() { super(ArtifactRecordSchema) } }
export class CheckpointRegistry extends InMemoryRegistry<CheckpointRecord> { constructor() { super(CheckpointRecordSchema) } }
