/** global: fetch */
import { IncomingMessage, ServerResponse } from "http";
import type {
  GetServerSidePropsContext,
  GetStaticPathsContext,
  GetStaticPropsContext,
} from "next";
import type { Configuration } from "./config";
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
import {
  has,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
  getCookie,
} from "./internal/utils";
import { applyConfigurationDefaults } from "./internal/apply-configuration-defaults";
import {
  toTraits,
  toUser,
  toVariantValues,
  toVisitor,
  unstable_DefinitionsInStorage,
} from "./api-route";
import { unstable_evaluate } from "./evaluate";
import { Environment } from "./evaluation-types";

export type { GenericEvaluationResponseBody } from "./internal/types";

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

  getDefinitions?: (
    projectId: string,
    envKey: string,
    environment: Environment
  ) => Promise<null | unstable_DefinitionsInStorage>;
}

/**
 * Creates a getFlags() function your application should use when loading flags on the server.
 */
export function createGetFlags<F extends Flags>(
  configuration: Configuration<F>,
  {
    serverLoadingTimeout: factoryServerLoadingTimeout = 3000,
    staticLoadingTimeout: factoryStaticLoadingTimeout = 60000,
    getDefinitions: factoryGetDefinitions,
  }: FactoryGetFlagsOptions = {}
) {
  const config = applyConfigurationDefaults(configuration);
  return async function getFlags(
    options: {
      context:
        | Pick<GetServerSidePropsContext, "req" | "res">
        | GetStaticPathsContext
        | GetStaticPropsContext;
      user?: FlagUser;
      traits?: Traits;
    } & FactoryGetFlagsOptions
  ): Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>> {
    const currentStaticLoadingTimeout = has(options, "staticLoadingTimeout")
      ? options.staticLoadingTimeout
      : factoryStaticLoadingTimeout;

    const currentServerLoadingTimeout = has(options, "serverLoadingTimeout")
      ? options.serverLoadingTimeout
      : factoryServerLoadingTimeout;

    // todo use whole storage instead?
    const currentGetDefinitions = has(options, "getDefinitions,")
      ? options.getDefinitions
      : factoryGetDefinitions;

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

    // new logic
    if (currentGetDefinitions) {
      // TODO config should parse envKey
      const match = config.envKey.match(
        /^flags_pub_(?:(development|preview|production)_)?([a-z0-9]+)$/
      );
      if (!match) throw new Error("env key not cool");
      const projectId = match[2];
      const environment: Environment =
        (match[1] as Environment) || "production";
      if (!projectId) throw new Error("could not parse projectId from env key");
      if (!environment) throw new Error("could not parse env from env key");
      // end TODO
      // call storage.getDefinitions here

      const definitionsLatencyStart = Date.now();
      const definitions = await currentGetDefinitions(
        projectId,
        config.envKey,
        environment
      ).catch((error) => {
        console.error(error);
        return null;
      });
      const definitionsLatencyStop = Date.now();

      if (!definitions) {
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

      // something like this if the loaded definitions have the wrong
      // shape/version/format/projectId
      //
      // return {
      //   flags: config.defaultFlags as F,
      //   data: null,
      //   error: "invalid-response-body",
      //   initialFlagState: {
      //     input,
      //     outcome: { error: "invalid-response-body" },
      //   },
      // };

      if (has(options.context, "req") && visitorKey) {
        // always set the cookie so its max age refreshes
        (
          options.context as {
            req: IncomingMessage;
            res: ServerResponse;
          }
        ).res.setHeader("Set-Cookie", serializeVisitorKeyCookie(visitorKey));
      }

      const evaluated = unstable_evaluate({
        flags: definitions.flags,
        environment,
        traits: options.traits ? toTraits(options.traits) : null,
        user: options.user ? toUser(options.user) : null,
        visitor: visitorKey ? toVisitor(visitorKey) : null,
      });

      const workerResponseBody: GenericEvaluationResponseBody<F> = {
        flags: toVariantValues(evaluated) as F,
        visitor: visitorKey ? toVisitor(visitorKey) : null,
      };

      // add defaults to flags here, but not in initialFlagState
      const flags = workerResponseBody.flags ? workerResponseBody.flags : null;

      const flagsWithDefaults = combineRawFlagsWithDefaultFlags<F>(
        flags as F | null,
        config.defaultFlags
      );

      console.log("using getFlags with edge config");

      if (options.context) {
        (
          options.context as {
            req: IncomingMessage;
            res?: ServerResponse;
          }
        ).res?.setHeader(
          "x-edge-config-latency",
          String(definitionsLatencyStop - definitionsLatencyStart)
        );
      }

      return {
        flags: flagsWithDefaults,
        data: workerResponseBody,
        error: null,
        initialFlagState: {
          input,
          outcome: { data: workerResponseBody },
        },
      };
    }
    // end new logic

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
