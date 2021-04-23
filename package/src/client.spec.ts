/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import "jest-expect-message";
import { renderHook } from "@testing-library/react-hooks";
import { useFlags, cache, UseFlagsOptions } from "./client";
import { configure, _resetConfig } from "./config";
import * as fetchMock from "fetch-mock-jest";
import { deleteAllCookies } from "../jest/delete-all-cookies";
import { nanoid } from "nanoid";
import { FlagBag, Flags, InitialFlagState } from "./types";

beforeEach(() => {
  _resetConfig();
  fetchMock.reset();
  deleteAllCookies(window);
  cache.clear();
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
  describe("when cookie is not set", () => {
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
      expect(document.cookie).toEqual("");

      const { result, waitForNextUpdate } = renderHook(() => useFlags());

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

      expect(result.all).toEqual([
        {
          flags: null,
          rawFlags: null,
          fetching: false,
          settled: false,
          visitorKey: null,
        },
        {
          flags: null,
          rawFlags: null,
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
          rawFlags: {
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

  describe("when cookie is set", () => {
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
      expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

      // start actual testing
      const { result, waitForNextUpdate } = renderHook(() => useFlags());

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

      expect(result.all).toEqual([
        {
          flags: null,
          rawFlags: null,
          fetching: false,
          settled: false,
          visitorKey: null,
        },
        {
          flags: null,
          rawFlags: null,
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
          rawFlags: {
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
});

describe("server-side rendering (hybrid)", () => {
  describe("when visitorKey is not set in cookie", () => {
    it("uses the visitor key generated on the server", async () => {
      expect(document.cookie).toBe("");
      const generatedVisitorKey = nanoid();

      configure({ envKey: "flags_pub_000000" });
      expect(document.cookie).toEqual("");

      const initialStateFromProps: InitialFlagState<Flags> = {
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
              checkout: "short",
              discount: 5,
              purchaseButtonLabel: "Buy now",
            },
            visitor: { key: generatedVisitorKey },
          },
        },
      };

      const { result } = renderHook(() =>
        useFlags({ initialState: initialStateFromProps })
      );

      expect(result.all).toEqual([
        {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Buy now",
          },
          rawFlags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Buy now",
          },
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
        },
      ]);

      expect(fetchMock.calls(), "should not fetch at all").toHaveLength(0);

      // getFlags() would set the cookies in the response to the page itself,
      // but that server function is mocked in this example.
      //
      // The header sent in response to the page load would look like
      // Set-Cookie: hkvk=generatedVisitorKey; Path=/; Max-Age=15552000; SameSite=Lax
      //
      // We expect an empty cookie instead, since this is a unit, in which
      // the getFlags() on the server does not run, and thus has no chance to
      // set the cookie.
      expect(document.cookie).toBe("");
    });
  });

  describe("when visitorKey is set in cookie", () => {
    it("reuses the visitor key", async () => {
      // prepare cookie before test
      const visitorKeyInCookie = nanoid();
      document.cookie = `hkvk=${visitorKeyInCookie}`;

      configure({ envKey: "flags_pub_000000" });
      expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

      const initialStateFromProps: InitialFlagState<Flags> = {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            visitorKey: visitorKeyInCookie,
            user: null,
            traits: null,
            static: false,
          },
        },
        outcome: {
          responseBody: {
            flags: {
              ads: true,
              checkout: "short",
              discount: 5,
              purchaseButtonLabel: "Buy now",
            },
            visitor: { key: visitorKeyInCookie },
          },
        },
      };

      // start actual testing
      const { result } = renderHook(() =>
        useFlags({ initialState: initialStateFromProps })
      );

      expect(fetchMock.calls(), "should not fetch at all").toHaveLength(0);

      expect(result.all).toEqual([
        {
          fetching: false,
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Buy now",
          },
          rawFlags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Buy now",
          },
          settled: true,
          visitorKey: visitorKeyInCookie,
        },
      ]);
    });
  });
});

describe("static site generation (hybrid)", () => {
  describe("when cookie is not set", () => {
    it("generates a visitorKey", async () => {
      // prepare cookie before test
      let generatedVisitorKey;

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            // false because this is the request of the client afer hydration,
            // not the one during static site generation
            static: false,
            traits: null,
            user: null,
            // visitorKey: generatedVisitorKey,
          },
          matchPartialBody: true,
        },
        (url: string, options: RequestInit, request: Request) => {
          // parse visitorKey so we can mirror it back
          const body = JSON.parse(options.body as string);
          generatedVisitorKey = body.visitorKey;
          expect(typeof generatedVisitorKey).toBe("string");
          expect(generatedVisitorKey).toHaveLength(21);

          return {
            flags: {
              ads: true,
              checkout: "short",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: { key: generatedVisitorKey },
          };
        }
      );

      configure({ envKey: "flags_pub_000000" });
      expect(document.cookie).toEqual("");

      const initialStateFromProps: InitialFlagState<Flags> = {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            visitorKey: null,
            user: null,
            traits: null,
            static: true,
          },
        },
        outcome: {
          responseBody: {
            flags: {
              ads: true,
              checkout: null,
              discount: 5,
              purchaseButtonLabel: null,
            },
            visitor: null,
          },
        },
      };

      const { result, waitForNextUpdate } = renderHook(() =>
        useFlags({ initialState: initialStateFromProps })
      );

      expect(result.all).toHaveLength(2);
      expect(document.cookie).toEqual("");
      await waitForNextUpdate();
      expect(document.cookie).toEqual(`hkvk=${generatedVisitorKey}`);

      // the worker never sets cookies now, so the client has to deal
      // with generating a visitor key and storing it as a cookie
      //
      // we need this to work nicely with ssr and ssg, so the expected behaviour
      // of useFlags depends on which initial state is passed in
      //
      // rendered with ssr? => server should have generated visitorKey if not present, and it should be set in response
      // rendered with ssg? => server sets visitorKey: null in request, and useFlags needs to reevaluate the flags after the initial render

      expect(result.all).toEqual([
        {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          rawFlags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          fetching: false,
          settled: false,
          visitorKey: null,
        },
        {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          rawFlags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          fetching: true,
          settled: false,
          visitorKey: generatedVisitorKey,
        },
        {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          rawFlags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
        },
      ]);

      // ensure there are no further updates
      await expect(waitForNextUpdate({ timeout: 500 })).rejects.toThrow(
        "Timed out"
      );
    });
  });

  describe("when cookie is set", () => {
    it("generates a visitorKey", async () => {
      // prepare cookie before test
      const visitorKeyInCookie = nanoid();
      document.cookie = `hkvk=${visitorKeyInCookie}`;

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            // false because this is the request of the client afer hydration,
            // not the one during static site generation
            static: false,
            traits: null,
            user: null,
            visitorKey: visitorKeyInCookie,
          },
        },
        {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          visitor: { key: visitorKeyInCookie },
        }
      );

      configure({ envKey: "flags_pub_000000" });

      const initialStateFromProps: InitialFlagState<Flags> = {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            visitorKey: null,
            user: null,
            traits: null,
            static: true,
          },
        },
        outcome: {
          responseBody: {
            flags: {
              ads: true,
              checkout: null,
              discount: 5,
              purchaseButtonLabel: null,
            },
            visitor: null,
          },
        },
      };

      const { result, waitForNextUpdate } = renderHook(() =>
        useFlags({ initialState: initialStateFromProps })
      );

      expect(result.all).toHaveLength(2);
      expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);
      await waitForNextUpdate();
      expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

      expect(result.all).toEqual([
        {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          rawFlags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          fetching: false,
          settled: false,
          visitorKey: null,
        },
        {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          rawFlags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          fetching: true,
          settled: false,
          visitorKey: visitorKeyInCookie,
        },
        {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          rawFlags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          fetching: false,
          settled: true,
          visitorKey: visitorKeyInCookie,
        },
      ]);

      // ensure there are no further updates
      await expect(waitForNextUpdate({ timeout: 500 })).rejects.toThrow(
        "Timed out"
      );
    });
  });
});

