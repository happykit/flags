/** global: fetch */

// TODO this should be moved to @happykit/flags
import * as React from 'react';
import { IncomingMessage, ServerResponse } from 'http';
import { useEffectReducer, EffectReducer } from 'use-effect-reducer';

// resolved by cache (while fetching)
// resolved by fallback (when cache was empty) (even if there is no explicit fallback provided) (fallback set through global config or options)
// resolved by service worker => leads to "settled: true"

// settled: true means it has been loaded by the service worker,
//          or loading has failed and a fallback is being used
//          -> never goes back to false after it is true
// fetching: true means a request is currently in flight (initial or refetching)
//          -> can switch between true and false

// loaded on server (swaps to "client" once revalidates)
// loaded on client (never swaps back to server)

// -------

// resolvedBy: "api" | "cache" | "fallback"
// settled: boolean
// loadedOn: "server" | "client"

let queue: {
  input: RequestInfo;
  init?: RequestInit | undefined;
  promise: Promise<Response>;
}[] = [];
function dedupeFetch(input: RequestInfo, init?: RequestInit | undefined) {
  const queued = queue.find(
    item => input === item.input && shallowEqual(init, item.init)
  );
  if (queued) return queued.promise;
  const promise = fetch(input, init);
  queue.push({ input, init, promise });
  return promise.then(result => {
    queue = queue.filter(
      item => input !== item.input || !shallowEqual(init, item.init)
    );
    return result;
  });
}

