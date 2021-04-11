/** global: fetch */
import { IncomingMessage, ServerResponse } from "http";
import { GetServerSidePropsContext, GetStaticPropsContext } from "next";
import { config, isConfigured } from "./config";
import { nanoid } from "nanoid";
import {
  FlagUser,
  Traits,
  MissingConfigurationError,
  Flags,
  InitialFlagState,
  EvaluationResponseBody,
  Input,
} from "./types";
import {
  getCookie,
  has,
  serializeVisitorKeyCookie,
  combineLoadedFlagsWithDefaultFlags,
} from "./utils";

function getRequestingIp(context: {
  req: IncomingMessage;
  res: ServerResponse;
}): null | string {
  const key = "x-forwarded-for" as const;
  const xForwardedFor = context.req.headers[key];
  if (typeof xForwardedFor === "string") return xForwardedFor;
  const remoteAddress = context.req.socket.remoteAddress;
  if (remoteAddress) return remoteAddress;
  return null;
}

export async function getFlags<F extends Flags = Flags>(options: {
  context:
    | Pick<GetServerSidePropsContext, "req" | "res">
    | GetStaticPropsContext;
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
   * The actually loaded flags without any defaults applied, or null when
   * the flags could not be loaded.
   */
  loadedFlags: F | null;
  /**
   * The initial flag state that you can use to initialize useFlags()
   */
  initialFlagState: InitialFlagState<F>;
}> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  // Workaround alert:
  //
  // We use "has(options.context, "req")" to determine whether getFlags was
  // called with a context from server-side or static rendering.
  //
  // When options.context.req is missing, we were called from static rendering.
  //
  // Unfortunately, I could not make this work with simple type narrowing.
  const mode = has(options.context, "req") ? "ssr" : "ssg";

  // determine visitor key
  const visitorKeyFromCookie = has(options.context, "req")
    ? getCookie(options.context.req.headers.cookie, "hkvk")
    : null;

  // When using server-side rendering and there was no visitor key cookie,
  // we generate a visitor key
  // When using static rendering, we never set any visitor key
  const visitorKey = has(options.context, "req")
    ? visitorKeyFromCookie
      ? visitorKeyFromCookie
      : nanoid()
    : null;

  const input: Input = {
    endpoint: config.endpoint,
    envKey: config.envKey,
    requestBody: {
      visitorKey,
      user: options.user || null,
      traits: options.traits || null,
      static: !has(options.context, "req"),
    },
  };

  const requestingIp = has(options.context, "req")
    ? getRequestingIp(options.context)
    : null;

  const xForwardedForHeader: { "x-forwarded-for": string } | {} = requestingIp
    ? // add x-forwarded-for header so the service worker gets
      // access to the real client ip
      { "x-forwarded-for": requestingIp }
    : {};

  const workerResponse = await fetch([input.endpoint, input.envKey].join("/"), {
    method: "POST",
    headers: Object.assign(
      { "content-type": "application/json" },
      xForwardedForHeader
    ),
    body: JSON.stringify(input.requestBody),
  }).catch(() => null);

  if (!workerResponse || workerResponse.status !== 200)
    return {
      flags: config.defaultFlags as F,
      loadedFlags: null,
      initialFlagState: { mode, input, outcome: null },
    };

  const workerResponseBody: EvaluationResponseBody<F> | null = await workerResponse
    .json()
    .catch(() => null);

  if (!workerResponseBody) {
    return {
      flags: config.defaultFlags as F,
      loadedFlags: null,
      initialFlagState: { mode, input, outcome: null },
    };
  }

  if (has(options.context, "req") && workerResponseBody.visitor?.key) {
    // always set the cookie so its max age refreshes
    options.context.res.setHeader(
      "Set-Cookie",
      serializeVisitorKeyCookie(workerResponseBody.visitor.key)
    );
  }

  // add defaults to flags here, but not in initialFlagState
  const flags = workerResponseBody.flags ? workerResponseBody.flags : null;
  const flagsWithDefaults = combineLoadedFlagsWithDefaultFlags<F>(
    flags,
    config.defaultFlags
  );

  return {
    flags: flagsWithDefaults,
    loadedFlags: flags,
    initialFlagState: {
      mode,
      input,
      outcome: { responseBody: workerResponseBody },
    },
  };
}
