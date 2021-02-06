import * as React from "react";
import {
  isConfigured,
  FlagUser,
  Traits,
  config,
  InitialFlagState,
  MissingConfigurationError,
  Flags,
  Input,
  Outcome,
} from "./config";
import { deepEqual, getCookie, hasOwnProperty } from "./utils";

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

function reducer<F extends Flags>(
  allState: [State<F>, Effect[]],
  action: Action<F>
): [State<F>, Effect[]] {
  const [state] = allState;
  const effects = [] as Effect[];
  const exec = (effect: Effect) => effects.push(effect);

  console.log("action", action);
  switch (action.type) {
    case "evaluate": {
      const sameInputIsAlreadyPending =
        state.pending && deepEqual(state.pending.input, action.input);

      if (sameInputIsAlreadyPending) return [state, effects];

      if (
        // no pending input
        !state.pending &&
        // same input is already current
        state.current &&
        deepEqual(state.current.input, action.input)
      )
        return [state, effects];

      console.log("not equal", state.current?.input, action.input);
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
      if (state.pending && deepEqual(state.pending.input, action.input)) {
        return [{ ...state, pending: null }, effects];
      }
      return [state, effects];
    }
    default:
      return [state, effects];
  }
}

export function useFlags<F extends Flags = Flags>(
  options: {
    user?: FlagUser | null;
    traits?: Traits | null;
    initialState?: InitialFlagState<F>;
    revalidateOnFocus?: boolean;
    disableCache?: boolean;
  } = {}
):
  | {
      flags: F;
      visitorKey: string;
      settled: true;
      fetching: boolean;
    }
  | {
      flags: F;
      visitorKey: string | null;
      settled: boolean;
      fetching: boolean;
    } {
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

  // see if we need to fetch on mount, or init from local cache
  // React.useEffect(() => dispatch({ type: "mount" }), []);

  const currentKey = state.current?.outcome?.responseBody.visitor.key;
  const currentUser = options.user || null;
  const currentTraits = options.traits || null;
  React.useEffect(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

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

    dispatch({ type: "evaluate", input });
  }, [currentKey, currentUser, currentTraits]);

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
    const flagsWithoutDefaults = state.current?.outcome?.responseBody.flags;
    const flagsWithDefaults =
      flagsWithoutDefaults &&
      Object.keys(defaultFlags).every((key) =>
        hasOwnProperty(flagsWithoutDefaults, key)
      )
        ? (flagsWithoutDefaults as F)
        : ({ ...defaultFlags, ...flagsWithoutDefaults } as F);

    return {
      flags: flagsWithDefaults,
      loadedFlags: flagsWithoutDefaults,
      // the visitorKey that belongs to the loaded flags,
      // it is "null" until the response has settled
      visitorKey: state.current?.outcome?.responseBody.visitor.key || null,
      settled: Boolean(state.current?.outcome?.responseBody.flags),
      fetching: Boolean(state.pending),
    };
  }, [state, defaultFlags]);

  return flagBag;
}
