import type {
  Environment,
  Flag,
  FlagUserAttributes,
  FlagVariant,
  FlagVisitor,
} from "./evaluation-types";
import type { NextFetchEvent, NextRequest } from "next/server";
import { unstable_evaluate } from "./evaluate";

export function toUser(incomingUser: {
  key: string;
  email?: unknown;
  name?: unknown;
  avatar?: unknown;
  language?: unknown;
  country?: unknown;
  timeZone?: unknown;
}) {
  if (!incomingUser) return null;
  if (typeof incomingUser !== "object") return null;
  if (typeof incomingUser.key !== "string") return null;
  if (incomingUser.key.trim().length === 0) return null;

  const user: FlagUserAttributes = {
    key: incomingUser.key.trim().substring(0, 516),
  };

  if (typeof incomingUser.email === "string")
    user.email = incomingUser.email.trim().substring(0, 516);
  if (typeof incomingUser.name === "string")
    user.name = incomingUser.name.trim().substring(0, 516);
  if (typeof incomingUser.avatar === "string")
    user.avatar = incomingUser.avatar.trim().substring(0, 1024);
  if (typeof incomingUser.language === "string")
    user.language = incomingUser.language.trim().substring(0, 1024);
  if (typeof incomingUser.timeZone === "string")
    user.timeZone = incomingUser.timeZone.trim().substring(0, 128);
  if (typeof incomingUser.country === "string")
    user.country = incomingUser.country.trim().substring(0, 2).toUpperCase();

  return user;
}

// the visitor attributes are always collected by the worker
export function toVisitor(visitorKey: string): FlagVisitor {
  return { key: visitorKey };
}

/**
 * Traits must be JSON.stringify-able and the result may at most be 4096 chars.
 * Keys may at most be 1024 chars.
 * otherwise the trait gets left out.
 */
export function toTraits(
  incomingTraits?: {
    [key: string]: any;
  } | null
): { [key: string]: any } | null {
  if (!incomingTraits) return null;
  if (typeof incomingTraits !== "object") return null;

  return Object.entries(incomingTraits).reduce<{ [key: string]: any }>(
    (acc, [key, value]) => {
      if (String(key).length > 1024) return acc;
      try {
        if (JSON.stringify(value).length > 4096) return acc;
      } catch (e) {
        return acc;
      }
      acc[key] = value;
      return acc;
    },
    {}
  );
}

export function toVariantValues(
  input: Record<string, FlagVariant | null>
): Record<string, FlagVariant["value"] | null> {
  return Object.entries(input).reduce<
    Record<string, FlagVariant["value"] | null>
  >((acc, [key, variant]) => {
    acc[key] = variant ? variant.value : null;
    return acc;
  }, {});
}

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

export type unstable_DefinitionsInStorage = {
  projectId: string;
  format: "v1";
  revision: string;
  flags: Flag[];
};

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

// export function unstable_createWriteHandler({
//   /**
//    * Store feature flag definitions in your data source.
//    * Called when you change feature flags in HappyKit's UI.
//    */
//   setDefinitions,
//   apiKey,
//   corsHeaders = defaultCorsHeaders,
// }: {
//   setDefinitions: (
//     projectId: string,
//     definitions: unstable_DefinitionsInStorage
//   ) => Promise<boolean>;
//   apiKey: string;
//   corsHeaders?: Record<string, string>;
// }) {
//   const headers = { ...corsHeaders, "content-type": "application/json" };

//   return async function writeHandler(
//     request: NextRequest,
//     event: NextFetchEvent
//   ) {
//     // handler is called to store flags
//     if (request.method === "PUT") {
//       if (request.headers.get("Authorization") !== `Bearer ${apiKey}`) {
//         return new Response(null, {
//           status: 401,
//           statusText: "Unauthorized",
//           headers: corsHeaders,
//         });
//       }

//       const data = (await request.json().catch(() => null)) as {
//         projectId: string;
//         definitions: unstable_DefinitionsInStorage;
//       } | null;

//       if (!data || !data.projectId || !data.definitions) {
//         return new Response(
//           JSON.stringify({ reason: "Invalid request body" }),
//           { status: 422, headers }
//         );
//       }

//       const ok = await setDefinitions(data.projectId, data.definitions);

//       return ok
//         ? new Response(null, { status: 200, headers: corsHeaders })
//         : new Response(null, {
//             status: 500,
//             statusText: "Could not store definitions",
//             headers: corsHeaders,
//           });
//     }

//     // to avoid handling additional requests during development
//     return new Response(null, { status: 404, headers });
//   };
// }

export function unstable_createReadHandler({
  /**
   * Load feature flag definitions from your data source.
   * Called when feature flags are evaluated.
   */
  getDefinitions,
  corsHeaders = defaultCorsHeaders,
  serverTiming = false,
}: {
  getDefinitions: (
    projectId: string,
    envKey: string,
    environment: Environment
  ) => Promise<null | unstable_DefinitionsInStorage>;
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

    const evaluatedVariants = unstable_evaluate({
      flags,
      environment,
      user,
      visitor,
      traits,
    });

    const serverTimingHeader = serverTiming
      ? {
          "Server-Timing": [
            originStop !== null && originStart !== null
              ? `origin;dur=${originStop - originStart}`
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
