import * as React from "react";
import {
  shallowEqual,
  isConfigured,
  EvaluationRequestBody,
  FlagUser,
  Traits,
  EvaluationResponseBody,
  Configuration,
  config,
  getCookie,
  hasOwnProperty,
  InitialFlagState,
  MissingConfigurationError,
  Flags,
  Input,
  Outcome,
} from "./config";

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
    pending: null | {
      input: Input;
      promise: Promise<EvaluationResponseBody<F>>;
    };
  };

type Action<F extends Flags> =
  | { type: "mount" }
  | {
      type: "evaluate";
      input: Input;
    }
  | {
      type: "settle";
      input: Input;
      outcome: Outcome<F>;
    }
  | { type: "fail"; input: Input };

type Effect<F extends Flags> =
  | { type: "fetch" }
  | { type: "cache/clear" }
  | { type: "cache/write" };

function reducer<F extends Flags>(
  allState: [State<F>, Effect<F>[]],
  action: Action<F>
): [State<F>, Effect<F>[]] {
  const [state] = allState;
  const effects = [] as Effect<F>[];
  const exec = (effect: Effect<F>) => effects.push(effect);

  switch (action.type) {
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
    (initialFlagState): [State<F>, Effect<F>[]] => {
      return [
        { current: initialFlagState || null, pending: null },
        [] as Effect<F>[],
      ];
    }
  );

  const [state, effects] = allState;

  React.useEffect(() => {
    effects.forEach((effect) => {
      switch (effect.type) {
        // execute the effect
        default:
          return;
      }
    });
  }, [effects]);

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
