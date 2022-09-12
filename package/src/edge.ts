/** global: fetch */
import type { NextRequest } from "next/server";
import type { Configuration } from "./config";
import type { CookieSerializeOptions } from "cookie";
import { nanoid } from "nanoid";
import type {
  FlagUser,
  Traits,
  Flags,
  SuccessInitialFlagState,
  ErrorInitialFlagState,
  GenericEvaluationResponseBody,
  ResolvingError,
  Input,
} from "./internal/types";
import { combineRawFlagsWithDefaultFlags } from "./internal/utils";
import { applyConfigurationDefaults } from "./internal/apply-configuration-defaults";

export type { GenericEvaluationResponseBody } from "./internal/types";

function getRequestingIp(req: Pick<NextRequest, "headers">): null | string {
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
  data: GenericEvaluationResponseBody<F> | null;
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

/**
 * Creates the getEdgeFlags() function your application should use when
 * loading flags from Middleware or Edge API Routes.
 */
export function createGetEdgeFlags<F extends Flags>(
  configuration: Configuration<F>
) {
  const config = applyConfigurationDefaults(configuration);
  return function getEdgeFlags(options: {
    request: Pick<NextRequest, "cookies" | "headers">;
    user?: FlagUser;
    traits?: Traits;
  }): Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>> {
    // determine visitor key
    const visitorKeyFromCookie =
      typeof options.request.cookies.get === "function"
        ? options.request.cookies.get("hkvk")
        : // backwards compatible for when cookies was { [key: string]: string; }
          // in Next.js
          (options.request.cookies as any).hkvk || null;

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
            flags: config.defaultFlags as F,
            data: null,
            error: "response-not-ok",
            initialFlagState: { input, outcome: { error: "response-not-ok" } },
            cookie: null,
          };
        }

        return workerResponse.json().then(
          (workerResponseBody: GenericEvaluationResponseBody<F>) => {
            // add defaults to flags here, but not in initialFlagState
            const flags = workerResponseBody.flags
              ? workerResponseBody.flags
              : null;
            const flagsWithDefaults = combineRawFlagsWithDefaultFlags<F>(
              flags,
              config.defaultFlags
            );

            const cookieOptions: CookieSerializeOptions = {
              path: "/",
              maxAge: 60 * 60 * 24 * 180,
              sameSite: "lax",
            };

            return {
              flags: flagsWithDefaults,
              data: workerResponseBody,
              error: null,
              initialFlagState: {
                input,
                outcome: { data: workerResponseBody },
              },
              cookie: workerResponseBody.visitor?.key
                ? {
                    name: "hkvk",
                    value: workerResponseBody.visitor.key,
                    options: cookieOptions,
                    args: [
                      "hkvk",
                      workerResponseBody.visitor.key,
                      cookieOptions,
                    ],
                  }
                : null,
            };
          },
          () => {
            return {
              flags: config.defaultFlags as F,
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
          flags: config.defaultFlags as F,
          data: null,
          error: "network-error",
          initialFlagState: { input, outcome: { error: "network-error" } },
          cookie: null,
        };
      }
    );
  };
}
