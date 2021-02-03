import * as React from 'react';
import { nanoid } from 'nanoid';

/* global fetch:false */

export type Flags = { [key: string]: boolean | number | string | undefined };

/**
 * The response the Service Worker at /api/flags/xx makes
 */
type FlagsResponse<F extends Flags> = { flags: F; visitor: { key: string } };

type FlagConfig<F extends Flags = Flags> = {
  /**
   * Your HappyKit Flags Key.
   *
   * It should look similar to `flags_pub_277203581177692685`.
   *
   * You can use that value if you just want to play around.
   * You will receive one flag called `dog` which is turned on.
   *
   * You can find this key in your Project settings on https://happykit.dev
   */
  envKey: string;
  /**
   * This is internal and you don't need to provide it.
   *
   * It defines where the Flags are loaded from.
   */
  endpoint: string;
  /**
   * Key-value pairs of flags and their values. These values are used as
   * fallbacks in `useFlags` and `getFlags`. The fallbacks are used while the
   * actual flags are loaded, in case a flag is missing or when the request
   * loading the flags fails for unexpected reasons. If you don't declare
   * `defaultFlags`, then the flag values will be `undefined`.
   */
  defaultFlags?: F;
  /**
   * Pass `true` to turn off the client-side cache.
   * The cache is persisted to `localStorage` and persists across page loads.
   * Even with an enabled cache, all flags will get revalidated in
   * [`stale-while-revalidate`](https://tools.ietf.org/html/rfc5861) fashion.
   */
  disableCache?: boolean;
  /**
   * The key under which cached responses will be saved locally
   */
  localStorageCacheKey: string;
};

const defaultConfig: Partial<FlagConfig> = {
  endpoint: 'https://happykit.dev/api/flags',
  localStorageCacheKey: 'happykit_flags_v1',
};

let config: FlagConfig | null = null;

