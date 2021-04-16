/**
 * @jest-environment node
 */
import { getFlags } from "./server";
import "@testing-library/jest-dom/extend-expect";
import * as fetchMock from "fetch-mock-jest";
import { configure, _resetConfig } from "./config";
import { GetServerSidePropsContext, GetStaticPropsContext } from "next";

jest.mock("nanoid", () => {
  return { nanoid: () => "V1StGXR8_Z5jdHi6B-myT" };
});

beforeEach(() => {
  _resetConfig();
  fetchMock.reset();
});

describe("getFlags", () => {
  it("exports a function", () => {
    expect(typeof getFlags).toBe("function");
  });
});

describe("when called without configure", () => {
  it("should throw", async () => {
    await expect(getFlags({ context: {} as any })).rejects.toThrow(
      Error("@happykit/flags: Missing configuration. Call configure() first.")
    );
  });
});

describe("server-side rendering (pure)", () => {
  it("refreshes the hkvk cookie when it was present in the initial request", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: false,
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

    const context = {
      req: {
        headers: { cookie: "hkvk=V1StGXR8_Z5jdHi6B-myT" },
        socket: { remoteAddress: "128.242.245.116" },
      },
      res: { setHeader: jest.fn() as any },
    } as Partial<GetServerSidePropsContext>;

    expect(await getFlags({ context })).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: false,
            traits: null,
            user: null,
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        },
      },
      loadedFlags: { meal: "large" },
    });

    expect(context.res!.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
    );
  });

  it("forwards the passed in traits", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: false,
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

    const context = {
      req: {
        headers: { cookie: "hkvk=V1StGXR8_Z5jdHi6B-myT" },
        socket: { remoteAddress: "128.242.245.116" },
      },
      res: { setHeader: jest.fn() as any },
    } as Partial<GetServerSidePropsContext>;

    expect(await getFlags({ context, traits: { teamMember: true } })).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: false,
            traits: { teamMember: true },
            user: null,
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        },
      },
      loadedFlags: { meal: "large" },
    });

    expect(context.res!.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
    );
  });

  it("forwards the passed in user", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: false,
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

    const context = {
      req: {
        headers: { cookie: "hkvk=V1StGXR8_Z5jdHi6B-myT" },
        socket: { remoteAddress: "128.242.245.116" },
      },
      res: { setHeader: jest.fn() as any },
    } as Partial<GetServerSidePropsContext>;

    expect(
      await getFlags({ context, user: { key: "random-user-key", name: "joe" } })
    ).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: false,
            traits: null,
            user: { key: "random-user-key", name: "joe" },
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        },
      },
      loadedFlags: { meal: "large" },
    });

    expect(context.res!.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
    );
  });

  it("generates and sets the hkvk cookie when it was missing in the initial request", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: false,
          traits: null,
          user: null,
          // nanoid is mocked to always return "V1StGXR8_Z5jdHi6B-myT",
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

    const context = {
      req: {
        headers: { cookie: "foo=bar" },
        socket: { remoteAddress: "128.242.245.116" },
      },
      res: { setHeader: jest.fn() as any },
    } as Partial<GetServerSidePropsContext>;

    expect(await getFlags({ context })).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: false,
            traits: null,
            user: null,
            // nanoid is mocked to always return "V1StGXR8_Z5jdHi6B-myT",
            // so the generated id is always this one
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        },
      },
      loadedFlags: { meal: "large" },
    });

    expect(context.res!.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
    );
  });
});

describe("static site generation (pure)", () => {
  it("should return", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: true,
          traits: null,
          user: null,
          visitorKey: null,
        },
      },
      {
        headers: { "content-type": "application/json" },
        body: { flags: { meal: "large" }, visitor: null },
      }
    );

    expect(await getFlags({ context: {} as GetStaticPropsContext })).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: true,
            traits: null,
            user: null,
            visitorKey: null,
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: null,
          },
        },
      },
      loadedFlags: { meal: "large" },
    });
  });

  it("forwards given traits", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: true,
          traits: { friendly: true },
          user: null,
          visitorKey: null,
        },
      },
      {
        headers: { "content-type": "application/json" },
        body: { flags: { meal: "large" }, visitor: null },
      }
    );

    expect(
      await getFlags({
        context: {} as GetStaticPropsContext,
        traits: { friendly: true },
      })
    ).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: true,
            traits: { friendly: true },
            user: null,
            visitorKey: null,
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: null,
          },
        },
      },
      loadedFlags: { meal: "large" },
    });
  });

  it("forwards a given user", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
          static: true,
          traits: null,
          user: { key: "random-user-key", name: "joe" },
          visitorKey: null,
        },
      },
      {
        headers: { "content-type": "application/json" },
        body: { flags: { meal: "large" }, visitor: null },
      }
    );

    expect(
      await getFlags({
        context: {} as GetStaticPropsContext,
        user: { key: "random-user-key", name: "joe" },
      })
    ).toEqual({
      flags: { meal: "large" },
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            static: true,
            traits: null,
            user: { key: "random-user-key", name: "joe" },
            visitorKey: null,
          },
        },
        outcome: {
          responseBody: {
            flags: { meal: "large" },
            visitor: null,
          },
        },
      },
      loadedFlags: { meal: "large" },
    });
  });
});
