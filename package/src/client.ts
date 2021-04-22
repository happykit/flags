import { nanoid } from "nanoid";
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
  ObjectMap,
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
      input: Input;
      outcome: Outcome<F> | null;
    };
    pending: null | { input: Input };
    prefilledFromCache: boolean;
  };

type Action<F extends Flags> =
  | { type: "mount" }
  | { type: "evaluate"; input: Input; ready?: boolean }
  | { type: "settle/success"; input: Input; outcome: Outcome<F> }
  | { type: "settle/failure"; input: Input };

type Effect = { type: "fetch"; input: Input };

/**
 * Checks whether input is a brand new input.
 *
 * In case there is a pending input, it checks if the incoming input equals that.
 *
 * In case there is no pending input, it checks if the incoming input equals the current input.
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
  tuple: readonly [State<F>, Effect[]],
  action: Action<F>
): readonly [State<F>, Effect[]] {
  const [state /* and effects */] = tuple;
  switch (action.type) {
    case "evaluate": {
      const cachedOutcome = cache.get<Outcome<F>>(action.input);

      const blocked =
        typeof action.ready === "undefined" ? false : !action.ready;

      if (blocked) return tuple;

      return [
        {
          ...state,
          pending: { input: action.input },
          current: cachedOutcome
            ? { input: action.input, outcome: cachedOutcome }
            : state.current,
          prefilledFromCache: Boolean(cachedOutcome),
        },
        [{ type: "fetch", input: action.input }],
      ];
    }
    case "settle/success": {
      // skip outdated responses
      if (state.pending?.input !== action.input) return tuple;

      return [
        {
          ...state,
          current: { input: action.input, outcome: action.outcome },
          pending: null,
          prefilledFromCache: false,
        },
        [],
      ];
    }
    case "settle/failure": {
      return deepEqual(action.input, state.pending?.input)
        ? [
            {
              ...state,
              current: { input: action.input, outcome: null },
              pending: null,
              prefilledFromCache: false,
            },
            [],
          ]
        : tuple;
    }
    default:
      return tuple;
  }
}

export const cache = new ObjectMap<Input, Outcome<Flags>>();

export function useFlags<F extends Flags = Flags>(
  options: {
    user?: FlagUser | null;
    traits?: Traits | null;
    initialState?: InitialFlagState<F>;
    revalidateOnFocus?: boolean;
    ready?: boolean;
  } = {}
): FlagBag<F> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  const [generatedVisitorKey] = React.useState(nanoid);

  const currentUser = options.user || null;
  const currentTraits = options.traits || null;
  const shouldRevalidateOnFocus =
    options.revalidateOnFocus === undefined
      ? config.revalidateOnFocus
      : options.revalidateOnFocus;

  const [[state, effects], dispatch] = React.useReducer(
    reducer,
    options.initialState,
    (initialFlagState): [State<F>, Effect[]] => [
      {
        current: initialFlagState || null,
        pending: null,
        prefilledFromCache: false,
      },
      [] as Effect[],
    ]
  );

  // add initialState to cache
  React.useEffect(() => {
    if (
      options.initialState &&
      // only cache successful requests
      options.initialState.outcome &&
      // do not cache static requests as they'll always be passed in from the
      // server anyhow, so they'd never be read from the cache
      !options.initialState.input.requestBody.static
    ) {
      cache.set(options.initialState.input, options.initialState.outcome);
    }
  }, [options.initialState]);

  React.useEffect(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

    const visitorKey = (() => {
      const cookie =
        typeof document !== "undefined"
          ? getCookie(document.cookie, "hkvk")
          : null;
      if (cookie) return cookie;

      if (state.pending?.input.requestBody.visitorKey)
        return state.pending?.input.requestBody.visitorKey;

      if (state.current?.outcome?.responseBody.visitor?.key)
        return state.current?.outcome?.responseBody.visitor?.key;

      return generatedVisitorKey;
    })();

    const input: Input = {
      endpoint: config.endpoint,
      envKey: config.envKey,
      requestBody: {
        visitorKey,
        user: currentUser,
        traits: currentTraits,
        static: false,
      },
    };

    if (isEmergingInput(input, state)) {
      dispatch({ type: "evaluate", input, ready: options.ready });
    }

    if (!shouldRevalidateOnFocus) return;

    function handleFocus() {
      if (document.visibilityState === "visible") {
        dispatch({ type: "evaluate", input, ready: options.ready });
      }
    }

    // extracted "visibilitychange" for bundle size
    const visibilityChange = "visibilitychange";
    document.addEventListener(visibilityChange, handleFocus);
    return () => {
      document.removeEventListener(visibilityChange, handleFocus);
    };
  }, [
    state,
    currentUser,
    currentTraits,
    shouldRevalidateOnFocus,
    options.ready,
  ]);

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
              const outcome = { responseBody };
              // responses to outdated requests are skipped in the reducer
              dispatch({ type: "settle/success", input, outcome });

              cache.set(input, outcome);

              if (
                // server hasn't set it
                !response.headers.get("Set-Cookie")?.includes("hkvk=") &&
                // response contains visitor key
                responseBody.visitor?.key
              ) {
                document.cookie = serializeVisitorKeyCookie(
                  responseBody.visitor.key
                );
              }
            })
            .catch((error) => {
              console.error("HappyKit: Failed to load flags");
              console.error(error);
              dispatch({ type: "settle/failure", input });
            });
        }

        default:
          return;
      }
    });
  }, [effects, dispatch]);

  const defaultFlags = config.defaultFlags;

  const flagBag = React.useMemo<FlagBag<F>>(() => {
    const outcomeFlags =
      (state.current?.outcome?.responseBody.flags as F | undefined) || null;

    const flags = combineLoadedFlagsWithDefaultFlags<F>(
      outcomeFlags,
      defaultFlags
    );

    // When the outcome was generated for a static site, then no visitor key
    // is present on the outcome. In that case, the state can not be seen as
    // settled as another revalidation will happen in which a visitor key will
    // get generated.
    return {
      flags: outcomeFlags ? flags : null,
      loadedFlags: state.prefilledFromCache ? null : outcomeFlags,
      fetching: Boolean(state.pending),
      settled: Boolean(
        state.current &&
          !state.current.input.requestBody.static &&
          !state.prefilledFromCache
      ),
      visitorKey:
        state.current?.outcome?.responseBody.visitor?.key ||
        state.current?.input.requestBody.visitorKey ||
        state.pending?.input.requestBody.visitorKey ||
        null,
    };
  }, [state, defaultFlags]);

  return flagBag;
}
