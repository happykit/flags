/**
 * @jest-environment node
 */
import { getFlags } from "./server";
import "@testing-library/jest-dom/extend-expect";
import * as fetchMock from "fetch-mock-jest";
import { configure, _resetConfig } from "./config";
import { GetServerSidePropsContext, GetStaticPropsContext } from "next";
import { nanoid } from "nanoid";

jest.mock("nanoid", () => {
  return { nanoid: jest.fn() };
});

beforeEach(() => {
  _resetConfig();
  fetchMock.reset();
});

describe("when called without configure", () => {
  it("should throw", async () => {
    expect(() => getFlags({ context: {} as any })).toThrow(
      Error("@happykit/flags: Missing configuration. Call configure() first.")
    );
  });
});

describe("server-side rendering (pure + hybrid)", () => {
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

      fetchMock.post(`https://happykit.dev/api/flags-perf`, {});

      const context = {
        req: {
          headers: { cookie: "hkvk=V1StGXR8_Z5jdHi6B-myT" },
          socket: { remoteAddress: "128.242.245.116" },
        },
        res: { setHeader: jest.fn() as any },
      } as Partial<GetServerSidePropsContext>;

      expect(await getFlags({ context, traits: { teamMember: true } })).toEqual(
        {
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
        }
      );

      // refresh of cookie
      expect(context.res!.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
      );
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

      fetchMock.post(`https://happykit.dev/api/flags-perf`, {});

      const context = {
        req: {
          headers: { cookie: "hkvk=V1StGXR8_Z5jdHi6B-myT" },
          socket: { remoteAddress: "128.242.245.116" },
        },
        res: { setHeader: jest.fn() as any },
      } as Partial<GetServerSidePropsContext>;

      expect(
        await getFlags({
          context,
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
      });

      expect(context.res!.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
      );
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

      fetchMock.post(`https://happykit.dev/api/flags-perf`, {});

      const context = {
        req: {
          headers: { cookie: "foo=bar" },
          socket: { remoteAddress: "128.242.245.116" },
        },
        res: { setHeader: jest.fn() as any },
      } as Partial<GetServerSidePropsContext>;

      expect(await getFlags({ context })).toEqual({
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
      });

      expect(context.res!.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        "hkvk=V1StGXR8_Z5jdHi6B-myT; Path=/; Max-Age=15552000; SameSite=Lax"
      );
    });
  });

  describe("when loading times out", () => {
    it("aborts the request", async () => {
      configure({ envKey: "flags_pub_000000", serverLoadingTimeout: 50 });

      const routeMock = fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            traits: null,
            user: null,
            visitorKey: "V1StGXR8_Z5jdHi6B-myT",
          },
        },
        {
          // Not used as request times out
          headers: { "content-type": "application/json" },
          body: {
            flags: { meal: "large" },
            visitor: { key: "V1StGXR8_Z5jdHi6B-myT" },
          },
        },
        // This delay is longer than the serverLoadingTimeout, so the request
        // times out
        { delay: 250 }
      );

      const context = {
        req: {
          headers: { cookie: "hkvk=V1StGXR8_Z5jdHi6B-myT" },
          socket: { remoteAddress: "128.242.245.116" },
        },
        res: { setHeader: jest.fn() as any },
      } as Partial<GetServerSidePropsContext>;

      expect(await getFlags({ context })).toEqual({
        flags: {},
        data: null,
        error: "request-timed-out",
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              visitorKey: "V1StGXR8_Z5jdHi6B-myT",
              user: null,
              traits: null,
            },
          },
          outcome: { error: "request-timed-out" },
        },
      });

      // This doesn't seem to work
      //
      // The intention is to not leave any open handles as the fetch mock
      // doesn't seem to support aborting a request and will leave it open.
      await routeMock.flush(true);
    });
  });
});

describe("static site generation (pure + hybrid)", () => {
  it("should set static to true", async () => {
    configure({ envKey: "flags_pub_000000" });

    fetchMock.post(
      {
        url: "https://happykit.dev/api/flags/flags_pub_000000",
        body: {
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

    fetchMock.post(`https://happykit.dev/api/flags-perf`, {});

    expect(await getFlags({ context: {} as GetStaticPropsContext })).toEqual({
      flags: { meal: "large" },
      data: {
        flags: { meal: "large" },
        visitor: null,
      },
      error: null,
      initialFlagState: {
        input: {
          endpoint: "https://happykit.dev/api/flags",
          envKey: "flags_pub_000000",
          requestBody: {
            traits: null,
            user: null,
            visitorKey: null,
          },
        },
        outcome: {
          data: {
            flags: { meal: "large" },
            visitor: null,
          },
        },
      },
    });
  });

  describe("when traits are passed in", () => {
    it("forwards given traits", async () => {
      configure({ envKey: "flags_pub_000000" });

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
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

      fetchMock.post(`https://happykit.dev/api/flags-perf`, {});

      expect(
        await getFlags({
          context: {} as GetStaticPropsContext,
          traits: { friendly: true },
        })
      ).toEqual({
        flags: { meal: "large" },
        data: {
          flags: { meal: "large" },
          visitor: null,
        },
        error: null,
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              traits: { friendly: true },
              user: null,
              visitorKey: null,
            },
          },
          outcome: {
            data: {
              flags: { meal: "large" },
              visitor: null,
            },
          },
        },
      });
    });
  });

  describe("when user is passed in", () => {
    it("forwards a given user", async () => {
      configure({ envKey: "flags_pub_000000" });

      fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
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

      fetchMock.post(`https://happykit.dev/api/flags-perf`, {});

      expect(
        await getFlags({
          context: {} as GetStaticPropsContext,
          user: { key: "random-user-key", name: "joe" },
        })
      ).toEqual({
        flags: { meal: "large" },
        data: {
          flags: { meal: "large" },
          visitor: null,
        },
        error: null,
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              traits: null,
              user: { key: "random-user-key", name: "joe" },
              visitorKey: null,
            },
          },
          outcome: {
            data: {
              flags: { meal: "large" },
              visitor: null,
            },
          },
        },
      });
    });
  });

  describe("when loading times out", () => {
    it("aborts the request", async () => {
      configure({ envKey: "flags_pub_000000", staticLoadingTimeout: 75 });

      const routeMock = fetchMock.post(
        {
          url: "https://happykit.dev/api/flags/flags_pub_000000",
          body: {
            traits: null,
            user: null,
            visitorKey: null,
          },
        },
        {
          // Not used as request times out
          headers: { "content-type": "application/json" },
          body: { flags: { meal: "large" }, visitor: null },
        },
        // This delay is longer than the serverLoadingTimeout, so the request
        // times out
        { delay: 250 }
      );

      expect(await getFlags({ context: {} as GetStaticPropsContext })).toEqual({
        flags: {},
        data: null,
        error: "request-timed-out",
        initialFlagState: {
          input: {
            endpoint: "https://happykit.dev/api/flags",
            envKey: "flags_pub_000000",
            requestBody: {
              visitorKey: null,
              user: null,
              traits: null,
            },
          },
          outcome: { error: "request-timed-out" },
        },
      });

      // This doesn't seem to work
      //
      // The intention is to not leave any open handles as the fetch mock
      // doesn't seem to support aborting a request and will leave it open.
      await routeMock.flush(true);
    });
  });
});