export type FlagUser = {
  key: string;
  persist?: boolean;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

export type FlagOptions<F extends Flags> = {
  /**
   * This is the flag user which the flags will be evaluated for.
   */
  user?: FlagUser;
  /**
   * In case you preloaded your flags during server-side rendering using
   * `getFlags()`, provide the flags as `initialFlags`.
   * The client will then skip the initial request and use the provided flags
   * instead.
   * This allows you to get rid of loading states on the client.
   */
  initialFlags?: F;
  /**
   * By default, the client will revalidate all feature flags when the browser
   * window regains focus. Pass `false` to skip this behaviour.
   */
  revalidateOnFocus?: boolean;
};

/**
 * For testing purposes only
 */
export const _reset =
  process.env.NODE_ENV === 'production'
    ? () => {}
    : function _reset<F extends Flags>(nextConfig: FlagConfig<F> | null) {
        config = nextConfig;
        map.clear();
      };

export function configure<F extends Flags>(
  nextConfig: { envKey: string } & Partial<FlagConfig<F>>
) {
  if (typeof nextConfig !== 'object')
    throw new Error('@happykit/flags: config must be an object');

  if (typeof nextConfig.envKey !== 'string')
    throw new Error('@happykit/flags: Missing envKey');

  config = Object.assign({}, defaultConfig, nextConfig) as FlagConfig<F>;
}

function isString(object: any): object is string {
  return typeof object === 'string';
}

function toUser(incomingUser: any): FlagUser | null {
  if (typeof incomingUser !== 'object') return null;

  // users must have a key
  if (!isString(incomingUser.key) || incomingUser.key.trim().length === 0)
    return null;

  const user: FlagUser = { key: incomingUser.key.trim() };

  if (incomingUser?.persist) user.persist = true;
  if (isString(incomingUser?.email)) user.email = incomingUser.email;
  if (isString(incomingUser?.name)) user.name = incomingUser.name;
  if (isString(incomingUser?.avatar)) user.avatar = incomingUser.avatar;
  if (isString(incomingUser?.country)) user.country = incomingUser.country;

  return user;
}

// copied from https://github.com/moroshko/shallow-equal/blob/1a6bf512cf896b44f3b7bb3d493411a7c5339a25/src/objects.js
function shallowEqual(objA: any, objB: any) {
  if (objA === objB) return true;

  if (!objA || !objB) return false;

  let aKeys = Object.keys(objA);
  let bKeys = Object.keys(objB);
  let len = aKeys.length;

  if (bKeys.length !== len) return false;

  for (let i = 0; i < len; i++) {
    let key = aKeys[i];

    if (
      objA[key] !== objB[key] ||
      !Object.prototype.hasOwnProperty.call(objB, key)
    ) {
      return false;
    }
  }

  return true;
}

function createBody(userAttributes: FlagUser | null) {
  const body: { user?: FlagUser } = {};

  if (userAttributes) body.user = userAttributes;

  return body;
}

/**
 * A Map of the currently in-progress requests.
 */
const map = new Map<string, Promise<FlagsResponse<Flags>>>();

/**
 * Fetches flags, ...
 *
 * ...but only if no other fetch for the same flag with the same endpoint and
 * request body is in progress.
 *
 * Otherwise it returns the promise of the already in-progress request.
 * @param endpoint The endpoint fetched from
 * @param body Stringified request body containing the envKey & userAttributes.
 */
async function queuedFetchFlags<F extends Flags>(
  endpoint: string,
  envKey: string,
  body: string
): Promise<FlagsResponse<F> | null> {
  const url = [endpoint, envKey].join('/');
  const queueKey = JSON.stringify({ url, body });
  const queuedPromise = map.get(queueKey) as
    | Promise<FlagsResponse<F>>
    | undefined;

  if (queuedPromise) return queuedPromise;

  const promise = fetch(url, { method: 'POST', body }).then(
    response => (response.ok ? response.json() : null),
    () => null
  );
  map.set(queueKey, promise);

  promise.then(() => {
    map.delete(queueKey);
  });

  return promise;
}

async function fetchFlags<F extends Flags>({
  config,
  userAttributes,
}: {
  config: FlagConfig;
  userAttributes: FlagUser | null;
  skipQueue?: boolean;
}): Promise<FlagsResponse<F> | null> {
  try {
    const flagsResponse = await queuedFetchFlags<F>(
      config.endpoint,
      config.envKey,
      JSON.stringify(createBody(userAttributes))
    );

    return flagsResponse;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function storeFlagsResponseInCache<F extends Flags>(
  config: FlagConfig<F>,
  flagsResponse: FlagsResponse<F>,
  user: FlagUser | null
) {
  try {
    localStorage.setItem(
      config.localStorageCacheKey,
      JSON.stringify({
        endpoint: config.endpoint,
        envKey: config.envKey,
        flagsResponse,
        user,
      })
    );
  } catch (e) {
    // chrome can throw when no permission for localStorage has been granted
    // https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document
  }
}

function loadFlagsResponseFromCache<F extends Flags>(options: {
  config: FlagConfig;
  user: FlagUser | null;
}): FlagsResponse<F> | null {
  try {
    const cached: {
      endpoint: string;
      envKey: string;
      user?: FlagUser;
      flagsResponse: FlagsResponse<F>;
    } | null = JSON.parse(
      // putting String() in here is just a nice way to turn null which
      // getItem() might return into a string ("null"), so that JSON.parse()
      // succeeds in that case as it ends up being JSON.parse("null") which
      // returns null.
      String(localStorage.getItem(options.config.localStorageCacheKey))
    );

    return cached &&
      cached.endpoint === options.config.endpoint &&
      cached.envKey === options.config.envKey &&
      // userAttributes could be undefined or null, so we have to make sure that
      // we treat falsy values as being equal.
      shallowEqual(options.user, cached.user)
      ? cached.flagsResponse
      : null;
  } catch (e) {
    // chrome can throw when no permission for localStorage has been granted
    // https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document
    return null;
  }
}

function isFullyConfiguredFlagConfig(
  config: Partial<FlagConfig> | null
): config is FlagConfig & { envKey: string } {
  return (
    config !== null &&
    typeof config.envKey === 'string' &&
    config.envKey.trim().length > 0 &&
    typeof config.endpoint === 'string' &&
    config.endpoint.trim().length > 0
  );
}

/**
 * Gets the cookie with by name
 */
function getCookie(name: string): string | null {
  let cookieString: string;
  try {
    cookieString = document.cookie;
  } catch (e) {
    return null;
  }

  if (cookieString) {
    const cookies = cookieString.split(';');
    for (let cookie of cookies) {
      const cookiePair = cookie.split('=', 2);
      const cookieName = cookiePair[0].trim();
      if (cookieName === name) {
        const cookieVal = cookiePair[1];
        return cookieVal;
      }
    }
  }

  return null;
}

/**
 * Fetch flags primitive. Use this only if you're interested in the loading
 * state, use useFlag otherwise.
 *
 * @param options flag options
 * @returns null while loading, Flags otherwise
 */
function usePrimitiveFlags<F extends Flags>(
  options?: FlagOptions<F>
): FlagsResponse<F> | null {
  if (!isFullyConfiguredFlagConfig(config)) {
    throw new Error('@happykit/flags: Missing config.envKey');
  }

  // use "null" to indicate that no initial flags were provided, but never
  // return "null" from the hook
  const initialFlags = options?.initialFlags ? options.initialFlags : null;
  const [flagsResponse, setFlagsResponse] = React.useState<FlagsResponse<
    F
  > | null>(
    initialFlags
      ? {
          flags: initialFlags,
          // use existing visitor key or generate a fresh one
          visitor: { key: getCookie('hkvk') || nanoid() },
        }
      : null
  );

  const initialUser = options?.user ? toUser(options.user) : null;
  const [userAttributes, setUserAttributes] = React.useState<FlagUser | null>(
    initialUser
  );

  // populate flags from cache after first render, unless they already match
  // the cached version.
  //
  // We need to wait for the initial render to complete so the server-side
  // markup matches the initial client-side render
  React.useEffect(() => {
    if (!isFullyConfiguredFlagConfig(config)) {
      throw new Error('@happykit/flags: Missing config.envKey');
    }

    if (initialFlags || config.disableCache) return;

    const cachedFlagsResponse = loadFlagsResponseFromCache<F>({
      config: config as FlagConfig<F>,
      user: initialUser,
    });

    if (!shallowEqual(flagsResponse?.flags, cachedFlagsResponse?.flags)) {
      setFlagsResponse(cachedFlagsResponse || null);
    }
  }, [flagsResponse, initialFlags, initialUser]);

  // fetch on mount when no initialFlags were provided
  React.useEffect(() => {
    if (initialFlags !== null || !isFullyConfiguredFlagConfig(config)) return;

    let mounted = true;

    fetchFlags<F>({ config, userAttributes }).then(nextFlagsResponse => {
      if (!isFullyConfiguredFlagConfig(config)) {
        throw new Error('@happykit/flags: Missing config.envKey');
      }

      // skip in case the request failed
      if (!nextFlagsResponse) return;
      // skip in case the component unmounted
      if (!mounted) return;

      setFlagsResponse(nextFlagsResponse);

      if (!config.disableCache) {
        storeFlagsResponseInCache(config, nextFlagsResponse, userAttributes);
      }
    });

    return () => {
      mounted = false;
    };
  }, [initialFlags, userAttributes]);

  // revalidate when incoming user changes
  const incomingUser = options?.user;
  React.useEffect(() => {
    const incomingUserAttributes = toUser(incomingUser);
    if (shallowEqual(userAttributes, incomingUserAttributes)) return;
    setUserAttributes(incomingUserAttributes);
  }, [userAttributes, setUserAttributes, incomingUser]);

  // revalidate on focus
  const revalidateOnFocus = options?.revalidateOnFocus;
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // undefined is treated as truthy since revalidateOnFocus defaults to true
    if (revalidateOnFocus === false) return;

    let latestFetchId: number;
    const listener = async () => {
      const fetchId = (latestFetchId = Date.now());
      if (!isFullyConfiguredFlagConfig(config)) return;

      try {
        const nextFlagsResponse = await queuedFetchFlags<F>(
          config.endpoint,
          config.envKey,
          JSON.stringify(createBody(userAttributes))
        );

        if (!isFullyConfiguredFlagConfig(config)) {
          throw new Error('@happykit/flags: Missing config.envKey');
        }

        if (!nextFlagsResponse) return;

        // skip responses to outdated requests
        if (fetchId !== latestFetchId) return;

        // skip invalid responses
        if (typeof nextFlagsResponse !== 'object') return;

        setFlagsResponse(nextFlagsResponse);

        if (!config.disableCache) {
          storeFlagsResponseInCache(config, nextFlagsResponse, userAttributes);
        }
      } catch (error) {
        console.error(error);
      }
    };

    window.addEventListener('focus', listener);
    return () => {
      window.removeEventListener('focus', listener);
    };
  }, [revalidateOnFocus, setFlagsResponse, userAttributes]);

  return flagsResponse;
}

function addDefaults<F extends Flags>(
  flagsResponse: FlagsResponse<F> | null,
  defaultFlags: Flags = {}
): FlagsResponse<F> {
  if (!flagsResponse) {
    return {
      flags: defaultFlags as F,
      visitor: { key: nanoid() },
    };
  }

  if (
    flagsResponse.flags &&
    Object.keys(defaultFlags).every(key => flagsResponse.hasOwnProperty(key))
  )
    return flagsResponse;

  return {
    ...flagsResponse,
    flags: Object.assign({}, defaultFlags, flagsResponse.flags) as F,
  };
}

/**
 * Same as useFlags, but with more info on the returned value.
 *
 * @param options Options like initial flags or the targeted user.
 */
export function useFeatureFlags<F extends Flags>(
  options?: FlagOptions<F>
): {
  flags: F;
  loading: boolean;
  initialFlags: FlagOptions<F>['initialFlags'];
  defaultFlags: FlagConfig<F>['defaultFlags'];
} {
  if (!isFullyConfiguredFlagConfig(config)) {
    console.warn(
      '@happykit/flags: Make sure to call configure({ envKey: "<your env key>" }) in _app before using useFeatureFlags.'
    );
    throw new Error('@happykit/flags: Incomplete config');
  }

  const flags = usePrimitiveFlags<F>(options);

  const defaultFlags = config.defaultFlags;
  const [
    flagsResponseWithDefaults,
    setFlagsResponseWithDefaults,
  ] = React.useState<FlagsResponse<F>>(addDefaults<F>(flags, defaultFlags));

  React.useEffect(() => {
    const nextFlagsResponseWithDefaults = addDefaults(flags, defaultFlags);
    if (shallowEqual(flagsResponseWithDefaults, nextFlagsResponseWithDefaults))
      return;
    setFlagsResponseWithDefaults(nextFlagsResponseWithDefaults);
  }, [flags, flagsResponseWithDefaults, defaultFlags]);

  return {
    flags: flagsResponseWithDefaults.flags,
    loading: flags === null,
    initialFlags: options?.initialFlags,
    defaultFlags: config.defaultFlags as F,
  };
}

export const getFlags =
  typeof window === 'undefined'
    ? async function getFlags<F extends Flags>(
        user?: FlagUser | null
      ): Promise<FlagsResponse<F>> {
        if (!isFullyConfiguredFlagConfig(config)) {
          throw new Error('@happykit/flags: Missing config.envKey');
        }

        const flagsResponse = await fetchFlags<F>({
          config,
          userAttributes: toUser(user),
        });
        const defaultFlags = (config.defaultFlags || {}) as F;
        return addDefaults<F>(flagsResponse, defaultFlags);
      }
    : async function getFlags() {
        throw new Error(
          '@happykit/flags: getFlags may not be called on the client'
        );
      };