type User = {
  key: string;
  persist?: boolean;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

type Traits = { [key: string]: any };

type Flags = {
  [key: string]: boolean | number | string;
};

export type FeatureFlagUser = User;
export type FeatureFlagTraits = Traits;
export type FeatureFlags = Flags;

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

type Configuration = DefaultConfiguration & IncomingConfiguration;
let config: Configuration | null = null;

export function configure(
  options: IncomingConfiguration & Partial<DefaultConfiguration>
) {
  const defaults: DefaultConfiguration = {
    endpoint: 'https://happykit.dev/api/flags',
    fetch,
    defaultFlags: {},
    revalidateOnFocus: true,
    disableCache: false,
  };

  if (
    !options ||
    typeof options.envKey !== 'string' ||
    options.envKey.length === 0
  )
    throw new InvalidConfigurationError();

  config = Object.assign({}, defaults, options);
}

function isConfigured(c: Configuration | null): c is Configuration {
  return c !== null;
}

class MissingConfigurationError extends Error {
  constructor() {
    super('@happykit/flags: Missing configuration. Call configure() first.');
  }
}

class InvalidConfigurationError extends Error {
  constructor() {
    super('@happykit/flags: Invalid configuration');
  }
}

/**
 * Gets the cookie by the name
 *
 * From: https://developers.cloudflare.com/workers/examples/extract-cookie-value
 */
function getCookie(cookieString: string | null | undefined, name: string) {
  if (cookieString) {
    const cookies = cookieString.split(';');
    for (let cookie of cookies) {
      const cookiePair = cookie.split('=', 2);
      const cookieName = cookiePair[0].trim();
      if (cookieName === name) return cookiePair[1];
    }
  }
  return null;
}

function serializeVisitorKeyCookie(visitorKey: string) {
  const seconds = 60 * 60 * 24 * 180;
  const value = encodeURIComponent(visitorKey);
  return `hkvk=${value}; Max-Age=${seconds}; SameSite=Lax`;
}

function getXForwardedFor(context: {
  req: IncomingMessage;
  res: ServerResponse;
}): {} | { 'x-forwarded-for': string } {
  const key = 'x-forwarded-for' as const;
  const xForwardedFor = context.req.headers[key];
  if (typeof xForwardedFor === 'string') return { [key]: xForwardedFor };
  const remoteAddress = context.req.socket.remoteAddress;
  if (remoteAddress) return { [key]: remoteAddress };
  return {};
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

function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

function getCachedState(
  config: Configuration,
  visitorKey: string | null
): {
  requestBody: EvaluationRequestBody;
  responseBody: EvaluationResponseBody;
} | null {
  try {
    const cached = JSON.parse(String(localStorage.getItem('hk-cache')));
    if (
      typeof cached === 'object' &&
      hasOwnProperty(cached, 'requestBody') &&
      hasOwnProperty(cached, 'responseBody') &&
      hasOwnProperty(cached, 'envKey') &&
      hasOwnProperty(cached, 'endpoint') &&
      hasOwnProperty(cached.responseBody, 'visitor') &&
      hasOwnProperty(cached.responseBody.visitor, 'key') &&
      cached.responseBody.visitor.key === visitorKey &&
      cached.envKey === config.envKey &&
      cached.endpoint === config.endpoint
    )
      return {
        requestBody: cached.requestBody,
        responseBody: cached.responseBody,
      };
  } catch (e) {}
  return null;
}

type EvaluationRequestBody = {
  visitorKey: string | null;
  user: User | null;
  traits: Traits | null;
};

type EvaluationResponseBody = {
  visitor: { key: string };
  flags: { [key: string]: number | boolean | string };
};

type State =
  // useFlags() used without initialState (without getFlags())
  | {
      mounted: boolean;
      settled: false;
      fetching: true;
      visitorKey: string | null;
      requestBody: null;
      responseBody: null;
    }
  // useFlags() used with getFlags(), but getFlags() failed
  // or getFlags() and useFlags() failed both
  | {
      mounted: boolean;
      settled: boolean;
      fetching: boolean;
      visitorKey: string | null;
      requestBody: EvaluationRequestBody;
      responseBody: null;
    }
  // useFlags() used with getFlags(), and getFlags() was successful
  | {
      mounted: true;
      settled: true;
      fetching: boolean;
      visitorKey: string | null;
      requestBody: EvaluationRequestBody;
      responseBody: EvaluationResponseBody;
    }
  // useFlags() resolves with cache while revalidating
  | {
      mounted: true;
      settled: false;
      fetching: boolean;
      visitorKey: string | null;
      requestBody: EvaluationRequestBody;
      responseBody: EvaluationResponseBody;
    };

type Action =
  | { type: 'mount'; readCache: boolean; config: Configuration }
  | { type: 'changed'; user?: User | null; traits?: Traits | null }
  | { type: 'focus' }
  | {
      type: 'settle';
      endpoint: string;
      envKey: string;
      requestBody: EvaluationRequestBody;
      responseBody: EvaluationResponseBody;
    }
  | { type: 'fail'; requestBody: EvaluationRequestBody };

type Effect =
  | { type: 'revalidate' }
  | { type: 'cache/clear' }
  | {
      type: 'cache/save';
      requestBody: EvaluationRequestBody;
      responseBody: EvaluationResponseBody;
      envKey: string;
      endpoint: string;
    };

const reducer: EffectReducer<State, Action, Effect> = (
  state,
  action,
  effect
) => {
  switch (action.type) {
    case 'mount': {
      if (state.settled) return state;
      effect({ type: 'revalidate' });

      const visitorKey = state.requestBody?.visitorKey
        ? state.requestBody.visitorKey
        : typeof document !== 'undefined'
        ? getCookie(document.cookie, 'hkvk')
        : null;

      if (!action.readCache)
        return {
          ...state,
          visitorKey,
          fetching: true,
          mounted: true,
        };

      const cachedState = getCachedState(action.config, state.visitorKey);

      if (!cachedState)
        return {
          ...state,
          visitorKey,
          fetching: true,
          mounted: true,
        };

      return {
        ...state,
        mounted: true,
        settled: false,
        visitorKey: cachedState.responseBody.visitor.key,
        requestBody: cachedState.requestBody,
        responseBody: cachedState.responseBody,
        fetching: true,
      };
    }
    case 'changed':
    case 'focus': {
      effect({ type: 'revalidate' });
      return state.fetching && state.mounted
        ? state
        : { ...state, fetching: true, mounted: true };
    }
    case 'settle': {
      effect({
        type: 'cache/save',
        endpoint: action.endpoint,
        envKey: action.envKey,
        requestBody: action.requestBody,
        responseBody: action.responseBody,
      });
      return {
        mounted: true,
        settled: true,
        fetching: false,
        visitorKey: action.responseBody.visitor.key,
        requestBody: action.requestBody,
        responseBody: action.responseBody,
      };
    }
    case 'fail': {
      effect({ type: 'cache/clear' });
      return {
        mounted: true,
        settled: true,
        fetching: false,
        loadedOn: 'client',
        visitorKey: action.requestBody.visitorKey,
        requestBody: action.requestBody,
        responseBody: null,
      };
    }
    default:
      return state;
  }
};

export function useFlags(
  options: {
    user?: User | null;
    traits?: Traits | null;
    initialState?: InitialFlagState;
    revalidateOnFocus?: boolean;
    disableCache?: boolean;
  } = {}
):
  | {
      flags: Flags;
      visitorKey: string;
      settled: true;
      fetching: boolean;
    }
  | {
      flags: Flags;
      visitorKey: string | null;
      settled: boolean;
      fetching: boolean;
    } {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  const initialState = React.useMemo<State>(() => {
    // useFlags() used without initialState (without getFlags())
    if (!options.initialState)
      return {
        mounted: false,
        settled: false,
        fetching: true,
        visitorKey: null,
        requestBody: null,
        responseBody: null,
      };

    // useFlags() used with getFlags(), but getFlags() failed
    if (!options.initialState.responseBody)
      return {
        mounted: false,
        settled: false,
        fetching: true,
        visitorKey: options.initialState.requestBody.visitorKey,
        requestBody: options.initialState.requestBody,
        responseBody: null,
      };

    // useFlags() used with getFlags(), and getFlags() was successful
    return {
      mounted: true,
      settled: true,
      fetching: false,
      visitorKey: options.initialState.responseBody.visitor.key,
      requestBody: options.initialState.requestBody,
      responseBody: options.initialState.responseBody,
    };
  }, [options.initialState]);

  const [state, dispatch] = useEffectReducer(reducer, initialState, {
    'cache/clear': () => {
      localStorage.removeItem('hk-cache');
    },
    'cache/save': (state, action) => {
      localStorage.setItem(
        'hk-cache',
        JSON.stringify({
          endpoint: action.endpoint,
          envKey: action.envKey,
          requestBody: state.requestBody,
          responseBody: state.responseBody,
        })
      );
    },

    revalidate: (state, _, dispatch) => {
      if (!isConfigured(config)) throw new MissingConfigurationError();

      const requestBody = {
        visitorKey: state.visitorKey,
        user: options.user || null,
        traits: options.traits || null,
      };

      const { endpoint, envKey } = config;
      dedupeFetch([endpoint, envKey].join('/'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      }).then(
        async response => {
          const responseBody: EvaluationResponseBody = await response.json();
          dispatch({
            type: 'settle',
            requestBody,
            responseBody,
            endpoint,
            envKey,
          });
        },
        () => {
          dispatch({ type: 'fail', requestBody });
        }
      );
    },
  });

  React.useEffect(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

    const shouldUseCachedState =
      options.disableCache === undefined
        ? !config.disableCache
        : !options.disableCache;

    if (!state.mounted) {
      dispatch({
        type: 'mount',
        readCache: shouldUseCachedState,
        config,
      });
    }

    const shouldRevalidateOnFocus =
      options.revalidateOnFocus === undefined
        ? config.revalidateOnFocus
        : !options.revalidateOnFocus;

    if (!shouldRevalidateOnFocus) return;

    function handleFocus() {
      dispatch({ type: 'focus' });
    }
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [
    dispatch,
    state.mounted,
    options.disableCache,
    options.revalidateOnFocus,
  ]);

  React.useEffect(() => dispatch({ type: 'changed' }), [
    options.user,
    options.traits,
    dispatch,
  ]);

  // add defaults to flags here, but not in initialFlagState
  // memoize this to avoid unnecessarily returning new object references
  const flags = state.responseBody ? state.responseBody.flags : null;

  const flagsWithDefaults = React.useMemo(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

    return flags &&
      Object.keys(config.defaultFlags).every(key => hasOwnProperty(flags, key))
      ? flags
      : { ...config.defaultFlags, ...flags };
  }, [flags]);

  const flagBag = React.useMemo(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

    if (state.responseBody === null) {
      return {
        flags: config.defaultFlags,
        visitorKey: null,
        fetching: state.fetching,
        settled: state.settled,
      };
    }

    return {
      flags: flagsWithDefaults,
      visitorKey: state.responseBody.visitor.key,
      fetching: state.fetching,
      settled: state.settled,
    };
  }, [state.fetching, state.settled, flagsWithDefaults, state.responseBody]);

  return flagBag;
}

