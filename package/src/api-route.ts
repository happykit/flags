import type { Environment, Flag } from "./evaluation-types";
import type { NextFetchEvent, NextRequest } from "next/server";
import {
  evaluate,
  toTraits,
  toUser,
  toVariantValues,
  toVisitor,
} from "./evaluate";

// function toVariantIds(
//   input: Record<string, FlagVariant | null>
// ): Record<string, FlagVariant["id"] | null> {
//   return Object.entries(input).reduce<Record<string, FlagVariant["id"] | null>>(
//     (acc, [key, variant]) => {
//       acc[key] = variant ? variant.id : null;
//       return acc;
//     },
//     {}
//   );
// }

export type Definitions = {
  projectId: string;
  format: "v1";
  revision: string;
  flags: Flag[];
};

export type GetDefinitions = (
  projectId: string,
  envKey: string,
  environment: Environment
) => Promise<Definitions | null>;

// We support the GET, POST, HEAD, and OPTIONS methods from any origin,
// and allow any header on requests. These headers must be present
// on all responses to all CORS preflight requests. In practice, this means
// all responses to OPTIONS requests.
const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "*",
};

export function createApiRoute({
  /**
   * Load feature flag definitions from your data source.
   * Called when feature flags are evaluated.
   */
  getDefinitions,
  corsHeaders = defaultCorsHeaders,
  serverTiming = false,
}: {
  getDefinitions: GetDefinitions;
  corsHeaders?: Record<string, string>;
  serverTiming?: boolean;
}) {
  const headers = { ...corsHeaders, "content-type": "application/json" };

  return async function readHandler(
    request: NextRequest,
    event: NextFetchEvent
  ) {
    // to avoid handling additional requests during development
    if (request.url.endsWith("favicon.ico")) {
      return new Response(null, { status: 404, headers });
    }

    const body =
      request.method === "POST" ? await request.json().catch(() => ({})) : {};

    const visitorKeyFromRequestBody: string | null =
      body && typeof body.visitorKey === "string" ? body.visitorKey : null;

    // get visitor key from request body
    // or use "null" and assume that this is a static render
    //
    // this also means that it's the client's job to generate a visitorKey before
    // sending the request in case no key exists yet (e.g. for ssr)
    const visitorKey = visitorKeyFromRequestBody
      ? visitorKeyFromRequestBody
      : null;

    const user = toUser(body ? body.user : null);

    // visitor might be null when feature flags are requested for a static site
    const visitor = visitorKey ? toVisitor(visitorKey) : null;
    const traits = toTraits(body ? body.traits : null);

    // parse the environment from /api/flags/:environment instead
    // determine environment based on key to avoid additional request
    //
    // the worker route is defined as /api/flags* so that it matches these:
    // - /api/flags
    // - /api/flags/flags_pub_xxxxxxx
    // - /api/flags/flags_pub_preview_xxxxxxx
    // - /api/flags/flags_pub_development_xxxxxxx
    //
    // See https://developers.cloudflare.com/workers/platform/routes
    // currently done in wrangler.toml, but not sure it's correct
    const envKey = (() => {
      const match = new URL(request.url).pathname.match(
        /^\/api\/flags\/([_a-z0-9]+)$/
      );
      // try to use env key from url param at /api/flags/:envKey
      return match && match.length === 2 ? match[1] : null;
    })();

    if (typeof envKey !== "string")
      // The response body is for developers only, it is not used by @happykit/flags
      return new Response(JSON.stringify({ reason: "Missing envKey" }), {
        status: 422,
        headers,
      });

    const match = envKey.match(
      /^flags_pub_(?:(development|preview|production)_)?([a-z0-9]+)$/
    );

    if (!match || match.length < 2)
      // The response body is for developers only, it is not used by @happykit/flags
      return new Response(JSON.stringify({ reason: "Invalid envKey" }), {
        status: 422,
        headers,
      });

    const environment: Environment = (match[1] as Environment) || "production";
    const projectId = match[2];

    let flags: Flag[];

    // read definitions from storage based on projectId
    const originStart = Date.now();
    const definitions = await getDefinitions(projectId, envKey, environment);
    const originStop = Date.now();

    if (!definitions)
      return new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
        headers,
      });

    flags = definitions.flags;

    const evaluatedVariants = evaluate({
      flags,
      environment,
      user,
      visitor,
      traits,
    });

    const serverTimingHeader = serverTiming
      ? {
          "server-timing": [
            originStop !== null && originStart !== null
              ? `definitions;dur=${originStop - originStart}`
              : null,
          ]
            .filter(Boolean)
            .join(", "),
        }
      : null;

    return new Response(
      JSON.stringify({
        flags: toVariantValues(evaluatedVariants),
        // resolvedVariantIds: toVariantIds(evaluatedVariants),
        visitor: visitorKey ? { key: visitorKey } : null,
      }),
      { headers: { ...headers, ...serverTimingHeader } }
    );
  };
}
