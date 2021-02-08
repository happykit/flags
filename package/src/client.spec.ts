/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import "jest-fetch-mock";
import { renderHook } from "@testing-library/react-hooks";
import { useFlags, cacheKey } from "./client";
import { configure, _resetConfig } from "./config";

// const fakeResponseWithoutFlags = {
//   body: JSON.stringify({ flags: {}, visitor: { key: "fake-visitor-key" } }),
//   options: { headers: { "content-type": "application/json" } },
// };

const fakeResponse = {
  body: JSON.stringify({
    flags: { meal: "large" },
    visitor: { key: "fake-visitor-key" },
  }),
  options: { headers: { "content-type": "application/json" } },
};

beforeEach(() => {
  _resetConfig();
  fetchMock.resetMocks();
  window.localStorage.removeItem(cacheKey);
});

describe("exports", () => {
  it("exports a useFlags hook", () => {
    expect(typeof useFlags).toBe("function");
  });
});

describe("with missing config", () => {
  it("it warns", () => {
    const { result } = renderHook(() => useFlags());
    expect(result.error).toEqual(
      Error("@happykit/flags: Missing configuration. Call configure() first.")
    );
  });
});

describe("useFlags", () => {
  it("posts to the flags endpoint", async () => {
    fetchMock.mockOnce(fakeResponse.body, fakeResponse.options);
    configure({ envKey: "flags_pub_000000" });
    expect(localStorage.getItem(cacheKey)).toBeNull();
    expect(document.cookie).toEqual("");
    const { result, waitForNextUpdate } = renderHook(() => useFlags());

    // flags are an empty object until the first response arrives
    expect(result.current).toEqual({
      fetching: true,
      flags: {},
      loadedFlags: undefined,
      settled: false,
      visitorKey: null,
    });

    await waitForNextUpdate();

    expect(result.current).toEqual({
      fetching: false,
      flags: { meal: "large" },
      loadedFlags: { meal: "large" },
      settled: true,
      visitorKey: "fake-visitor-key",
    });

    expect(document.cookie).toEqual("hkvk=fake-visitor-key");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://happykit.dev/api/flags/flags_pub_000000",
      {
        body: JSON.stringify({ visitorKey: null, user: null, traits: null }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );

    expect(localStorage.getItem(cacheKey)).toEqual(
      JSON.stringify({
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: { visitorKey: null, user: null, traits: null },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: { key: "fake-visitor-key" },
          },
        },
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // ensure there are no further updates
    await expect(waitForNextUpdate({ timeout: 500 })).rejects.toThrow(
      "Timed out"
    );
  });
});
