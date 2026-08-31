import { describe, expect, it } from "vitest"
import { applyTransition, canTransition } from "../core/state-machine"
import { governance } from "../core/contracts"
import { InvalidTransitionError } from "../core/errors"
const transition = (from: "CREATED", to: "TOPIC_APPROVED" | "PUBLISHED") => ({ id: "transition-1", ...governance({ projectId: "p", runId: "r" }), from, to, reason: "test" })
describe("global state machine", () => {
  it("applies a valid transition without mutating input", () => { const input = transition("CREATED", "TOPIC_APPROVED"); const copy = structuredClone(input); expect(applyTransition(input)).toBe("TOPIC_APPROVED"); expect(input).toEqual(copy) })
  it("rejects invalid transitions", () => expect(() => applyTransition(transition("CREATED", "PUBLISHED"))).toThrow(InvalidTransitionError))
  it("exposes transition checks", () => { expect(canTransition("PACKAGING_READY", "PUBLISHED")).toBe(true); expect(canTransition("PUBLISHED", "CREATED")).toBe(false) })
})
