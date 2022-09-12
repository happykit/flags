/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import { createUseFlags, cache } from "./client";
import * as fetchMock from "fetch-mock-jest";
import { deleteAllCookies } from "../jest/delete-all-cookies";

let useFlags: ReturnType<typeof createUseFlags>;

beforeEach(() => {
  useFlags = createUseFlags({ envKey: "flags_pub_000000" });
  fetchMock.reset();
  deleteAllCookies(window);
  cache.clear();
});

it("exports a useFlags hook", () => {
  expect(typeof useFlags).toBe("function");
});