type InitialFlagStateWithResponse = {
  requestBody: EvaluationRequestBody;
  responseBody: EvaluationResponseBody;
};

type InitialFlagStateWithoutResponse = {
  requestBody: EvaluationRequestBody;
  responseBody: null;
};

export type InitialFlagState =
  | InitialFlagStateWithResponse
  | InitialFlagStateWithoutResponse;

export async function getFlags(options: {
  context: { req: IncomingMessage; res: ServerResponse };
  user?: User;
  traits?: Traits;
}): Promise<{
  /**
   * The resolved flags
   *
   * In case the flags could not be loaded, you will see the default
   * flags here (from config.defaultFlags)
   *
   * In case the default flags contain flags not present in the loaded
   * flags, the missing flags will get added to the returned flags.
   */
  flags: Flags;
  /**
   * The initial flag state that you can use to initialize useFlags()
   */
  initialFlagState: InitialFlagState;
}> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  // determine visitor key
  const visitorKeyFromCookie = getCookie(
    options.context.req.headers.cookie,
    'hkvk'
  );

  const requestBody = {
    visitorKey: visitorKeyFromCookie,
    user: options.user || null,
    traits: options.traits || null,
  };

  const response = await fetch([config.endpoint, config.envKey].join('/'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // add x-forwarded-for header so the service worker gets
      // access to the real client ip
      ...getXForwardedFor(options.context),
    },
    body: JSON.stringify(requestBody),
  }).catch(() => null);

  if (!response || response.status !== 200)
    return {
      flags: config.defaultFlags,
      initialFlagState: { requestBody, responseBody: null },
    };

  const responseBody = (await response.json().catch(() => null)) as {
    flags: Flags;
    visitor: { key: string };
  } | null;
  if (!responseBody)
    return {
      flags: config.defaultFlags,
      initialFlagState: { requestBody, responseBody: null },
    };

  // always set the cookie so its max age refreshes
  options.context.res.setHeader(
    'Set-Cookie',
    serializeVisitorKeyCookie(responseBody.visitor.key)
  );

  // add defaults to flags here, but not in initialFlagState
  const flags = responseBody.flags ? responseBody.flags : null;
  const flagsWithDefaults = { ...config.defaultFlags, ...flags };

  return {
    flags: flagsWithDefaults,
    initialFlagState: { requestBody, responseBody },
  };
}
