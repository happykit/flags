/**
 * @jest-environment node
 */
// whatwg-fetch defines HeadersInit globally which our tests need
import "whatwg-fetch";
import "@testing-library/jest-dom/extend-expect";
import * as fetchMock from "fetch-mock-jest";
import { createGetEdgeFlags } from "./edge";
import { nanoid } from "nanoid";

jest.mock("nanoid", () => {
  return { nanoid: jest.fn() };
});

let getEdgeFlags: ReturnType<typeof createGetEdgeFlags>;

beforeEach(() => {
  getEdgeFlags = createGetEdgeFlags({ envKey: "flags_pub_000000" });
  fetchMock.reset();
});

// const { NextRequest } = await import(
//   "next/dist/server/web/spec-extension/request"
// );
function createNextRequest(
  options: {
    headers?: HeadersInit;
    cookies?: any;
  } = {}
) {
  return {
    headers: new Headers(options.headers || []),
    cookies: {
      get: (key: string) =>
        options.cookies ? options.cookies[key] || undefined : undefined,
    } as any,
  };
}

describe("createGetEdgeFlags", () => {
  it("should throw when called without options", async () => {
    // @ts-ignore this is the situation we want to test
    expect(() => createGetEdgeFlags()).toThrowError(
      "@happykit/flags: config missing"
    );
  });

  it("should throw with missing envKey", async () => {
    // @ts-ignore this is the situation we want to test
    expect(() => createGetEdgeFlags({})).toThrowError(
      "@happykit/flags: envKey missing"
    );
  });
});

describe("middleware", () => {
  describe("when traits are passed in", () => {
    it("forwards the passed in traits", async () => {
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

  describe("when request cookies are an object", () => {
    it("gets the cookie value", async () => {
      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            traits: null,
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
        cookies: { hkvk: { name: "hkvk", value: "V1StGXR8_Z5jdHi6B-myT" } },
      });

      expect(
        await getEdgeFlags({ request })
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
