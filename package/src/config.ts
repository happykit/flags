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

export type EvaluationResponseBody<F extends Flags> = {
  visitor: { key: string };
  flags: F;
};

export type InitialFlagStateWithResponse<F extends Flags> = {
  requestBody: EvaluationRequestBody;
  responseBody: EvaluationResponseBody<F>;
};

export type InitialFlagStateWithoutResponse = {
  requestBody: EvaluationRequestBody;
  responseBody: null;
};

export type InitialFlagState<F extends Flags> =
  | InitialFlagStateWithResponse<F>
  | InitialFlagStateWithoutResponse;

export class InvalidConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Invalid configuration");
  }
}

type IncomingConfiguration<F extends Flags> = {
  envKey: string;
  endpoint?: string;
  defaultFlags?: F;
  revalidateOnFocus?: boolean;
  disableCache?: boolean;
};

type DefaultConfiguration = {
  endpoint: string;
  fetch: typeof fetch;
  defaultFlags: Flags;
  revalidateOnFocus: boolean;
  disableCache: boolean;
};

export type Configuration<F extends Flags> = DefaultConfiguration &
  IncomingConfiguration<F>;
export let config: Configuration<Flags> | null = null;

export function configure<F extends Flags = Flags>(
  options: IncomingConfiguration<F> & Partial<DefaultConfiguration>
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

export function isConfigured<F extends Flags, C = Configuration<F>>(
  c: C | null
): c is C {
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
