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
} from "./types";
import { deepEqual, getCookie, has } from "./utils";

export type {
  FlagUser,
  Traits,
  Flags,
  MissingConfigurationError,
  InitialFlagState,
  Input,
  Outcome,
} from "./types";

const cacheKey = "happykit_flags_cache_v1";

type State<F extends Flags> =
  // useFlags() used without initialState (without getFlags())
  //
  // useFlags() used with getFlags(), but getFlags() failed
  // or getFlags() and useFlags() failed both
  //
  // useFlags() used with getFlags(), and getFlags() was successful
  {
    current: null | {
      input: Input;
      outcome: Outcome<F> | null;
    };
    pending: null | { input: Input };
    rehydrated: boolean;
  };

type Action<F extends Flags> =
  | { type: "mount" }
  | { type: "rehydrate"; current: State<F>["current"] }
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
    case "rehydrate": {
      if (state.current) return [state, []];
      return [{ ...state, current: action.current, rehydrated: true }, []];
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
          rehydrated: false,
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
      { current: initialFlagState || null, pending: null, rehydrated: false },
      [] as Effect[],
    ]
  );

  // read from cache initially
  React.useEffect(() => {
    if (shouldDisableCache || state.current) return;

    try {
      const cachedCurrent = JSON.parse(String(localStorage.getItem(cacheKey)));

      if (cachedCurrent) {
        dispatch({ type: "rehydrate", current: cachedCurrent });
      }
    } catch (e) {}
  }, [shouldDisableCache, state.current]);

  React.useEffect(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();
    const currentKey = state.current?.outcome?.responseBody.visitor.key;

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

    if (isEmergingInput(input, state)) {
      dispatch({ type: "evaluate", input });
    }

    if (!shouldRevalidateOnFocus) return;

    function handleFocus() {
      dispatch({ type: "evaluate", input });
    }

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
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
              const responseBody = await response.json();
              // responses to outdated requests are skipped in the reducer
              dispatch({ type: "settle", input, outcome: { responseBody } });
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
    const flags =
      loadedFlags &&
      Object.keys(defaultFlags).every((key) => has(loadedFlags, key))
        ? (loadedFlags as F)
        : ({ ...defaultFlags, ...loadedFlags } as F);

    const outcome = state.current?.outcome;
    const base = { flags, loadedFlags, fetching: Boolean(state.pending) };
    return outcome
      ? {
          ...base,
          // the visitorKey that belongs to the loaded flags,
          // it is "null" until the response has settled
          visitorKey: outcome.responseBody.visitor.key,
          settled: !state.rehydrated,
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
