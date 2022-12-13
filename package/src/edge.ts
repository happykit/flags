/** global: fetch */
import type { NextRequest } from "next/server";
import type { Configuration } from "./config";
import type { CookieSerializeOptions } from "cookie";
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
import { combineRawFlagsWithDefaultFlags, has } from "./internal/utils";
import { applyConfigurationDefaults } from "./internal/apply-configuration-defaults";
import type { GetDefinitions, Definitions } from "./api-route";
import {
  evaluate,
  toTraits,
  toUser,
  toVariantValues,
  toVisitor,
} from "./evaluate";
import { resolvingErrorBag } from "./internal/errors";

export type { GenericEvaluationResponseBody } from "./internal/types";

function getRequestingIp(req: Pick<NextRequest, "headers">): null | string {
  const key = "x-forwarded-for";
  const xForwardedFor = req.headers.get(key);
  if (typeof xForwardedFor === "string") return xForwardedFor;
  return null;
}

interface FactoryGetEdgeFlagsOptions {
  getDefinitions?: GetDefinitions;
}

/**
 * Creates the getEdgeFlags() function your application should use when
 * loading flags from Middleware or Edge API Routes.
 */
export function createGetEdgeFlags<F extends Flags>(
  configuration: Configuration<F>,
  { getDefinitions: factoryGetDefinitions }: FactoryGetEdgeFlagsOptions = {}
) {
  const cookieOptions: CookieSerializeOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  };

  const config = applyConfigurationDefaults(configuration);
  return async function getEdgeFlags(
    options: {
      request: Pick<NextRequest, "cookies" | "headers">;
      user?: FlagUser;
      traits?: Traits;
    } & FactoryGetEdgeFlagsOptions
  ): Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>> {
    const currentGetDefinitions = has(options, "getDefinitions,")
      ? options.getDefinitions
      : factoryGetDefinitions;

    // determine visitor key
    let visitorKeyFromCookie;
    if (typeof options.request.cookies.get === "function") {
      const fromCookiesGet = options.request.cookies.get("hkvk");

      // @ts-expect-error -- In Next.js 13, the value returned from cookies.get() is an object with the type: { name: string, value: string }
      visitorKeyFromCookie = typeof fromCookiesGet === 'string' ? fromCookiesGet : fromCookiesGet?.value;
    } else {
      // backwards compatible for when cookies was { [key: string]: string; }
      // in Next.js
      visitorKeyFromCookie = (options.request.cookies as any).hkvk || null;
    }

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

    // new logic
    if (currentGetDefinitions) {
      const definitionsLatencyStart = Date.now();
      let definitions: Definitions | null;
      try {
        definitions = await currentGetDefinitions(
          config.projectId,
          config.envKey,
          config.environment
        );
      } catch {
        return resolvingErrorBag<F>({
          error: "network-error",
          flags: config.defaultFlags,
          input,
          cookie: null,
        });
      }
      const definitionsLatencyStop = Date.now();

      // if definitions don't contain what we expect them to
      if (
        !definitions ||
        definitions.format !== "v1" ||
        definitions.projectId !== config.projectId ||
        !Array.isArray(definitions.flags)
      ) {
        return resolvingErrorBag<F>({
          error: "response-not-ok",
          flags: config.defaultFlags,
          input,
          cookie: null,
        });
      }

      const evaluated = evaluate({
        flags: definitions.flags,
        environment: config.environment,
        traits: options.traits ? toTraits(options.traits) : null,
        user: options.user ? toUser(options.user) : null,
        visitor: visitorKey ? toVisitor(visitorKey) : null,
      });

      // not actually a response, as we evaluated inline
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

      return {
        flags: flagsWithDefaults,
        data: outcomeData,
        error: null,
        initialFlagState: {
          input,
          outcome: { data: outcomeData },
        },
        cookie: outcomeData.visitor?.key
          ? {
              name: "hkvk",
              value: outcomeData.visitor.key,
              options: cookieOptions,
              args: ["hkvk", outcomeData.visitor.key, cookieOptions],
            }
          : null,
      };
    }
    // end new logic

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
          return resolvingErrorBag<F>({
            error: "response-not-ok",
            flags: config.defaultFlags,
            input,
            cookie: null,
          });
        }

        return workerResponse.json().then(
          (outcomeData: GenericEvaluationResponseBody<F>) => {
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
              cookie: outcomeData.visitor?.key
                ? {
                    name: "hkvk",
                    value: outcomeData.visitor.key,
                    options: cookieOptions,
                    args: ["hkvk", outcomeData.visitor.key, cookieOptions],
                  }
                : null,
            };
          },
          () => {
            return resolvingErrorBag<F>({
              error: "invalid-response-body",
              flags: config.defaultFlags,
              input,
              cookie: null,
            });
          }
        );
      },
      () => {
        return resolvingErrorBag<F>({
          error: "network-error",
          input,
          flags: config.defaultFlags,
          cookie: null,
        });
      }
    );
  };
}
