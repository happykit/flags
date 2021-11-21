/** global: fetch */
import type { NextRequest } from "next/server";
import { config, isConfigured } from "./config";
import type { CookieSerializeOptions } from "cookie";
import { nanoid } from "nanoid";
import type {
  FlagUser,
  Traits,
  Flags,
  SuccessInitialFlagState,
  ErrorInitialFlagState,
  EvaluationResponseBody,
  ResolvingError,
  Input,
} from "./types";
import { combineRawFlagsWithDefaultFlags } from "./utils";

export type { EvaluationResponseBody } from "./types";

function getRequestingIp(req: NextRequest): null | string {
  const key = "x-forwarded-for";
  const xForwardedFor = req.headers.get(key);
  if (typeof xForwardedFor === "string") return xForwardedFor;
  return null;
}

type GetFlagsSuccessBag<F extends Flags> = {
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
  /**
   * The cookie options you should forward using
   *
   * ```
   * response.cookie(
   *   flagBag.cookie.name,
   *   flagBag.cookie.value,
   *   flagBag.cookie.options
   * );
   * ```
   *
   * or using
   *
   * ```
   * response.cookie(...flagBag.cookie.args)
   * ```
   */
  cookie: {
    name: string;
    value: string;
    options: CookieSerializeOptions;
    /**
     * Arguments for response.cookie()
     */
    args: [string, string, CookieSerializeOptions];
  } | null;
};

type GetFlagsErrorBag<F extends Flags> = {
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
  cookie: null;
};

export const hkvkCookieOptions: CookieSerializeOptions = {
  path: "/",
  maxAge: 15552000 * 1000,
  sameSite: "lax",
};

export function getEdgeFlags<F extends Flags = Flags>(options: {
  request: NextRequest;
  user?: FlagUser;
  traits?: Traits;
}): Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>> {
  if (!isConfigured(config))
    throw new Error(
      "@happykit/flags: Missing configuration. Call configure() first."
    );
  const staticConfig = config;

  // determine visitor key
  const visitorKeyFromCookie = options.request.cookies.hkvk || null;

  // When using server-side rendering and there was no visitor key cookie,
  // we generate a visitor key
  // When using static rendering, we never set any visitor key
  const visitorKey = visitorKeyFromCookie ? visitorKeyFromCookie : nanoid();

  const input: Input = {
    endpoint: config.endpoint,
    envKey: config.envKey,
    requestBody: {
      visitorKey,
      user: options.user || null,
      traits: options.traits || null,
      static: false,
    },
  };

  const requestingIp = getRequestingIp(options.request);

  const xForwardedForHeader: { "x-forwarded-for": string } | {} = requestingIp
    ? // add x-forwarded-for header so the service worker gets
      // access to the real client ip
      { "x-forwarded-for": requestingIp }
    : {};

  return fetch([input.endpoint, input.envKey].join("/"), {
    method: "POST",
    headers: Object.assign(
      { "content-type": "application/json" },
      xForwardedForHeader
    ),
    body: JSON.stringify(input.requestBody),
  }).then(
    (
      workerResponse
    ):
      | Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>>
      | GetFlagsErrorBag<F> => {
      if (!workerResponse.ok /* status not 200-299 */) {
        return {
          flags: staticConfig.defaultFlags as F,
          data: null,
          error: "response-not-ok",
          initialFlagState: { input, outcome: { error: "response-not-ok" } },
          cookie: null,
        };
      }

      return workerResponse.json().then(
        (workerResponseBody: EvaluationResponseBody<F>) => {
          // add defaults to flags here, but not in initialFlagState
          const flags = workerResponseBody.flags
            ? workerResponseBody.flags
            : null;
          const flagsWithDefaults = combineRawFlagsWithDefaultFlags<F>(
            flags,
            staticConfig.defaultFlags
          );

          return {
            flags: flagsWithDefaults,
            data: workerResponseBody,
            error: null,
            initialFlagState: { input, outcome: { data: workerResponseBody } },
            cookie: workerResponseBody.visitor?.key
              ? {
                  name: "hkvk",
                  value: workerResponseBody.visitor.key,
                  options: hkvkCookieOptions,
                  args: [
                    "hkvk",
                    workerResponseBody.visitor.key,
                    hkvkCookieOptions,
                  ],
                }
              : null,
          };
        },
        () => {
          return {
            flags: staticConfig.defaultFlags as F,
            data: null,
            error: "invalid-response-body",
            initialFlagState: {
              input,
              outcome: { error: "invalid-response-body" },
            },
            cookie: null,
          };
        }
      );
    },
    () => {
      return {
        flags: staticConfig.defaultFlags as F,
        data: null,
        error: "network-error",
        initialFlagState: { input, outcome: { error: "network-error" } },
        cookie: null,
      };
    }
  );
}
