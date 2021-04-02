import * as React from "react";
import { isConfigured, config } from "./config";
import {
  InitialFlagState,
  MissingConfigurationError,
  Flags,
  Input,
  Outcome,
  FlagUser,
  Traits,
  FlagBag,
  EvaluationResponseBody,
} from "./types";
import {
  deepEqual,
  getCookie,
  serializeVisitorKeyCookie,
  combineLoadedFlagsWithDefaultFlags,
} from "./utils";

export type {
  FlagUser,
  Traits,
  Flags,
  MissingConfigurationError,
  InitialFlagState,
  Input,
  Outcome,
} from "./types";

export const cacheKey = "happykit_flags_cache_v1";

type State<F extends Flags> =
  // useFlags() used without initialState (without getFlags())
  //
  // useFlags() used with getFlags(), but getFlags() failed
  // or getFlags() and useFlags() failed both
  //
  // useFlags() used with getFlags(), and getFlags() was successful
  //
  // useFlags() used with getFlags() in static-site generation (refetching necessary)
  //
  // useFlags() used with getFlags() in server-side rendering (no refetching necessary)
  {
    current: null | {
      mode?: "ssr" | "ssg";
      input: Input;
      outcome: Outcome<F> | null;
    };
    pending: null | { input: Input };
    prefilledFromLocalStorage: boolean;
  };

type Action<F extends Flags> =
  | { type: "mount" }
  | { type: "prefillFromLocalStorage"; current: State<F>["current"] }
  | { type: "evaluate"; input: Input }
  | { type: "settle"; input: Input; outcome: Outcome<F> }
  | { type: "fail"; input: Input };

type Effect = { type: "fetch"; input: Input };

/**
 * Checks whether input is the upcoming input, or the current input in case
 * there is no upcoming input.
 *
 * Ignores "current" while "pending" is present
 */
function isEmergingInput<F extends Flags>(input: Input, state: State<F>) {
  if (state.pending) {
    if (deepEqual(state.pending.input, input)) return false;
  } else if (state.current /* and not state.pending */) {
    if (deepEqual(state.current.input, input)) return false;
  }
  return true;
}

/**
 * If the initial flag evaluation request contained no visitor key,
 * a visitor key will be present in the state afterwards, but the
 * currently resolved input under state.input.requestBody won't have a
 * visitorKey attached to it.
 *
 * That would trigger another validation which we can skip as it would
 * lead to the same result anyways, since the flag worker already took
 * that generated visitor key into account when evaluating.
 */
function isAddedVisitorKeyTheOnlyDifference<F extends Flags>(
  input: Input,
  state: State<F>
) {
  if (state.current?.input.requestBody.visitorKey !== null) return false;

  return deepEqual(state.current.input, {
    ...input,
    requestBody: { ...input.requestBody, visitorKey: null },
  } as Input);
}

/**
 * The reducer returns a tuple of [state, effects].
 *
 * effects is an array of effects to execute. The emitted effects are then later
 * executed in another hook.
 *
 * This pattern is basically a hand-rolled version of
 * https://github.com/davidkpiano/useEffectReducer
 *
 * We use a hand-rolled version to keep the size of this package minimal.
 */
function reducer<F extends Flags>(
  [state /* and effects */]: [State<F>, Effect[]],
  action: Action<F>
): [State<F>, Effect[]] {
  switch (action.type) {
    case "prefillFromLocalStorage": {
      if (state.current) return [state, []];
      return [
        { ...state, current: action.current, prefilledFromLocalStorage: true },
        [],
      ];
    }
    case "evaluate": {
      return [
        { ...state, pending: { input: action.input } },
        [{ type: "fetch", input: action.input }],
      ];
    }
    case "settle": {
      // skip outdated responses
      if (state.pending?.input !== action.input) return [state, []];

      return [
        {
          ...state,
          current: { input: action.input, outcome: action.outcome },
          pending: null,
          prefilledFromLocalStorage: false,
        },
        [],
      ];
    }
    case "fail": {
      return isEmergingInput(action.input, state)
        ? [{ ...state, pending: null }, []]
        : [state, []];
    }
    default:
      return [state, []];
  }
}

interface SettledFlagBag<F extends Flags> extends FlagBag<F> {
  visitorKey: string;
  settled: true;
}

interface UnsettledFlagBag<F extends Flags> extends FlagBag<F> {
  visitorKey: string | null;
  settled: false;
}

