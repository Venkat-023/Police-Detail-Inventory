import { aiDemo2 } from "./aiModule2";

describe("aiModule2", () => {
  it("scales input", () => {
    expect(aiDemo2(2)).toBe(6);
  });
});
