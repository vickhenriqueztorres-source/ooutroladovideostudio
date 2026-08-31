import {describe,expect,it} from "vitest"
import {evaluateScript} from "../core/editorial"
import {productionConstraints} from "./fixtures/editorial-positive"
import {negativeScriptPackage} from "./fixtures/editorial-negative"
describe("fixture editorial negativa",()=>{it("nunca aprova unsupported, loop aberto e budget excedido",()=>{const qc=evaluateScript(negativeScriptPackage(),productionConstraints);expect(qc.decision).not.toBe("SCRIPT_APPROVED");expect(qc.decision).toBe("NEEDS_RESEARCH");expect(qc.findings.map(f=>f.code)).toEqual(expect.arrayContaining(["UNSUPPORTED_USED","LOOP_UNPAID","BUDGET_EXCEEDED"]))})})
