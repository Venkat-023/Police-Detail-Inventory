import { aiDemo3 } from "./aiModule3";

describe("aiModule3", () => {
  it("scales input", () => {
    expect(aiDemo3(2)).toBe(9);
  });
});
