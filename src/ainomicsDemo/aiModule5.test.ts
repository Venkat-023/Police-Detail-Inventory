import { aiDemo5 } from "./aiModule5";

describe("aiModule5", () => {
  it("scales input", () => {
    expect(aiDemo5(2)).toBe(15);
  });
});
