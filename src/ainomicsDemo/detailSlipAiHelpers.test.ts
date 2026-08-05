import { estimateOvertimeHours, normalizeSlipStatus, needsArboristReview } from "./detailSlipAiHelpers";

describe("detailSlipAiHelpers", () => {
  it("normalizes known statuses", () => {
    expect(normalizeSlipStatus("APPROVED")).toBe("approved");
  });
  it("estimates overtime past 8 hours", () => {
    expect(estimateOvertimeHours("08:00", "18:00")).toBe(2);
  });
  it("flags submitted slips without signature", () => {
    expect(needsArboristReview("submitted", false)).toBe(true);
  });
});
