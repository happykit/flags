/** global: fetch */
import { IncomingMessage, ServerResponse } from "http";
import { GetServerSidePropsContext, GetStaticPropsContext } from "next";
import { config, isConfigured } from "./config";
import {
  FlagUser,
  Traits,
  MissingConfigurationError,
  Flags,
  InitialFlagState,
  EvaluationResponseBody,
} from "./types";
import { getCookie, has, serializeVisitorKeyCookie } from "./utils";

function getXForwardedFor(context: {
  req: IncomingMessage;
  res: ServerResponse;
}): {} | { "x-forwarded-for": string } {
  const key = "x-forwarded-for" as const;
  const xForwardedFor = context.req.headers[key];
  if (typeof xForwardedFor === "string") return { [key]: xForwardedFor };
  const remoteAddress = context.req.socket.remoteAddress;
  if (remoteAddress) return { [key]: remoteAddress };
  return {};
}

export async function getFlags<F extends Flags = Flags>(options: {
  context: GetServerSidePropsContext | GetStaticPropsContext;
  user?: FlagUser;
  traits?: Traits;
}): Promise<{
  /**
   * The resolved flags
   *
   * In case the flags could not be loaded, you will see the default
   * flags here (from config.defaultFlags)
   *
   * In case the default flags contain flags not present in the loaded
   * flags, the missing flags will get added to the returned flags.
   */
  flags: F;
  /**
   * The initial flag state that you can use to initialize useFlags()
   */
  initialFlagState: InitialFlagState<F>;
}> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  // Workaround alert:
  //
  // We use "has(options.context, "req")" to determine whether getFlags was
  // called with a context from server-side or static rendering when
  // options.context.req is set, we were called from static rendering.
  //
  // Unfortunately, I could not make this work with simple type narrowing.

  // determine visitor key
  const visitorKeyFromCookie = has(options.context, "req")
    ? getCookie(options.context.req.headers.cookie, "hkvk")
    : null;

  const requestBody = {
    visitorKey: visitorKeyFromCookie,
    user: options.user || null,
    traits: options.traits || null,
  };

  const input = {
    endpoint: config.endpoint,
    envKey: config.envKey,
    requestBody,
  };

  const response = await fetch([input.endpoint, input.envKey].join("/"), {
    method: "POST",
    headers: Object.assign(
      { "content-type": "application/json" },
      has(options.context, "req")
        ? // add x-forwarded-for header so the service worker gets
          // access to the real client ip
          getXForwardedFor(options.context)
        : {}
    ),
    body: JSON.stringify(input.requestBody),
  }).catch(() => null);

  if (!response || response.status !== 200)
    return {
      flags: config.defaultFlags as F,
      initialFlagState: { input, outcome: null },
    };

  const responseBody: EvaluationResponseBody<F> | null = await response
    .json()
    .catch(() => null);

  if (!responseBody) {
    return {
      flags: config.defaultFlags as F,
      initialFlagState: { input, outcome: null },
    };
  }

  if (has(options.context, "req")) {
    // always set the cookie so its max age refreshes
    options.context.res.setHeader(
      "Set-Cookie",
      serializeVisitorKeyCookie(responseBody.visitor.key)
    );
  }

  // add defaults to flags here, but not in initialFlagState
  const flags = responseBody.flags ? responseBody.flags : null;
  const flagsWithDefaults = { ...config.defaultFlags, ...flags } as F;

  return {
    flags: flagsWithDefaults,
    initialFlagState: { input, outcome: { responseBody } },
  };
}
