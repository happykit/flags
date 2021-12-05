/**
 * @jest-environment node
 */
// whatwg-fetch defines HeadersInit globally which our tests need
import "whatwg-fetch";
import { getEdgeFlags } from "./edge";
import "@testing-library/jest-dom/extend-expect";
import * as fetchMock from "fetch-mock-jest";
import { configure, _resetConfig } from "./config";
import { nanoid } from "nanoid";

jest.mock("nanoid", () => {
  return { nanoid: jest.fn() };
});

beforeEach(() => {
  _resetConfig();
  fetchMock.reset();
});

// const { NextRequest } = await import(
//   "next/dist/server/web/spec-extension/request"
// );
function createNextRequest(
  options: {
    headers?: HeadersInit;
    cookies?: { [key: string]: string };
  } = {}
) {
  return {
    headers: new Headers(options.headers || []),
    cookies: options.cookies || {},
  };
}

describe("when called without configure", () => {
  it("should throw", async () => {
    const request = createNextRequest();

    expect(() => getEdgeFlags({ request })).toThrow(
      Error("@happykit/flags: Missing configuration. Call configure() first.")
    );
  });
});

describe("middleware", () => {
  describe("when traits are passed in", () => {
    it("forwards the passed in traits", async () => {
      configure({ envKey: "flags_pub_000000" });

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            traits: { teamMember: true },
            user: null,
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        {
          headers: { "content-type": "application/json" },
          body: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        }
      );

      const request = createNextRequest({
        cookies: { hkvk: "V1StGXR8_Z5jdHi6B-myT" },
      });

      expect(
        await getEdgeFlags({ request, traits: { teamMember: true } })
      ).toEqual({
        flags: { meal: "large" },
        data: {
          flags: { meal: "large" },
          visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
        },
        error: null,
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              traits: { teamMember: true },
              user: null,
              visitorKey: "V1StGXR8_Z5jdHi6B-myT",
            },
          },
          outcome: {
            data: {
              flags: { meal: "large" },
              visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
            },
          },
        },
        cookie: {
          args: [
            "hkvk",
            "V1StGXR8_Z5jdHi6B-myT",
            { maxAge: 15552000, path: "/", sameSite: "lax" },
          ],
          name: "hkvk",
          options: { maxAge: 15552000, path: "/", sameSite: "lax" },
          value: "V1StGXR8_Z5jdHi6B-myT",
        },
      });
    });
  });

  describe("when user is passed in", () => {
    it("forwards the passed in user", async () => {
      configure({ envKey: "flags_pub_000000" });

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            traits: null,
            user: { key: "random-user-key", name: "joe" },
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        {
          headers: { "content-type": "application/json" },
          body: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        }
      );

      const request = createNextRequest({
        cookies: { hkvk: "V1StGXR8_Z5jdHi6B-myT" },
      });

      expect(
        await getEdgeFlags({
          request,
          user: { key: "random-user-key", name: "joe" },
        })
      ).toEqual({
        flags: { meal: "large" },
        data: {
          flags: { meal: "large" },
          visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
        },
        error: null,
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              traits: null,
              user: { key: "random-user-key", name: "joe" },
              visitorKey: "V1StGXR8_Z5jdHi6B-myT",
            },
          },
          outcome: {
            data: {
              flags: { meal: "large" },
              visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
            },
          },
        },
        cookie: {
          args: [
            "hkvk",
            "V1StGXR8_Z5jdHi6B-myT",
            {
              maxAge: 15552000,
              path: "/",
              sameSite: "lax",
            },
          ],
          name: "hkvk",
          options: {
            maxAge: 15552000,
            path: "/",
            sameSite: "lax",
          },
          value: "V1StGXR8_Z5jdHi6B-myT",
        },
      });
    });
  });

  describe("when no cookie exists on initial request", () => {
    it("generates and sets the hkvk cookie", async () => {
      configure({ envKey: "flags_pub_000000" });

      // @ts-ignore
      nanoid.mockReturnValueOnce("V1StGXR8_Z5jdHi6B-myT");

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            traits: null,
            user: null,
            // nanoid is mocked to return "V1StGXR8_Z5jdHi6B-myT",
            // so the generated id is always this one
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        {
          headers: { "content-type": "application/json" },
          body: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        }
      );

      const request = createNextRequest({
        cookies: { foo: "bar" },
      });

      expect(await getEdgeFlags({ request })).toEqual({
        flags: { meal: "large" },
        data: {
          flags: { meal: "large" },
          visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
        },
        error: null,
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              traits: null,
              user: null,
              visitorKey: "V1StGXR8_Z5jdHi6B-myT",
            },
          },
          outcome: {
            data: {
              flags: { meal: "large" },
              visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
            },
          },
        },
        cookie: {
          args: [
            "hkvk",
            "V1StGXR8_Z5jdHi6B-myT",
            { maxAge: 15552000, path: "/", sameSite: "lax" },
          ],
          name: "hkvk",
          options: { maxAge: 15552000, path: "/", sameSite: "lax" },
          value: "V1StGXR8_Z5jdHi6B-myT",
        },
      });
    });
  });
});
