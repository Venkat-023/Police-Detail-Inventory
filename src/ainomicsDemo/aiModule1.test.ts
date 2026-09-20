import { aiDemo1 } from "./aiModule1";

describe("aiModule1", () => {
  it("scales input", () => {
    expect(aiDemo1(2)).toBe(3);
  });
});
