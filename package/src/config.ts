export type User = {
  key: string;
  persist?: boolean;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

export type Traits = { [key: string]: any };

export type Flags = {
  [key: string]: boolean | number | string;
};

export class MissingConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Missing configuration. Call configure() first.");
  }
}

export type FeatureFlagUser = User;
export type FeatureFlagTraits = Traits;
export type FeatureFlags = Flags;

export type EvaluationRequestBody = {
  visitorKey: string | null;
  user: User | null;
  traits: Traits | null;
};

export type EvaluationResponseBody = {
  visitor: { key: string };
  flags: { [key: string]: number | boolean | string };
};

export type InitialFlagStateWithResponse = {
  requestBody: EvaluationRequestBody;
  responseBody: EvaluationResponseBody;
};

export type InitialFlagStateWithoutResponse = {
  requestBody: EvaluationRequestBody;
  responseBody: null;
};

export type InitialFlagState =
  | InitialFlagStateWithResponse
  | InitialFlagStateWithoutResponse;

export class InvalidConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Invalid configuration");
  }
}

type IncomingConfiguration = {
  envKey: string;
  endpoint?: string;
  defaultFlags?: Flags;
  revalidateOnFocus?: boolean;
  disableCache?: boolean;
};

type DefaultConfiguration = {
  endpoint: string;
  fetch: typeof fetch;
  defaultFlags: {};
  revalidateOnFocus: boolean;
  disableCache: boolean;
};

export type Configuration = DefaultConfiguration & IncomingConfiguration;
export let config: Configuration | null = null;

export function configure(
  options: IncomingConfiguration & Partial<DefaultConfiguration>
) {
  const defaults: DefaultConfiguration = {
    endpoint: "https://happykit.dev/api/flags",
    fetch,
    defaultFlags: {},
    revalidateOnFocus: true,
    disableCache: false,
  };

  if (
    !options ||
    typeof options.envKey !== "string" ||
    options.envKey.length === 0
  )
    throw new InvalidConfigurationError();

  config = Object.assign({}, defaults, options);
}

export function isConfigured(c: Configuration | null): c is Configuration {
  return c !== null;
}

export function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// copied from https://github.com/moroshko/shallow-equal/blob/1a6bf512cf896b44f3b7bb3d493411a7c5339a25/src/objects.js
export function shallowEqual(objA: any, objB: any) {
  if (objA === objB) return true;

  if (!objA || !objB) return false;

  let aKeys = Object.keys(objA);
  let bKeys = Object.keys(objB);
  let len = aKeys.length;

  if (bKeys.length !== len) return false;

  for (let i = 0; i < len; i++) {
    let key = aKeys[i];

    if (objA[key] !== objB[key] || !hasOwnProperty(objB, key)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets the cookie by the name
 *
 * From: https://developers.cloudflare.com/workers/examples/extract-cookie-value
 */
export function getCookie(
  cookieString: string | null | undefined,
  name: string
) {
  if (cookieString) {
    const cookies = cookieString.split(";");
    for (let cookie of cookies) {
      const cookiePair = cookie.split("=", 2);
      const cookieName = cookiePair[0].trim();
      if (cookieName === name) return cookiePair[1];
    }
  }
  return null;
}