export function useFlags<F extends Flags = Flags>(
  options: {
    user?: FlagUser | null;
    traits?: Traits | null;
    initialState?: InitialFlagState<F>;
    revalidateOnFocus?: boolean;
    disableCache?: boolean;
  } = {}
): SettledFlagBag<F> | UnsettledFlagBag<F> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  const currentUser = options.user || null;
  const currentTraits = options.traits || null;
  const shouldRevalidateOnFocus =
    options.revalidateOnFocus === undefined
      ? config.revalidateOnFocus
      : options.revalidateOnFocus;
  const shouldDisableCache =
    options.disableCache === undefined
      ? config.disableCache
      : options.disableCache;

  const [[state, effects], dispatch] = React.useReducer(
    reducer,
    options.initialState,
    (initialFlagState): [State<F>, Effect[]] => [
      {
        current: initialFlagState || null,
        pending: null,
        prefilledFromLocalStorage: false,
      },
      [] as Effect[],
    ]
  );

  // read from cache initially
  React.useEffect(() => {
    if (shouldDisableCache || state.current) return;

    try {
      const cachedCurrent = JSON.parse(String(localStorage.getItem(cacheKey)));

      if (cachedCurrent) {
        dispatch({
          type: "prefillFromLocalStorage",
          current: cachedCurrent,
        });
      }
    } catch (e) {}
  }, [shouldDisableCache, state.current]);

  React.useEffect(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();
    const currentKey = state.current?.outcome?.responseBody.visitor?.key;

    const visitorKey = (() => {
      const cookie =
        typeof document !== "undefined"
          ? getCookie(document.cookie, "hkvk")
          : null;
      if (cookie) return cookie;

      if (currentKey) return currentKey;

      return null;
    })();

    const input: Input = {
      endpoint: config.endpoint,
      envKey: config.envKey,
      requestBody: { visitorKey, user: currentUser, traits: currentTraits },
    };

    if (
      isEmergingInput(input, state) &&
      !isAddedVisitorKeyTheOnlyDifference(input, state) &&
      // We don't need to reevaluate on mount when current result came from
      // server-side rendering
      state.current?.mode !== "ssr"
    ) {
      dispatch({ type: "evaluate", input });
    }

    if (!shouldRevalidateOnFocus) return;

    function handleFocus() {
      if (document.visibilityState === "visible") {
        dispatch({ type: "evaluate", input });
      }
    }

    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [state, currentUser, currentTraits, shouldRevalidateOnFocus]);

  React.useEffect(() => {
    effects.forEach((effect) => {
      switch (effect.type) {
        // execute the effect
        case "fetch": {
          const { input } = effect;
          fetch([input.endpoint, input.envKey].join("/"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input.requestBody),
          })
            .then(async (response) => {
              const responseBody = (await response.json()) as EvaluationResponseBody<F>;
              // responses to outdated requests are skipped in the reducer
              dispatch({ type: "settle", input, outcome: { responseBody } });

              if (
                // server hasn't set it
                !response.headers.get("Set-Cookie")?.includes("hkvk=") &&
                // response contains visitor key
                responseBody.visitor.key
              ) {
                document.cookie = serializeVisitorKeyCookie(
                  responseBody.visitor.key
                );
              }
            })
            .catch(() => dispatch({ type: "fail", input }));
        }

        default:
          return;
      }
    });
  }, [effects, dispatch]);

  // sync to cache in localStorage
  React.useEffect(() => {
    if (shouldDisableCache || !state.current) return;
    localStorage.setItem(cacheKey, JSON.stringify(state.current));
  }, [shouldDisableCache, state.current]);

  const defaultFlags = config.defaultFlags;

  const flagBag = React.useMemo(() => {
    const loadedFlags = state.current?.outcome?.responseBody.flags as F;
    const flags = combineLoadedFlagsWithDefaultFlags<F>(
      loadedFlags,
      defaultFlags
    );

    const outcome = state.current?.outcome;
    const base = { flags, loadedFlags, fetching: Boolean(state.pending) };

    // When the outcome was generated for a static site, then no visitor key
    // is present on the outcome. In that case, the state can not be seen as
    // settled as another revalidation will happen in which a visitor key will
    // get generated.
    const visitorKey = outcome?.responseBody.visitor?.key;

    return outcome && visitorKey
      ? {
          ...base,
          // the visitorKey that belongs to the loaded flags
          visitorKey,
          settled: !state.prefilledFromLocalStorage,
        }
      : {
          ...base,
          // the visitorKey that belongs to the loaded flags,
          // it is "null" until the response has settled
          visitorKey: null,
          settled: false as false,
        };
  }, [state, defaultFlags]);

  return flagBag;
}
