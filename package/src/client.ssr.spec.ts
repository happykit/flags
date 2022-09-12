/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import { renderHook } from "@testing-library/react-hooks";
import { createUseFlags, cache } from "./client";
import * as fetchMock from "fetch-mock-jest";
import { deleteAllCookies } from "../jest/delete-all-cookies";
import { nanoid } from "nanoid";
import { Flags, InitialFlagState } from "./internal/types";

let useFlags: ReturnType<typeof createUseFlags>;

beforeEach(() => {
  useFlags = createUseFlags({ envKey: "flags_pub_000000" });
  fetchMock.reset();
  deleteAllCookies(window);
  cache.clear();
});

describe("when visitorKey is not set in cookie", () => {
  it("uses the visitor key generated on the server", async () => {
    expect(document.cookie).toBe("");
    const generatedVisitorKey = nanoid();

    expect(document.cookie).toEqual("");

    const initialStateFromProps: InitialFlagState<Flags> = {
      input: {
        endpoint: "https://happykit.dev/api/flags",
        envKey: "flags_pub_000000",
        requestBody: {
          visitorKey: generatedVisitorKey,
          user: null,
          traits: null,
        },
      },
      outcome: {
        data: {
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
        data: {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Buy now",
          },
          visitor: { key: generatedVisitorKey },
        },
        error: null,
        fetching: false,
        settled: true,
        visitorKey: generatedVisitorKey,
        revalidate: expect.any(Function),
      },
    ]);

    // should not fetch at all
    expect(fetchMock.calls()).toHaveLength(0);

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

    expect(document.cookie).toEqual(`hkvk=${visitorKeyInCookie}`);

    const initialStateFromProps: InitialFlagState<Flags> = {
      input: {
        endpoint: "https://happykit.dev/api/flags",
        envKey: "flags_pub_000000",
        requestBody: {
          visitorKey: visitorKeyInCookie,
          user: null,
          traits: null,
        },
      },
      outcome: {
        data: {
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

    // should not fetch at all
    expect(fetchMock.calls()).toHaveLength(0);

    expect(result.all).toEqual([
      {
        fetching: false,
        flags: {
          ads: true,
          checkout: "short",
          discount: 5,
          purchaseButtonLabel: "Buy now",
        },
        data: {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Buy now",
          },
          visitor: { key: visitorKeyInCookie },
        },
        error: null,
        settled: true,
        visitorKey: visitorKeyInCookie,
        revalidate: expect.any(Function),
      },
    ]);
  });
});
