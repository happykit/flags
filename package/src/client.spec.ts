/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import "jest-expect-message";
import { renderHook } from "@testing-library/react-hooks";
import { useFlags, cacheKey } from "./client";
import { configure, _resetConfig } from "./config";
import * as fetchMock from "fetch-mock-jest";
import { deleteAllCookies } from "../jest/delete-all-cookies";

beforeEach(() => {
  _resetConfig();
  fetchMock.reset();
  window.localStorage.removeItem(cacheKey);
  deleteAllCookies(window);
});

it("exports a useFlags hook", () => {
  expect(typeof useFlags).toBe("function");
});

it("it warns on missing config", () => {
  const { result } = renderHook(() => useFlags());
  expect(result.error).toEqual(
    Error("@happykit/flags: Missing configuration. Call configure() first.")
  );
});

describe("client-side rendering", () => {
  it("generates a visitorKey when no cookie and no localStorage are set", async () => {
    // mock incoming post request...
    fetchMock.post(
      // ...when it matches this...
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          // there is a visitorKey but we don't know the value as it's generated
          // visitorKey: expect.any(String),
          user: null,
          traits: null,
          static: false,
        },
        matchPartialBody: true,
      },
      // ... and respond with that...
      (url: string, options: RequestInit, request: Request) => {
        // parse visitorKey so we can mirror it back
        const body = JSON.parse(options.body as string);
        const visitorKey = body.visitorKey;
        expect(typeof visitorKey).toBe("string");

        return {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          visitor: { key: visitorKey },
        };
      }
    );

    configure({ envKey: "flags_pub_000000" });
    expect(localStorage.getItem(cacheKey)).toBeNull();
    expect(document.cookie).toEqual("");

    const { result, waitForNextUpdate } = renderHook(() => useFlags());

    // flags are an empty object (defaultFlags) until the first response arrives
    expect(result.all).toEqual([
      {
        flags: {},
        loadedFlags: null,
        fetching: false,
        settled: false,
        visitorKey: null,
      },
      {
        flags: {},
        loadedFlags: null,
        fetching: true,
        settled: false,
        visitorKey: expect.any(String),
      },
    ]);

    await waitForNextUpdate();

    expect(result.current).toEqual({
      fetching: false,
      flags: {
        ads: true,
        checkout: "medium",
        discount: 5,
        purchaseButtonLabel: "Purchase",
      },
      loadedFlags: {
        ads: true,
        checkout: "medium",
        discount: 5,
        purchaseButtonLabel: "Purchase",
      },
      settled: true,
      visitorKey: expect.any(String),
    });

    expect(result.all).toHaveLength(3);
  });
});

describe("server-side rendering (hybrid)", () => {});

describe("static site generation (hybrid)", () => {
  //   it("posts to the flags endpoint", async () => {
  //     fetchMock.mockOnce(
  //       anonymousEvaluationResponse.body,
  //       anonymousEvaluationResponse.options
  //     );
  //     configure({ envKey: "flags_pub_000000" });
  //     expect(localStorage.getItem(cacheKey)).toBeNull();
  //     expect(document.cookie).toEqual("");
  //     const { result, waitForNextUpdate } = renderHook(() => useFlags());
  //     // flags are an empty object (defaultFlags) until the first response arrives
  //     expect(result.current).toEqual({
  //       fetching: true,
  //       flags: {},
  //       // loadedFlags are undefined as no flags were loaded
  //       loadedFlags: undefined,
  //       settled: false,
  //       visitorKey: null,
  //     });
  //     await waitForNextUpdate();
  //     // TODO the worker never sets cookies now, so the client has to deal
  //     // with generating a visitor key and storing it as a cookie
  //     //
  //     // we need this to work nicely with ssr and ssg, so the expected behaviour
  //     // of useFlags depends on which initial state is passed in
  //     //
  //     // rendered with ssr? => server should have generated visitorKey if not present, and it should be set in response
  //     // rendered with ssg? => server sets visitorKey: null in request, and useFlags needs to reevaluate the flags after the initial render
  //     expect(result.current).toEqual({
  //       fetching: false,
  //       flags: { meal: "large" },
  //       loadedFlags: { meal: "large" },
  //       settled: false,
  //       visitorKey: null,
  //     });
  //     expect(document.cookie).toEqual("");
  //     // await waitForNextUpdate();
  //     // expect(result.current).toEqual({
  //     //   fetching: false,
  //     //   flags: { meal: "large" },
  //     //   loadedFlags: { meal: "large" },
  //     //   settled: false,
  //     //   visitorKey: null,
  //     // });
  //     // // expect(document.cookie).toEqual("hkvk=fake-visitor-key");
  //     // expect(fetchMock).toHaveBeenCalledWith(
  //     //   "https://happykit.dev/api/flags/flags_pub_000000",
  //     //   {
  //     //     body: JSON.stringify({ visitorKey: null, user: null, traits: null }),
  //     //     headers: { "content-type": "application/json" },
  //     //     method: "POST",
  //     //   }
  //     // );
  //     // expect(localStorage.getItem(cacheKey)).toEqual(
  //     //   JSON.stringify({
  //     //     input: {
  //     //       endpoint: "https://happykit.dev/api/flags",
  //     //       envKey: "flags_pub_000000",
  //     //       requestBody: { visitorKey: null, user: null, traits: null },
  //     //     },
  //     //     outcome: {
  //     //       responseBody: {
  //     //         flags: { meal: "large" },
  //     //         visitor: null,
  //     //       },
  //     //     },
  //     //   })
  //     // );
  //     // expect(fetchMock).toHaveBeenCalledTimes(1);
  //     // // ensure there are no further updates
  //     // await expect(waitForNextUpdate({ timeout: 500 })).rejects.toThrow(
  //     //   "Timed out"
  //     // );
  //   });
});
