import * as React from 'react';

/* global fetch:false */

export type Flags = { [key: string]: boolean | number | string | undefined };

export type FlagConfig<F extends Flags = Flags> = {
  /**
   * Your HappyKit Flags Client Id.
   *
   * It should look similar to `flags_pub_277203581177692685`.
   *
   * You can use that value if you just want to play around.
   * You will receive one flag called `dog` which is turned on.
   */
  clientId?: string;
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
   * Users are not stored in HappyKit Flags by default.
   *
   * If you set this option to `true` all users with a `key` attribute will be stored in HappyKit Flags.
   * Storing users in HappyKit Flags allows you to see the users in the Dashboard.
   *
   * This setting only affects whether you see individual users in HappyKit Flags or not.
   * It does not affect Feature Flag evaluation, percentage based rollouts or anything else.
   *
   * You can overwrite this setting per user by passing `{ persistUser: true }` to `getFlags` or `useFlags`.
   */
  persistUsers?: boolean;
};

export type FlagUserAttributes = {
  key: string;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

export type FlagOptions<F extends Flags> = {
  /**
   * This is the flag user which the flags will be evaluated for.
   */
  user?: FlagUserAttributes;
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
  /**
   * By default all passed users are stored in HappyKit.
   *
   * Pass `true` to store this user in HappyKit.
   */
  persistUser?: boolean;
};

const defaultConfig: FlagConfig = {
  endpoint: 'https://happykit.dev/api/flags',
  defaultFlags: {},
};

const localStorageCacheKey = 'happykit_flags';

let config: FlagConfig = defaultConfig;

/**
 * For testing purposes only
 */
export const _reset =
  process.env.NODE_ENV === 'production'
    ? () => {}
    : () => {
        config = defaultConfig;
        map.clear();
      };

export function configure<F extends Flags>(
  nextConfig: Partial<FlagConfig<F>> & { clientId: string }
) {
  if (typeof nextConfig !== 'object')
    throw new Error('@happykit/flags: config must be an object');

  if (typeof nextConfig.clientId !== 'string')
    throw new Error('@happykit/flags: Missing clientId');

  config = Object.assign({}, defaultConfig, nextConfig);
}

function toUserAttributes(user: any): FlagUserAttributes | null {
  if (typeof user !== 'object') return null;

  // users must have a key
  if (typeof user.key !== 'string' || user.key.trim().length === 0) return null;
  const userAttributes: FlagUserAttributes = { key: user.key.trim() };

  if (typeof user?.email === 'string') {
    userAttributes.email = user.email;
  }

  if (typeof user?.name === 'string') {
    userAttributes.name = user.name;
  }

  if (typeof user?.avatar === 'string') {
    userAttributes.avatar = user.avatar;
  }

  if (typeof user?.country === 'string') {
    userAttributes.country = user.country;
  }

  return userAttributes;
}

// copied from https://github.com/moroshko/shallow-equal/blob/1a6bf512cf896b44f3b7bb3d493411a7c5339a25/src/objects.js
function shallowEqual(objA: any, objB: any) {
  if (objA === objB) return true;

  if (!objA || !objB) return false;

  var aKeys = Object.keys(objA);
  var bKeys = Object.keys(objB);
  var len = aKeys.length;

  if (bKeys.length !== len) return false;

  for (var i = 0; i < len; i++) {
    var key = aKeys[i];

    if (
      objA[key] !== objB[key] ||
      !Object.prototype.hasOwnProperty.call(objB, key)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * A Map of the currently in-progress requests.
 */
const map = new Map<string, Promise<Flags>>();

/**
 * Fetches flags, ...
 *
 * ...but only if no other fetch for the same flag with the same endpoint and
 * request body is in progress.
 *
 * Otherwise it returns the promise of the already in-progress request.
 * @param endpoint The endpoint fetched from
 * @param body Stringified request body containing the clientId & userAttributes.
 */
async function dedupedFetch<F extends Flags>(
  endpoint: string,
  body: string
): Promise<F | null> {
  const queueKey = JSON.stringify({ endpoint, body });
  const queuedPromise = map.get(queueKey);
  if (queuedPromise) return queuedPromise as Promise<F>;

  const promise = fetch(endpoint, { method: 'POST', body }).then(
    response => (response.ok ? response.json() : null),
    () => null
  );
  map.set(queueKey, promise);

  promise.then(() => {
    map.delete(queueKey);
  });

  return promise as Promise<F>;
}

async function fetchFlags<F extends Flags>({
  config,
  persistUser,
  userAttributes,
}: {
  config: FlagConfig;
  persistUser?: boolean;
  userAttributes: FlagUserAttributes | null;
}): Promise<F | null> {
  const body = (() => {
    const bodyDraft: {
      envKey: FlagConfig['clientId'];
      user?: FlagUserAttributes;
      persistUser?: boolean;
    } = {
      envKey: config.clientId,
    };

    // only set "persistUser" when userAttributes are provided
    // read from config if no value is set in options
    if (
      userAttributes &&
      (persistUser !== undefined ? persistUser : config.persistUsers)
    ) {
      bodyDraft.persistUser = true;
    }

    if (userAttributes) bodyDraft.user = userAttributes;
    return bodyDraft;
  })();

  return dedupedFetch<F>(config.endpoint, JSON.stringify(body)).catch(error => {
    console.error(error);
    return null;
  });
}

function storeFlagsInCache(
  flags: Flags,
  userAttributesKey: string | undefined
) {
  try {
    localStorage.setItem(
      localStorageCacheKey,
      JSON.stringify({
        endpoint: config.endpoint,
        clientId: config.clientId,
        flags,
        userAttributesKey,
      })
    );
  } catch (e) {
    // chrome can throw when no permission for localStorage has been granted
    // https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document
  }
}

function loadFlagsFromCache<F extends Flags>(
  userAttributesKey: string | undefined
): F | null {
  try {
    const cached: {
      endpoint: string;
      clientId: string;
      userAttributesKey?: string;
      flags: F;
    } | null = JSON.parse(
      // putting String() in here is just a nice way to turn null which
      // getItem() might return into a string ("null"), so that JSON.parse()
      // succeeds in that case as it ends up being JSON.parse("null") which
      // returns null.
      String(localStorage.getItem(localStorageCacheKey))
    );

    return cached &&
      cached.endpoint === config.endpoint &&
      cached.clientId === config.clientId &&
      // If we received userAttributes, the cached flags must have been loaded
      // for that specific user.
      // If we didn't receive a userAttributesKey, the flags may not have
      // been loaded for a specific user.
      (userAttributesKey
        ? userAttributesKey === cached.userAttributesKey
        : !cached.userAttributesKey)
      ? cached?.flags
      : null;
  } catch (e) {
    // chrome can throw when no permission for localStorage has been granted
    // https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document
    return null;
  }
}

function hasClientId(config: FlagConfig) {
  return (
    typeof config.clientId === 'string' && config.clientId.trim().length > 0
  );
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
): F | null {
  if (!hasClientId(config)) {
    throw new Error('@happykit/flags: Missing config.clientId');
  }

  // use "null" to indicate that no initial flags were provided, but never
  // return "null" from the hook
  const initialFlags = options?.initialFlags ? options.initialFlags : null;
  const [flags, setFlags] = React.useState<F | null>(initialFlags);

  const initialUserAttributes = options?.user
    ? toUserAttributes(options.user)
    : null;
  const [
    userAttributes,
    setUserAttributes,
  ] = React.useState<FlagUserAttributes | null>(initialUserAttributes);
  const persistUser = options?.persistUser;

  // populate flags from cache after first render
  // We need to wait for the initial render to complete so the server-side
  // markup matches the initial client-side render
  React.useEffect(() => {
    if (initialFlags || config.disableCache) return;

    const cachedFlags = loadFlagsFromCache<F>(initialUserAttributes?.key);
    if (!shallowEqual(flags, cachedFlags)) {
      setFlags(cachedFlags);
    }
  }, [flags, initialFlags, initialUserAttributes]);

  // fetch on mount when no initialFlags were provided
  React.useEffect(() => {
    if (initialFlags !== null) return;

    let active = true;

    fetchFlags<F>({ config, persistUser, userAttributes }).then(nextFlags => {
      // skip in case the request failed
      if (!nextFlags) return;
      // skip in case the component unmounted
      if (!active) return;

      setFlags(nextFlags);

      if (!config.disableCache) {
        storeFlagsInCache(nextFlags, userAttributes?.key);
      }
    });

    return () => {
      active = false;
    };
  }, [initialFlags, persistUser, userAttributes]);

  // revalidate when incoming user changes
  const incomingUser = options?.user;
  React.useEffect(() => {
    const incomingUserAttributes = toUserAttributes(incomingUser);
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

      const nextFlags = await fetchFlags<F>({
        config,
        persistUser,
        userAttributes,
      });

      if (!nextFlags) return;

      // skip responses to outdated requests
      if (fetchId !== latestFetchId) return;

      // skip invalid responses
      if (typeof nextFlags !== 'object') return;

      setFlags(nextFlags);

      if (!config.disableCache) {
        storeFlagsInCache(nextFlags, userAttributes?.key);
      }
    };

    window.addEventListener('focus', listener);
    return () => {
      window.removeEventListener('focus', listener);
    };
  }, [revalidateOnFocus, setFlags, persistUser, userAttributes]);

  return flags;
}

function addDefaults<F extends Flags>(
  flags: F | null,
  defaultFlags: Flags = {}
): F {
  return Object.assign({}, defaultFlags, flags);
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
  const flags = usePrimitiveFlags<F>(options);

  const defaultFlags = config?.defaultFlags;
  const [flagsWithDefaults, setFlagsWithDefaults] = React.useState<F>(
    addDefaults<F>(flags, defaultFlags)
  );

  React.useEffect(() => {
    const nextFlagsWithDefaults = addDefaults(flags, defaultFlags);
    if (shallowEqual(flagsWithDefaults, nextFlagsWithDefaults)) return;
    setFlagsWithDefaults(nextFlagsWithDefaults);
  }, [flags, flagsWithDefaults, defaultFlags]);

  return {
    flags: flagsWithDefaults,
    loading: flags === null,
    initialFlags: options?.initialFlags,
    defaultFlags: config.defaultFlags as F,
  };
}

/**
 * Returns feature flags from HappyKit
 * @param options Options like initial flags or the targeted user.
 */
export function useFlags<F extends Flags>(options?: FlagOptions<F>): F {
  const { flags } = useFeatureFlags<F>(options);
  return flags;
}

export const getFlags =
  typeof window === 'undefined'
    ? async function getFlags<F extends Flags>({
        user,
        persistUser,
      }: {
        user?: FlagUserAttributes | null;
        persistUser?: FlagOptions<F>['persistUser'];
      } = {}): Promise<F> {
        if (!hasClientId(config)) {
          throw new Error('@happykit/flags: Missing config.clientId');
        }

        const flags = await fetchFlags<F>({
          config,
          persistUser,
          userAttributes: toUserAttributes(user),
        });
        const defaultFlags = (config.defaultFlags || {}) as F;
        return flags ? addDefaults<F>(flags, defaultFlags) : defaultFlags;
      }
    : async function getFlags() {
        throw new Error(
          '@happykit/flags: getFlags may not be called on the client'
        );
      };
