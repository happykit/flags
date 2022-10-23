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
  GenericEvaluationResponseBody,
  Input,
  GetFlagsSuccessBag,
  GetFlagsErrorBag,
} from "./internal/types";
import {
  has,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
  getCookie,
} from "./internal/utils";
import { applyConfigurationDefaults } from "./internal/apply-configuration-defaults";
import {
  type GetDefinitions,
  toTraits,
  toUser,
  toVariantValues,
  toVisitor,
  DefinitionsInStorage,
} from "./api-route";
import { evaluate } from "./evaluate";

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

  getDefinitions?: GetDefinitions;
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
      const definitionsLatencyStart = Date.now();
      let definitions: DefinitionsInStorage | null;

      try {
        definitions = await currentGetDefinitions(
          config.projectId,
          config.envKey,
          config.environment
        );
      } catch {
        return {
          flags: config.defaultFlags as F,
          data: null,
          error: "network-error",
          initialFlagState: { input, outcome: { error: "network-error" } },
        };
      }
      const definitionsLatencyStop = Date.now();

      if (
        !definitions ||
        definitions.format !== "v1" ||
        definitions.projectId !== config.projectId ||
        !Array.isArray(definitions.flags)
      ) {
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

      if (has(options.context, "req") && visitorKey) {
        // always set the cookie so its max age refreshes
        (
          options.context as {
            req: IncomingMessage;
            res: ServerResponse;
          }
        ).res.setHeader("Set-Cookie", serializeVisitorKeyCookie(visitorKey));
      }

      const evaluated = evaluate({
        flags: definitions.flags,
        environment: config.environment,
        traits: options.traits ? toTraits(options.traits) : null,
        user: options.user ? toUser(options.user) : null,
        visitor: visitorKey ? toVisitor(visitorKey) : null,
      });

      const outcomeData: GenericEvaluationResponseBody<F> = {
        flags: toVariantValues(evaluated) as F,
        visitor: visitorKey ? toVisitor(visitorKey) : null,
      };

      // add defaults to flags here, but not in initialFlagState
      const flags = outcomeData.flags ? outcomeData.flags : null;

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
        data: outcomeData,
        error: null,
        initialFlagState: {
          input,
          outcome: { data: outcomeData },
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
          (outcomeData: GenericEvaluationResponseBody<F>) => {
            if (has(options.context, "req") && outcomeData.visitor?.key) {
              // always set the cookie so its max age refreshes
              (
                options.context as {
                  req: IncomingMessage;
                  res: ServerResponse;
                }
              ).res.setHeader(
                "Set-Cookie",
                serializeVisitorKeyCookie(outcomeData.visitor.key)
              );
            }

            // add defaults to flags here, but not in initialFlagState
            const flags = outcomeData.flags ? outcomeData.flags : null;
            const flagsWithDefaults = combineRawFlagsWithDefaultFlags<F>(
              flags,
              config.defaultFlags
            );

            return {
              flags: flagsWithDefaults,
              data: outcomeData,
              error: null,
              initialFlagState: {
                input,
                outcome: { data: outcomeData },
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
