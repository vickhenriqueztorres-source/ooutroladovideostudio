import type { AgentResult, AgentTask, CheckpointRecord, ProjectState, RegistryRecord, StateTransition } from "../contracts"

export interface Agent { readonly id: string; execute(task: AgentTask): Promise<AgentResult> }
export interface RuntimeAdapter { readonly id: string; dispatch(agent: Agent, task: AgentTask): Promise<AgentResult> }
export interface ProviderAdapter { readonly id: string; supports(capability: string): boolean; invoke(input: unknown): Promise<unknown> }
export interface Registry<T extends RegistryRecord> { create(record: T): T; update(id: string, patch: Partial<T>): T; getById(id: string): T; listByProject(projectId: string): T[] }
export interface CheckpointStore { create(record: CheckpointRecord): CheckpointRecord; update(id: string, patch: Partial<CheckpointRecord>): CheckpointRecord; getById(id: string): CheckpointRecord; listByRun(runId: string): CheckpointRecord[] }
export interface StateMachine { canTransition(from: ProjectState, to: ProjectState): boolean; apply(transition: StateTransition): ProjectState }
export interface LogEntry { timestamp: string; level: "info" | "warn" | "error"; event: string; projectId: string; runId: string | null; data?: unknown }
export interface Logger { log(entry: Omit<LogEntry, "timestamp">): void }
