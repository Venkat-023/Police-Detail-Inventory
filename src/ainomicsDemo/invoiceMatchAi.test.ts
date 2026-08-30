import { lineAmount, matchInvoiceToSlips, unmatchedTotal } from "./invoiceMatchAi";

describe("invoiceMatchAi", () => {
  it("computes line amount", () => {
    expect(lineAmount({ slipId: "s1", hours: 4, rate: 50 })).toBe(200);
  });
  it("flags unknown slips", () => {
    const r = matchInvoiceToSlips([{ slipId: "x", hours: 1, rate: 10 }], new Set(["s1"]));
    expect(r[0]?.matched).toBe(false);
    expect(unmatchedTotal(r)).toBe(10);
  });
});
