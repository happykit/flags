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
} from "./types";
import { deepEqual, getCookie, hasOwnProperty } from "./utils";

export type {
  FlagUser,
  Traits,
  Flags,
  MissingConfigurationError,
  InitialFlagState,
  Input,
  Outcome,
} from "./types";

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
  };

type Action<F extends Flags> =
  | { type: "mount" }
  | { type: "evaluate"; input: Input }
  | { type: "settle"; input: Input; outcome: Outcome<F> }
  | { type: "fail"; input: Input };

type Effect = { type: "fetch"; input: Input };
// | { type: "cache/clear" }
// | { type: "cache/write" };

function shouldEvaluateInput<F extends Flags>(input: Input, state: State<F>) {
  const sameInputIsAlreadyPending =
    state.pending && deepEqual(state.pending.input, input);

  if (sameInputIsAlreadyPending) return false;

  if (
    // no pending input
    !state.pending &&
    // same input is already current
    state.current &&
    deepEqual(state.current.input, input)
  )
    return false;

  return true;
}

function reducer<F extends Flags>(
  allState: [State<F>, Effect[]],
  action: Action<F>
): [State<F>, Effect[]] {
  const [state] = allState;
  const effects = [] as Effect[];
  const exec = (effect: Effect) => effects.push(effect);

  switch (action.type) {
    case "evaluate": {
      // if (!shouldEvaluateInput(action.input, state)) return [state, effects];
      exec({ type: "fetch", input: action.input });
      return [{ ...state, pending: { input: action.input } }, effects];
    }
    case "settle": {
      return [
        {
          ...state,
          current: { input: action.input, outcome: action.outcome },
          pending: null,
        },
        effects,
      ];
    }
    case "fail": {
      return [
        // only replace "pending" if the currently pending input failed
        state.pending && deepEqual(state.pending.input, action.input)
          ? { ...state, pending: null }
          : state,
        effects,
      ];
    }
    default:
      return [state, effects];
  }
}

interface FlagBag<F extends Flags> {
  /**
   * The resolved feature flags, extended with the defaults.
   */
  flags: F;
  /**
   * The visitor key the feature flags were fetched for.
   */
  visitorKey: string | null;
  /**
   * Whether the initial loading of the feature flags has completed or not.
   *
   * This is true when the feature flags were loaded for the first time and
   * stays true from then on. It is also true when the request to load the
   * feature flags failed.
   *
   * If you have a cache or default flags, you might already have flags but
   * this property will still be set to false until the initial request to load
   * the feature flags resolves.
   *
   * When you pass an `initialFlagState` to useFlags and when that
   * `initialFlagState` contains resolved flags, then `settled` will be `true`
   * even on the initial render.
   */
  settled: boolean;
  /**
   * This is true whenever a flag evaluation request is currently in flight.
   *
   * You probably want to use `settled` instead, as `settled` stays truthy
   * once the initial flags were loaded, while `fetching` can flip multiple times.
   */
  fetching: boolean;
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

  const [allState, dispatch] = React.useReducer(
    reducer,
    options.initialState,
    (initialFlagState): [State<F>, Effect[]] => {
      return [
        { current: initialFlagState || null, pending: null },
        [] as Effect[],
      ];
    }
  );

  const [state, effects] = allState;

  const currentUser = options.user || null;
  const currentTraits = options.traits || null;
  const shouldRevalidateOnFocus =
    options.revalidateOnFocus === undefined
      ? config.revalidateOnFocus
      : options.revalidateOnFocus;

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

    if (shouldEvaluateInput(input, state)) {
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
          console.log("fetching", input);
          fetch([input.endpoint, input.envKey].join("/"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input.requestBody),
          })
            .then(async (response) => {
              const responseBody = await response.json();
              dispatch({ type: "settle", input, outcome: { responseBody } });
            })
            .catch(() => {
              dispatch({ type: "fail", input });
            });
        }

        default:
          return;
      }
    });
  }, [effects, dispatch]);

  const defaultFlags = config.defaultFlags;

  const flagBag = React.useMemo(() => {
    const loadedFlags = state.current?.outcome?.responseBody.flags as F;
    const flags =
      loadedFlags &&
      Object.keys(defaultFlags).every((key) => hasOwnProperty(loadedFlags, key))
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
          settled: true as true,
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
