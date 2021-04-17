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
import { nanoid } from "nanoid";
import { FlagBag } from "./types";

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
  describe("when no cookie and no localStorage are set", () => {
    it("generates a visitor key", async () => {
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

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

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
        {
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
          fetching: false,
          settled: true,
          visitorKey: expect.any(String),
        },
      ]);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key may not change"
      ).toEqual((result.all[2] as FlagBag<any>).visitorKey);
    });
  });

  describe("when set in cookie, and no localStorage is set", () => {
    it("reuses the visitor key", async () => {
      // prepare cookie before test
      const visitorKeyInCookie = nanoid();
      document.cookie = `hkvk=${visitorKeyInCookie}`;

      // prepare response before test
      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            visitorKey: visitorKeyInCookie,
            user: null,
            traits: null,
            static: false,
          },
          matchPartialBody: true,
        },
        {
          headers: { "content-type": "application/json" },
          body: {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: { key: visitorKeyInCookie },
          },
        }
      );

      configure({ envKey: "flags_pub_000000" });
      expect(localStorage.getItem(cacheKey)).toBeNull();
      expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

      // start actual testing
      const { result, waitForNextUpdate } = renderHook(() => useFlags());

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

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
          visitorKey: visitorKeyInCookie,
        },
        {
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
          visitorKey: visitorKeyInCookie,
        },
      ]);
    });
  });

  describe("when no cookie, but localStorage is set", () => {
    it("ignores the localStorage", async () => {
      // prepare localStorage with the same endpoint + envKey
      const visitorKeyInLocalStorage = nanoid();
      localStorage.setItem(
        "happykit_flags_cache_v1",
        JSON.stringify({
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              visitorKey: visitorKeyInLocalStorage,
              user: null,
              traits: null,
              static: false,
            },
          },
          outcome: {
            responseBody: {
              flags: {
                ads: true,
                checkout: "medium",
                discount: 5,
                purchaseButtonLabel: "Buy now",
              },
              visitor: { key: visitorKeyInLocalStorage },
            },
          },
        })
      );

      // but there is no visitorKey cookie, so the localStorage can't be used
      expect(document.cookie).toBe("");

      fetchMock.post(
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
        (url: string, options: RequestInit, request: Request) => {
          // parse visitorKey so we can mirror it back
          const body = JSON.parse(options.body as string);
          const visitorKey = body.visitorKey;
          expect(typeof visitorKey).toBe("string");

          expect(
            visitorKey,
            "cache in localStorage and its visitorKey should be ignored, as no matching visitorKey in the cookies existed"
          ).not.toBe(visitorKeyInLocalStorage);

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
      // expect(localStorage.getItem(cacheKey)).toBeNull();
      expect(document.cookie).toEqual("");

      const { result, waitForNextUpdate } = renderHook(() => useFlags());

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

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
        {
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
          fetching: false,
          settled: true,
          visitorKey: expect.any(String),
        },
      ]);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key must stay consistent between renders"
      ).toEqual((result.all[2] as FlagBag<any>).visitorKey);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key should not be reused from original localStorage"
      ).not.toEqual(visitorKeyInLocalStorage);
    });
  });

  describe("when cookie and localStorage are set but the visitorKey does not match", () => {
    it("ignores the localStorage", async () => {
      // prepare localStorage and cookie, but use a different visitorKey for each
      const visitorKeyInCookie = nanoid();
      document.cookie = `hkvk=${visitorKeyInCookie}`;

      const visitorKeyInLocalStorage = nanoid();
      localStorage.setItem(
        "happykit_flags_cache_v1",
        JSON.stringify({
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              visitorKey: visitorKeyInLocalStorage,
              user: null,
              traits: null,
              static: false,
            },
          },
          outcome: {
            responseBody: {
              flags: {
                ads: true,
                checkout: "medium",
                discount: 5,
                purchaseButtonLabel: "Buy now",
              },
              visitor: { key: visitorKeyInLocalStorage },
            },
          },
        })
      );

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            static: false,
            traits: null,
            user: null,
            visitorKey: visitorKeyInCookie,
          },
        },
        {
          headers: { "content-type": "application/json" },
          body: {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: { key: visitorKeyInCookie },
          },
        }
      );

      configure({ envKey: "flags_pub_000000" });
      expect(localStorage.getItem(cacheKey)).not.toBeNull();
      expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

      const { result, waitForNextUpdate } = renderHook(() => useFlags());

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

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
          visitorKey: visitorKeyInCookie,
        },
        {
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
          fetching: false,
          settled: true,
          visitorKey: visitorKeyInCookie,
        },
      ]);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key must stay consistent between renders"
      ).toEqual((result.all[2] as FlagBag<any>).visitorKey);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key should not be reused from original localStorage"
      ).not.toEqual(visitorKeyInLocalStorage);
    });
  });

  describe("when cookie and localStorage are set and they match", () => {
    it("uses the localStorage", async () => {
      // prepare localStorage and cookie, but use a different visitorKey for each
      const generatedVisitorKey = nanoid();
      document.cookie = `hkvk=${generatedVisitorKey}`;

      localStorage.setItem(
        "happykit_flags_cache_v1",
        JSON.stringify({
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              visitorKey: generatedVisitorKey,
              user: null,
              traits: null,
              static: false,
            },
          },
          outcome: {
            responseBody: {
              flags: {
                ads: true,
                checkout: "medium",
                discount: 5,
                // purchaseButtonLabel: "Buy now",
              },
              visitor: { key: generatedVisitorKey },
            },
          },
        })
      );

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            static: false,
            traits: null,
            user: null,
            visitorKey: generatedVisitorKey,
          },
        },
        {
          headers: { "content-type": "application/json" },
          body: {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: { key: generatedVisitorKey },
          },
        }
      );

      configure({ envKey: "flags_pub_000000" });
      expect(localStorage.getItem(cacheKey)).not.toBeNull();
      expect(document.cookie).toEqual(`hkvk=${generatedVisitorKey}`);

      const { result, waitForNextUpdate } = renderHook(() => useFlags());

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

      expect(result.all).toEqual([
        {
          flags: {},
          loadedFlags: null,
          fetching: false,
          settled: false,
          visitorKey: null,
        },
        // prefilled from localStorage
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            // purchaseButtonLabel: "Buy now",
          },
          loadedFlags: null,
          fetching: true,
          settled: false,
          visitorKey: generatedVisitorKey,
        },
        {
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
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
        },
      ]);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key must stay consistent between renders"
      ).toEqual((result.all[2] as FlagBag<any>).visitorKey);
    });
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
