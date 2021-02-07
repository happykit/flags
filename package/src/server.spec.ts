/**
 * @jest-environment node
 */
import { getFlags } from "./server";
import "@testing-library/jest-dom/extend-expect";

describe("getFlags", () => {
  it("exports a function", () => {
    expect(typeof getFlags).toBe("function");
  });
});
