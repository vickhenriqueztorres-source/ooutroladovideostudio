import type { ProjectState, StateTransition } from "../contracts"
import { projectStates } from "../contracts"
import { InvalidTransitionError } from "../errors"
import type { StateMachine } from "../interfaces"
import { StateTransitionSchema } from "../schemas"

const operational = ["HUMAN_REQUIRED", "BLOCKED", "FAILED", "CANCELLED"] as const
const flow: Partial<Record<ProjectState, readonly ProjectState[]>> = {
  CREATED: ["TOPIC_APPROVED"], TOPIC_APPROVED: ["SCRIPT_APPROVED"], SCRIPT_APPROVED: ["EDIT_BLUEPRINT_APPROVED"],
  EDIT_BLUEPRINT_APPROVED: ["PROMPT_PACK_APPROVED"], PROMPT_PACK_APPROVED: ["PROVIDER_PLAN_APPROVED"],
  PROVIDER_PLAN_APPROVED: ["REFERENCES_APPROVED"], REFERENCES_APPROVED: ["START_FRAMES_APPROVED"], START_FRAMES_APPROVED: ["VIDEO_BATCH_RUNNING"],
  VIDEO_BATCH_RUNNING: ["VIDEO_BATCH_APPROVED"], VIDEO_BATCH_APPROVED: ["AUDIO_APPROVED"],
  AUDIO_APPROVED: ["ASSEMBLY_READY"], ASSEMBLY_READY: ["MASTER_APPROVED"],
  MASTER_APPROVED: ["PACKAGING_READY"], PACKAGING_READY: ["PUBLISHED"],
  HUMAN_REQUIRED: ["CREATED", "TOPIC_APPROVED", "SCRIPT_APPROVED", "EDIT_BLUEPRINT_APPROVED", "PROMPT_PACK_APPROVED", "PROVIDER_PLAN_APPROVED", "REFERENCES_APPROVED", "START_FRAMES_APPROVED", "VIDEO_BATCH_RUNNING", "VIDEO_BATCH_APPROVED", "AUDIO_APPROVED", "ASSEMBLY_READY", "MASTER_APPROVED", "PACKAGING_READY"],
  BLOCKED: ["HUMAN_REQUIRED"],
}

export const allowedTransitions = Object.freeze(Object.fromEntries(projectStates.map((state) => {
  const base = flow[state] ?? []
  return [state, Object.freeze(state === "PUBLISHED" || state === "FAILED" || state === "CANCELLED" ? base : [...base, ...operational.filter((target) => target !== state)])]
})) as Readonly<Record<ProjectState, readonly ProjectState[]>>)

export function canTransition(from: ProjectState, to: ProjectState): boolean { return allowedTransitions[from].includes(to) }
export function validateTransition(from: ProjectState, to: ProjectState): void { if (!canTransition(from, to)) throw new InvalidTransitionError(from, to) }
export function applyTransition(transition: StateTransition): ProjectState { const valid = StateTransitionSchema.parse(transition); validateTransition(valid.from, valid.to); return valid.to }
export class BrechaStateMachine implements StateMachine { canTransition = canTransition; apply = applyTransition }
