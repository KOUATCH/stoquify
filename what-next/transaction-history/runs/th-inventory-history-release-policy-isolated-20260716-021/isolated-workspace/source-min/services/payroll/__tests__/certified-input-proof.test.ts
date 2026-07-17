import { BusinessRuleError } from "@/services/_shared/action-errors";
import {
  assertPayrollCertifiedInputProofMetadata,
  payrollCertifiedInputProofFromMetadata,
} from "@/services/payroll/certified-input-proof";

describe("certified payroll input proof", () => {
  const proofMetadata = {
    hrisPayrollReadinessHash: "hris-readiness-hash",
    payrollInputReadinessHash: "payroll-readiness-hash",
    payrollEngineInputHashes: [
      "engine-hash-b",
      "engine-hash-a",
      "engine-hash-a",
    ],
    payrollEngineInputSnapshotHash: "engine-snapshot-hash",
  };

  it("returns a deterministic aggregate proof without person-level data", () => {
    expect(
      payrollCertifiedInputProofFromMetadata({
        ...proofMetadata,
        employeeId: "employee-private",
        salaryAmount: "900000",
      }),
    ).toEqual({
      hrisPayrollReadinessHash: "hris-readiness-hash",
      payrollInputReadinessHash: "payroll-readiness-hash",
      payrollEngineInputHashes: ["engine-hash-a", "engine-hash-b"],
      payrollEngineInputSnapshotHash: "engine-snapshot-hash",
    });
  });

  it.each([
    "hrisPayrollReadinessHash",
    "payrollInputReadinessHash",
    "payrollEngineInputHashes",
    "payrollEngineInputSnapshotHash",
  ])("rejects proof missing %s", (field) => {
    const metadata = {
      ...proofMetadata,
      [field]: field === "payrollEngineInputHashes" ? [] : "",
    };

    expect(payrollCertifiedInputProofFromMetadata(metadata)).toBeNull();
    expect(() => assertPayrollCertifiedInputProofMetadata(metadata)).toThrow(
      BusinessRuleError,
    );
  });
});
