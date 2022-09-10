/** global: fetch */
import { IncomingMessage, ServerResponse } from "http";
import type {
  GetServerSidePropsContext,
  GetStaticPathsContext,
  GetStaticPropsContext,
} from "next";
import { Configuration, validate } from "./config";
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
} from "./types";
import { MissingConfigurationError } from "./types";
import {
  has,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
  getCookie,
} from "./utils";
import { NextRequest, NextResponse } from "next/server";

export type { GenericEvaluationResponseBody } from "./types";

function getRequestingIp(context: {
  req: IncomingMessage;
  res: ServerResponse;
}): null | string {
  const key = "x-forwarded-for";
  const xForwardedFor = context.req.headers[key];
  if (typeof xForwardedFor === "string") return xForwardedFor;
  const remoteAddress = context.req.socket.remoteAddress;
  if (remoteAddress) return remoteAddress;
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
};

interface FactoryGetFlagsOptions {
  /**
   * A timeout in milliseconds after which any server-side evaluation requests
   * from `getFlags` inside of `getServerSideProps` will be aborted.
   *
   * Pass `false` to disable this feature.
   */
  serverLoadingTimeout?: number;
  /**
   * A timeout in milliseconds after which any static evaluation requests
   * from `getFlags` inside of `getStaticProps` or `getStaticPaths` will
   * be aborted.
   *
   * Pass `false` to disable this feature.
   */
  staticLoadingTimeout?: number;
}

export function createGetFlags<F extends Flags>(
  config: Configuration<F>,
  {
    serverLoadingTimeout: factoryServerLoadingTimeout = 3000,
    staticLoadingTimeout: factoryStaticLoadingTimeout = 60000,
  }: FactoryGetFlagsOptions = {}
) {
  validate(config);
  return function getFlags(
    options: {
      context:
        | Pick<GetServerSidePropsContext, "req" | "res">
        | GetStaticPathsContext
        | GetStaticPropsContext;
      user?: FlagUser;
      traits?: Traits;
    } & FactoryGetFlagsOptions
  ): Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>> {
    if (!config) throw new MissingConfigurationError();

    const currentStaticLoadingTimeout = has(options, "staticLoadingTimeout")
      ? options.staticLoadingTimeout
      : factoryStaticLoadingTimeout;

    const currentServerLoadingTimeout = has(options, "serverLoadingTimeout")
      ? options.serverLoadingTimeout
      : factoryServerLoadingTimeout;

    // determine visitor key
    const visitorKeyFromCookie = has(options.context, "req")
      ? getCookie(
          (
            options.context as {
              req: IncomingMessage;
              res: ServerResponse;
            }
          ).req.headers.cookie,
          "hkvk"
        )
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
      },
    };

    const requestingIp = has(options.context, "req")
      ? getRequestingIp(
          options.context as {
            req: IncomingMessage;
            res: ServerResponse;
          }
        )
      : null;

    const xForwardedForHeader: { "x-forwarded-for": string } | {} = requestingIp
      ? // add x-forwarded-for header so the service worker gets
        // access to the real client ip
        { "x-forwarded-for": requestingIp }
      : {};

    // prepare fetch request timeout controller
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    const timeoutDuration = has(options.context, "req")
      ? currentServerLoadingTimeout
      : currentStaticLoadingTimeout;
    const timeoutId =
      // validate config
      !controller ||
      typeof timeoutDuration !== "number" ||
      isNaN(timeoutDuration) ||
      timeoutDuration <= 0
        ? null
        : setTimeout(() => controller.abort(), timeoutDuration);

    return fetch([input.endpoint, input.envKey].join("/"), {
      method: "POST",
      headers: Object.assign(
        { "content-type": "application/json" },
        xForwardedForHeader
      ),
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify(input.requestBody),
    }).then(
      (
        workerResponse
      ):
        | Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>>
        | GetFlagsErrorBag<F> => {
        if (timeoutId) clearTimeout(timeoutId);

        if (!workerResponse.ok /* status not 200-299 */) {
          return {
            flags: config.defaultFlags as F,
            data: null,
            error: "response-not-ok",
            initialFlagState: {
              input,
              outcome: { error: "response-not-ok" },
            },
          };
        }

        return workerResponse.json().then(
          (workerResponseBody: GenericEvaluationResponseBody<F>) => {
            if (
              has(options.context, "req") &&
              workerResponseBody.visitor?.key
            ) {
              // always set the cookie so its max age refreshes
              (
                options.context as {
                  req: IncomingMessage;
                  res: ServerResponse;
                }
              ).res.setHeader(
                "Set-Cookie",
                serializeVisitorKeyCookie(workerResponseBody.visitor.key)
              );
            }

            // add defaults to flags here, but not in initialFlagState
            const flags = workerResponseBody.flags
              ? workerResponseBody.flags
              : null;
            const flagsWithDefaults = combineRawFlagsWithDefaultFlags<F>(
              flags,
              config.defaultFlags
            );

            return {
              flags: flagsWithDefaults,
              data: workerResponseBody,
              error: null,
              initialFlagState: {
                input,
                outcome: { data: workerResponseBody },
              },
            };
          },
          (error) => {
            return {
              flags: config.defaultFlags as F,
              data: null,
              error: "invalid-response-body",
              initialFlagState: {
                input,
                outcome: { error: "invalid-response-body" },
              },
            };
          }
        );
      },
      (error) => {
        if (timeoutId) clearTimeout(timeoutId);

        return error?.name === "AbortError"
          ? {
              flags: config.defaultFlags as F,
              data: null,
              error: "request-timed-out",
              initialFlagState: {
                input,
                outcome: { error: "request-timed-out" },
              },
            }
          : {
              flags: config.defaultFlags as F,
              data: null,
              error: "network-error",
              initialFlagState: {
                input,
                outcome: { error: "network-error" },
              },
            };
      }
    );
  };
}
