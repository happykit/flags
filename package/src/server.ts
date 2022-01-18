/** global: fetch */
import { IncomingMessage, ServerResponse } from "http";
import AbortController from "abort-controller";
import type {
  GetServerSidePropsContext,
  GetStaticPathsContext,
  GetStaticPropsContext,
} from "next";
import { config, Configuration, isConfigured } from "./config";
import { nanoid } from "nanoid";
import {
  FlagUser,
  Traits,
  MissingConfigurationError,
  Flags,
  SuccessInitialFlagState,
  ErrorInitialFlagState,
  EvaluationResponseBody,
  ResolvingError,
  Input,
} from "./types";
import {
  has,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
  getCookie,
} from "./utils";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import * as fs from "fs";
import * as path from "path";

export type { EvaluationResponseBody } from "./types";

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
  data: EvaluationResponseBody<F> | null;
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

function determineLeader(lockFile: string) {
  try {
    // fail if file exists
    fs.writeFileSync(lockFile, "", { flag: "wx" });
    process.on("exit", () => {
      fs.unlinkSync(lockFile);
      console.log("PROCESS EXIT");
    });
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return false;
  }
}

export function getFlags<F extends Flags = Flags>(options: {
  context:
    | Pick<GetServerSidePropsContext, "req" | "res">
    | GetStaticPathsContext
    | GetStaticPropsContext;
  user?: FlagUser;
  traits?: Traits;
  serverLoadingTimeout?: number | false;
  staticLoadingTimeout?: number | false;
}): Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>> {
  if (!isConfigured(config)) throw new MissingConfigurationError();
  const staticConfig = config as Configuration<F>;

  const currentStaticLoadingTimeout = has(options, "staticLoadingTimeout")
    ? options.staticLoadingTimeout
    : config.staticLoadingTimeout || 0;

  const currentServerLoadingTimeout = has(options, "serverLoadingTimeout")
    ? options.serverLoadingTimeout
    : config.serverLoadingTimeout || 0;

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

  // prepare fetch request timeout controller
  const controller = new AbortController();
  const timeoutDuration = has(options.context, "req")
    ? currentServerLoadingTimeout
    : currentStaticLoadingTimeout;
  const timeoutId =
    // validate config
    typeof timeoutDuration !== "number" ||
    isNaN(timeoutDuration) ||
    timeoutDuration <= 0
      ? null
      : setTimeout(() => controller.abort(), timeoutDuration);

  const lockFile = path.join(process.cwd(), ".happykit");
  const leader = determineLeader(lockFile);
  console.log(leader ? "leading" : "not leading");

  // only fetch flag definitions once during builds
  const workerResponsePromise =
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
      ? // TODO load definitions and resolve locally instead of loading resolved flags
        // - needs package/src/evaluate (and an API which returns flag definitions)
        // - needs its own representation of flags that uses bloom filters
        // the flag definition type should live inside of @happykit/flags and
        // get reused by the happykit/site worker
        new Promise<Response>((resolve) => {
          if (leader) {
            console.log("fetching..", input.endpoint);
            // this loads resolved flags at the moment, but should ultimately
            // load flag definitions
            return fetch([input.endpoint, input.envKey].join("/"), {
              method: "POST",
              headers: Object.assign(
                { "content-type": "application/json" },
                xForwardedForHeader
              ),
              signal: controller?.signal,
              body: JSON.stringify(input.requestBody),
            })
              .then((res) => res.json())
              .then(
                (body) => {
                  console.log("writing");
                  fs.writeFileSync(lockFile, JSON.stringify(body));
                  console.log("resolving");
                  return resolve(new Response(body));
                },
                () => {
                  console.log("failed to read");
                }
              );
          }

          // we are not the leader, wait for the file
          console.log("start watching");
          const watcher = fs.watch(lockFile, (event, filename) => {
            console.log(event, filename);
            if (!filename || event !== "change") return;
            const content = fs.readFileSync(lockFile, "utf-8");
            console.log("watching read", content);
            resolve(JSON.parse(content));
            watcher.close();
          });

          console.log("trying immediate read");
          // check once manually in case we started waching too late
          fs.readFile(lockFile, "utf-8", (err, content) => {
            if (content && content.length > 0) {
              console.log("immediately read", content);
              watcher.close();
              resolve(JSON.parse(content));
            }
          });
        })
      : // load from server
        fetch([input.endpoint, input.envKey].join("/"), {
          method: "POST",
          headers: Object.assign(
            { "content-type": "application/json" },
            xForwardedForHeader
          ),
          signal: controller?.signal,
          body: JSON.stringify(input.requestBody),
        });

  return workerResponsePromise.then(
    (
      workerResponse
    ):
      | Promise<GetFlagsSuccessBag<F> | GetFlagsErrorBag<F>>
      | GetFlagsErrorBag<F> => {
      if (timeoutId) clearTimeout(timeoutId);

      if (!workerResponse.ok /* status not 200-299 */) {
        return {
          flags: staticConfig.defaultFlags as F,
          data: null,
          error: "response-not-ok",
          initialFlagState: { input, outcome: { error: "response-not-ok" } },
        };
      }

      return workerResponse.json().then(
        (workerResponseBody: EvaluationResponseBody<F>) => {
          if (has(options.context, "req") && workerResponseBody.visitor?.key) {
            // always set the cookie so its max age refreshes
            options.context.res.setHeader(
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
            staticConfig.defaultFlags
          );

          return {
            flags: flagsWithDefaults,
            data: workerResponseBody,
            error: null,
            initialFlagState: { input, outcome: { data: workerResponseBody } },
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
          };
        }
      );
    },
    (error) => {
      if (timeoutId) clearTimeout(timeoutId);

      return error?.name === "AbortError"
        ? {
            flags: staticConfig.defaultFlags as F,
            data: null,
            error: "request-timed-out",
            initialFlagState: {
              input,
              outcome: { error: "request-timed-out" },
            },
          }
        : {
            flags: staticConfig.defaultFlags as F,
            data: null,
            error: "network-error",
            initialFlagState: { input, outcome: { error: "network-error" } },
          };
    }
  );
}
