import type { LogEntry, Logger } from "../interfaces"
export class InMemoryLogger implements Logger {
  private readonly entries: LogEntry[] = []
  log(entry: Omit<LogEntry, "timestamp">): void { this.entries.push(structuredClone({ ...entry, timestamp: new Date().toISOString() })) }
  list(filters: { projectId?: string; runId?: string } = {}): LogEntry[] { return this.entries.filter((entry) => (!filters.projectId || entry.projectId === filters.projectId) && (!filters.runId || entry.runId === filters.runId)).map((entry) => structuredClone(entry)) }
}
