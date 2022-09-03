/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import { renderHook } from "@testing-library/react-hooks";
import { useFlags, cache } from "./client";
import { _resetConfig } from "./config";
import * as fetchMock from "fetch-mock-jest";
import { deleteAllCookies } from "../jest/delete-all-cookies";

beforeEach(() => {
  _resetConfig();
  fetchMock.reset();
  deleteAllCookies(window);
  cache.clear();
});

it("exports a useFlags hook", () => {
  expect(typeof useFlags).toBe("function");
});

// skipped since it didn't work after upgrading to react 18
// it failed since @testing-library/react-hooks is not compatible with react@18
it.skip("it warns on missing config", () => {
  const { result } = renderHook(() => useFlags());

  expect(result.current).toThrow(
    Error("@happykit/flags: Missing configuration. Call configure() first.")
  );
});
