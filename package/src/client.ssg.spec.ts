/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import "@testing-library/jest-dom";
import { renderHook } from "@testing-library/react-hooks";
import { cache, createUseFlags } from "./client";
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

describe("when cookie is not set", () => {
  it("generates a visitorKey", async () => {
    let generatedVisitorKey;

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
          traits: null,
          user: null,
          visitorKey: expect.any(String),
        });

        expect(body.visitorKey).toHaveLength(21);

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

    expect(document.cookie).toEqual("");

    const initialStateFromProps: InitialFlagState<Flags> = {
      input: {
        endpoint: "https://happykit.dev/api/flags",
        envKey: "flags_pub_000000",
        requestBody: {
          visitorKey: null,
          user: null,
          traits: null,
        },
      },
      outcome: {
        data: {
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
        data: {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          visitor: null,
        },
        error: null,
        fetching: false,
        settled: false,
        visitorKey: null,
        revalidate: expect.any(Function),
      },
      {
        flags: {
          ads: true,
          checkout: null,
          discount: 5,
          purchaseButtonLabel: null,
        },
        data: {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          visitor: null,
        },
        error: null,
        fetching: true,
        settled: false,
        visitorKey: null,
        revalidate: expect.any(Function),
      },
      {
        flags: {
          ads: true,
          checkout: "short",
          discount: 5,
          purchaseButtonLabel: "Purchase",
        },
        data: {
          flags: {
            ads: true,
            checkout: "short",
            discount: 5,
            purchaseButtonLabel: "Purchase",
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

    // ensure there are no further updates
    await expect(waitForNextUpdate({ timeout: 500 })).rejects.toThrow(
      "Timed out"
    );
  });
});

describe("when cookie is set", () => {
  it("reuses the visitorKey", async () => {
    // prepare cookie before test
    const visitorKeyInCookie = nanoid();
    document.cookie = `hkvk=${visitorKeyInCookie}`;

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          traits: null,
          user: null,
          // not static because this is the request of the client afer hydration,
          // not the one during static site generation
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

    const initialStateFromProps: InitialFlagState<Flags> = {
      input: {
        endpoint: "https://happykit.dev/api/flags",
        envKey: "flags_pub_000000",
        requestBody: {
          visitorKey: null,
          user: null,
          traits: null,
        },
      },
      outcome: {
        data: {
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
        data: {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          visitor: null,
        },
        error: null,
        fetching: false,
        settled: false,
        visitorKey: null,
        revalidate: expect.any(Function),
      },
      {
        flags: {
          ads: true,
          checkout: null,
          discount: 5,
          purchaseButtonLabel: null,
        },
        data: {
          flags: {
            ads: true,
            checkout: null,
            discount: 5,
            purchaseButtonLabel: null,
          },
          visitor: null,
        },
        error: null,
        fetching: true,
        settled: false,
        visitorKey: null,
        revalidate: expect.any(Function),
      },
      {
        flags: {
          ads: true,
          checkout: "short",
          discount: 5,
          purchaseButtonLabel: "Purchase",
        },
        data: {
          flags: {
            ads: true,
            checkout: "short",
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

    // ensure there are no further updates
    await expect(waitForNextUpdate({ timeout: 500 })).rejects.toThrow(
      "Timed out"
    );
  });
});
