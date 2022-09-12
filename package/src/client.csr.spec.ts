/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import { renderHook } from "@testing-library/react-hooks";
import { createUseFlags, cache, UseFlagsOptions } from "./client";
import * as fetchMock from "fetch-mock-jest";
import { deleteAllCookies } from "../jest/delete-all-cookies";
import { nanoid } from "nanoid";
import { FlagBag, Flags } from "./internal/types";

let useFlags: ReturnType<typeof createUseFlags>;

beforeEach(() => {
  useFlags = createUseFlags({ envKey: "flags_pub_000000" });
  fetchMock.reset();
  deleteAllCookies(window);
  cache.clear();
});

describe("when cookie is not set", () => {
  it("generates a visitor key", async () => {
    let visitorKey;
    // mock incoming post request...
    fetchMock.post(
      // ...when it matches this...
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          /* body is checked in the response function */
        },
        matchPartialBody: true,
      },
      // ... and respond with that...
      (url: string, options: RequestInit, request: Request) => {
        // parse visitorKey so we can mirror it back
        const body = JSON.parse(options.body as string);
        visitorKey = body.visitorKey;

        expect(body).toEqual({
          user: null,
          traits: null,
          visitorKey: expect.any(String),
        });

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

    expect(document.cookie).toEqual("");

    const { result, waitForNextUpdate } = renderHook(() => useFlags());

    expect(result.all).toHaveLength(2);

    await waitForNextUpdate();

    expect(result.all).toEqual([
      {
        flags: null,
        data: null,
        error: null,
        fetching: false,
        settled: false,
        visitorKey: null,
        revalidate: expect.any(Function),
      },
      {
        flags: null,
        data: null,
        error: null,
        fetching: true,
        settled: false,
        visitorKey: visitorKey,
        revalidate: expect.any(Function),
      },
      {
        flags: {
          ads: true,
          checkout: "medium",
          discount: 5,
          purchaseButtonLabel: "Purchase",
        },
        data: {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          visitor: { key: visitorKey },
        },
        error: null,
        fetching: false,
        settled: true,
        visitorKey: visitorKey,
        revalidate: expect.any(Function),
      },
    ]);

    // visitor key may not change
    expect((result.all[1] as FlagBag<any>).visitorKey).toEqual(
      (result.all[2] as FlagBag<any>).visitorKey
    );
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

    expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

    // start actual testing
    const { result, waitForNextUpdate } = renderHook(() => useFlags());

    expect(result.all).toHaveLength(2);

    await waitForNextUpdate();

    expect(result.all).toEqual([
      {
        flags: null,
        data: null,
        error: null,
        fetching: false,
        settled: false,
        visitorKey: null,
        revalidate: expect.any(Function),
      },
      {
        flags: null,
        data: null,
        error: null,
        fetching: true,
        settled: false,
        visitorKey: visitorKeyInCookie,
        revalidate: expect.any(Function),
      },
      {
        flags: {
          ads: true,
          checkout: "medium",
          discount: 5,
          purchaseButtonLabel: "Purchase",
        },
        data: {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          visitor: { key: visitorKeyInCookie },
        },
        error: null,
        fetching: false,
        settled: true,
        visitorKey: visitorKeyInCookie,
        revalidate: expect.any(Function),
      },
    ]);
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
            /* checked in response function */
          },
          matchPartialBody: true,
        },
        (url: string, options: RequestInit, request: Request) => {
          // parse visitorKey so we can mirror it back
          const body = JSON.parse(options.body as string);
          generatedVisitorKey = body.visitorKey;

          expect(body).toEqual({
            user: null,
            traits: null,
            visitorKey: expect.any(String),
          });

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

      expect(document.cookie).toEqual("");

      const { result, waitForNextUpdate, rerender } = renderHook<
        UseFlagsOptions,
        FlagBag<Flags>
      >((options) => useFlags(options), { initialProps: undefined });

      expect(result.all).toHaveLength(2);

      await waitForNextUpdate();

      expect(result.all).toHaveLength(3);

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            visitorKey: generatedVisitorKey,
            user: { key: "george" },
            traits: null,
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

      expect(result.all).toHaveLength(5);

      await waitForNextUpdate();

      expect(result.all).toEqual([
        {
          flags: null,
          data: null,
          error: null,
          fetching: false,
          settled: false,
          visitorKey: null,
          revalidate: expect.any(Function),
        },
        {
          flags: null,
          data: null,
          error: null,
          fetching: true,
          settled: false,
          visitorKey: generatedVisitorKey,
          revalidate: expect.any(Function),
        },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          data: {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: {
              key: generatedVisitorKey,
            },
          },
          error: null,
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
          revalidate: expect.any(Function),
        },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 5,
            purchaseButtonLabel: "Purchase",
          },
          data: {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 5,
              purchaseButtonLabel: "Purchase",
            },
            visitor: {
              key: generatedVisitorKey,
            },
          },
          error: null,
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
          revalidate: expect.any(Function),
        },
        {
          flags: null,
          data: null,
          error: null,
          fetching: true,
          settled: false,
          visitorKey: generatedVisitorKey,
          revalidate: expect.any(Function),
        },
        {
          flags: {
            ads: true,
            checkout: "medium",
            discount: 10,
            purchaseButtonLabel: "Purchase",
          },
          data: {
            flags: {
              ads: true,
              checkout: "medium",
              discount: 10,
              purchaseButtonLabel: "Purchase",
            },
            visitor: {
              key: generatedVisitorKey,
            },
          },
          error: null,
          fetching: false,
          settled: true,
          visitorKey: generatedVisitorKey,
          revalidate: expect.any(Function),
        },
      ]);
    });
  });
});
