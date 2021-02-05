import * as React from "react";
import {
  shallowEqual,
  isConfigured,
  EvaluationRequestBody,
  User,
  Traits,
  EvaluationResponseBody,
  Configuration,
  config,
  getCookie,
  hasOwnProperty,
  InitialFlagState,
  MissingConfigurationError,
  Flags,
} from "./config";
import { useEffectReducer, EffectReducer } from "use-effect-reducer";

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
    (item) => input === item.input && shallowEqual(init, item.init)
  );
  if (queued) return queued.promise;
  const promise = fetch(input, init);
  queue.push({ input, init, promise });
  return promise.then((result) => {
    queue = queue.filter(
      (item) => input !== item.input || !shallowEqual(init, item.init)
    );
    return result;
  });
}

function getCachedState(
  config: Configuration,
  visitorKey: string | null
): {
  requestBody: EvaluationRequestBody;
  responseBody: EvaluationResponseBody;
} | null {
  try {
    const cached = JSON.parse(String(localStorage.getItem("hk-cache")));
    if (
      typeof cached === "object" &&
      hasOwnProperty(cached, "requestBody") &&
      hasOwnProperty(cached, "responseBody") &&
      hasOwnProperty(cached, "envKey") &&
      hasOwnProperty(cached, "endpoint") &&
      hasOwnProperty(cached.responseBody, "visitor") &&
      hasOwnProperty(cached.responseBody.visitor, "key") &&
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
  | { type: "mount"; readCache: boolean; config: Configuration }
  | { type: "changed"; user?: User | null; traits?: Traits | null }
  | { type: "focus" }
  | {
      type: "settle";
      endpoint: string;
      envKey: string;
      requestBody: EvaluationRequestBody;
      responseBody: EvaluationResponseBody;
    }
  | { type: "fail"; requestBody: EvaluationRequestBody };

type Effect =
  | { type: "revalidate" }
  | { type: "cache/clear" }
  | {
      type: "cache/save";
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
    case "mount": {
      if (state.settled) return state;
      effect({ type: "revalidate" });

      const visitorKey = state.requestBody?.visitorKey
        ? state.requestBody.visitorKey
        : typeof document !== "undefined"
        ? getCookie(document.cookie, "hkvk")
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
    case "changed":
    case "focus": {
      effect({ type: "revalidate" });
      return state.fetching && state.mounted
        ? state
        : { ...state, fetching: true, mounted: true };
    }
    case "settle": {
      effect({
        type: "cache/save",
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
    case "fail": {
      effect({ type: "cache/clear" });
      return {
        mounted: true,
        settled: true,
        fetching: false,
        loadedOn: "client",
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
    "cache/clear": () => {
      localStorage.removeItem("hk-cache");
    },
    "cache/save": (state, action) => {
      localStorage.setItem(
        "hk-cache",
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
      dedupeFetch([endpoint, envKey].join("/"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      }).then(
        async (response) => {
          const responseBody: EvaluationResponseBody = await response.json();
          dispatch({
            type: "settle",
            requestBody,
            responseBody,
            endpoint,
            envKey,
          });
        },
        () => {
          dispatch({ type: "fail", requestBody });
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
        type: "mount",
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
      dispatch({ type: "focus" });
    }
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [
    dispatch,
    state.mounted,
    options.disableCache,
    options.revalidateOnFocus,
  ]);

  React.useEffect(() => {
    if (
      !shallowEqual(options.user, state.requestBody?.user) ||
      !shallowEqual(options.traits, state.requestBody?.traits)
    ) {
      // dispatch({ type: 'changed' });
    }
  }, [options.user, options.traits, dispatch]);

  // add defaults to flags here, but not in initialFlagState
  // memoize this to avoid unnecessarily returning new object references
  const flags = state.responseBody ? state.responseBody.flags : null;

  const flagsWithDefaults = React.useMemo(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

    return flags &&
      Object.keys(config.defaultFlags).every((key) =>
        hasOwnProperty(flags, key)
      )
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
