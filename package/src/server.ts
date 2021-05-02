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
  SuccessInitialFlagState,
  ErrorInitialFlagState,
  EvaluationResponseBody,
  ResolvingError,
  Input,
} from "./types";
import {
  getCookie,
  has,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
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
}): Promise<
  | {
      /**
       * The resolved flags
       *
       * In case the default flags contain flags not present in the loaded flags,
       * the missing flags will get added to the returned flags.
       */
      flags: F;
      /**
       * The actually loaded data without any defaults applied, or null when
       * the flags could not be loaded.
       */
      data: EvaluationResponseBody<F> | null;
      error: null;
      initialFlagState: SuccessInitialFlagState<F>;
    }
  | {
      /**
       * The resolved flags
       *
       * In case the flags could not be loaded, you will see the default
       * flags here (from config.defaultFlags)
       */
      flags: F | null;
      /**
       * The actually loaded data without any defaults applied, or null when
       * the flags could not be loaded.
       */
      data: null;
      error: ResolvingError;
      /**
       * The initial flag state that you can use to initialize useFlags()
       */
      initialFlagState: ErrorInitialFlagState;
    }
> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

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

  if (!workerResponse || !workerResponse.ok /* status not 200-299 */)
    return {
      flags: config.defaultFlags as F,
      data: null,
      error: "response-not-ok",
      initialFlagState: { input, outcome: { error: "response-not-ok" } },
    };

  const workerResponseBody: EvaluationResponseBody<F> | null = await workerResponse
    .json()
    .catch(() => null);

  if (!workerResponseBody) {
    return {
      flags: config.defaultFlags as F,
      data: null,
      error: "invalid-response-body",
      initialFlagState: { input, outcome: { error: "invalid-response-body" } },
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
  const flagsWithDefaults = combineRawFlagsWithDefaultFlags<F>(
    flags,
    config.defaultFlags
  );

  return {
    flags: flagsWithDefaults,
    data: workerResponseBody,
    error: null,
    initialFlagState: { input, outcome: { data: workerResponseBody } },
  };
}