describe("stories", () => {
  describe("client-side rendering", () => {
    it("works", async () => {
      let generatedVisitorKey = null;
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
          generatedVisitorKey = body.visitorKey;
          expect(typeof generatedVisitorKey).toBe("string");

          return {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: { key: generatedVisitorKey },
          };
        }
      );

      configure({ envKey: "flags_pub_000000" });
      expect(document.cookie).toEqual("");

      const { result, waitForNextUpdate, rerender } = renderHook<
        UseFlagsOptions,
        FlagBag<Flags>
      >((options) => useFlags(options), { initialProps: undefined });

      const firstRenders = [
        {
          flags: null,
          rawFlags: null,
          fetching: false,
          settled: false,
          visitorKey: null,
        },
        {
          flags: null,
          rawFlags: null,
          fetching: true,
          settled: false,
          visitorKey: expect.any(String),
        },
      ];
      expect(result.all).toEqual(firstRenders);

      await waitForNextUpdate();

      const secondRenders = [
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          rawFlags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          fetching: false,
          settled: true,
          visitorKey: expect.any(String),
        },
      ];
      expect(result.all).toEqual([...firstRenders, ...secondRenders]);

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            visitorKey: generatedVisitorKey,
            user: { key: "george" },
            traits: null,
            static: false,
          },
        },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 10,
            purchaseButtonLabel: "Purchase",
          },
          visitor: { key: generatedVisitorKey },
        },
        { overwriteRoutes: true }
      );

      rerender({ user: { key: "george" } });
      await waitForNextUpdate();

      expect(result.all).toEqual([
        ...firstRenders,
        ...secondRenders,
        // {
        //   flags: null,
        //   rawFlags: null,
        //   fetching: true,
        //   settled: false,
        //   visitorKey: generatedVisitorKey,
        // },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          rawFlags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
        },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          rawFlags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          fetching: true,
          settled: true,
          visitorKey: generatedVisitorKey,
        },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 10,
            purchaseButtonLabel: "Purchase",
          },
          rawFlags: {
            ads: true,
            checkout: "medium",
            discount: 10,
            purchaseButtonLabel: "Purchase",
          },
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
        },
      ]);

      expect(
        (result.all[1] as FlagBag<any>).visitorKey,
        "visitor key may not change"
      ).toEqual((result.all[2] as FlagBag<any>).visitorKey);
    });
  });
});
