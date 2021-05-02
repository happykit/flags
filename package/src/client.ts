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
  SuccessOutcome,
  ErrorOutcome,
} from "./types";
import {
  deepEqual,
  getCookie,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
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
  // not fetched, no input yet
  | {
      input: null;
      outcome: null;
      cachedOutcome?: never;
      revalidating: false;
    }
  // received input, might have cache, no outcome yet
  | {
      input: Input;
      outcome: null;
      cachedOutcome: SuccessOutcome<F> | null;
      revalidating: false;
    }
  // received input and loaded outcome successfully
  | {
      input: Input;
      outcome: SuccessOutcome<F>;
      cachedOutcome?: never;
      revalidating: false;
    }
  // received input and failed to load outcome
  | {
      input: Input;
      outcome: ErrorOutcome;
      cachedOutcome: SuccessOutcome<F> | null;
      revalidating: false;
    }
  // revalidating
  | {
      input: Input;
      outcome: SuccessOutcome<F> | ErrorOutcome | null;
      cachedOutcome: SuccessOutcome<F> | null;
      revalidating: true;
    };

type Action<F extends Flags> =
  | { type: "evaluate"; input: Input }
  | { type: "revalidate" }
  | { type: "settle/success"; input: Input; outcome: SuccessOutcome<F> }
  | { type: "settle/failure"; input: Input; outcome: ErrorOutcome };

type Effect<F extends Flags> =
  | { type: "fetch"; input: Input }
  | { type: "set-visitor-key"; payload: string }
  | { type: "set-cache"; input: Input; outcome: SuccessOutcome<F> };

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
  tuple: readonly [State<F>, Effect<F>[]],
  action: Action<F>
): readonly [State<F>, Effect<F>[]] {
  const [state /* and effects */] = tuple;
  console.log(action.type);
  switch (action.type) {
    // fail hard (turn flags into null if failing)
    case "evaluate": {
      const cachedOutcome = cache.get<SuccessOutcome<F>>(action.input);

      // action.input will always differ from state.input, because we do not
      // dispatch "evaluate" otherwise
      return [
        {
          input: action.input,
          outcome: null,
          cachedOutcome,
          revalidating: false,
        },
        [{ type: "fetch", input: action.input }],
      ];
    }
    // fail soft (keep previous flags if failing)
    case "revalidate": {
      if (!state.input) return tuple;

      const cachedOutcome = cache.get<SuccessOutcome<F>>(state.input);
      return [
        {
          input: state.input,
          outcome: state.outcome,
          cachedOutcome: cachedOutcome,
          revalidating: true,
        },
        [{ type: "fetch", input: state.input }],
      ];
    }
    case "settle/success": {
      // skip outdated responses
      if (!deepEqual(action.input, state.input)) return tuple;

      const visitorKey = action.outcome.data.visitor?.key;

      return [
        { input: action.input, outcome: action.outcome, revalidating: false },
        ([
          // update cookie if response contains visitor key
          visitorKey ? { type: "set-visitor-key", payload: visitorKey } : null,
          // update cache
          { type: "set-cache", input: action.input, outcome: action.outcome },
        ] as Effect<F>[]).filter(Boolean),
      ];
    }
    case "settle/failure": {
      // skip outdated responses
      if (!deepEqual(action.input, state.input)) return tuple;

      return [
        {
          input: action.input,
          outcome: action.outcome,
          cachedOutcome: cache.get<SuccessOutcome<F>>(action.input),
          revalidating: false,
        },
        [],
      ];
    }
    default:
      return tuple;
  }
}

// When ready is undefined, it counts as true
const isReady = (ready: undefined | boolean) => ready === undefined || ready;

export const cache = new ObjectMap<Input, Outcome<Flags>>();

export type UseFlagsOptions<F extends Flags = Flags> =
  | {
      user?: FlagUser | null;
      traits?: Traits | null;
      initialState?: InitialFlagState<F>;
      revalidateOnFocus?: boolean;
      ready?: boolean;
    }
  | undefined;

export function useFlags<F extends Flags = Flags>(
  options: UseFlagsOptions<F> = {}
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
    (initialFlagState): [State<F>, Effect<F>[]] =>
      initialFlagState &&
      initialFlagState.input &&
      initialFlagState.outcome.data
        ? [
            {
              input: initialFlagState.input,
              outcome: initialFlagState.outcome,
              revalidating: false,
            },
            // do not cache static requests as they'll always be passed in from the
            // server anyhow, so they'd never be read from the cache
            initialFlagState.input.requestBody.static
              ? ([] as Effect<F>[])
              : ([
                  {
                    type: "set-cache",
                    input: initialFlagState.input,
                    outcome: initialFlagState.outcome,
                    revalidating: false,
                  },
                ] as Effect<F>[]),
          ]
        : [
            { input: null, outcome: null, revalidating: false },
            [] as Effect<F>[],
          ]
  );

  React.useEffect(() => {
    if (!isConfigured(config)) throw new MissingConfigurationError();

    const input: Input = {
      endpoint: config.endpoint,
      envKey: config.envKey,
      requestBody: {
        visitorKey: (() => {
          const cookie =
            typeof document !== "undefined"
              ? getCookie(document.cookie, "hkvk")
              : null;

          return (
            cookie || state.input?.requestBody.visitorKey || generatedVisitorKey
          );
        })(),
        user: currentUser,
        traits: currentTraits,
        static: false,
      },
    };

    // evaluate if the input has changed
    if (!deepEqual(state.input, input) && isReady(options.ready)) {
      dispatch({ type: "evaluate", input });
    }

    if (!shouldRevalidateOnFocus) return;

    function handleFocus() {
      if (document.visibilityState === "visible" && isReady(options.ready)) {
        dispatch({ type: "revalidate" });
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

  const revalidate = React.useCallback(() => dispatch({ type: "revalidate" }), [
    dispatch,
  ]);

  React.useEffect(() => {
    effects.forEach((effect) => {
      switch (effect.type) {
        // execute the effect
        case "fetch": {
          const { input } = effect;
          console.log("toggle fetch");
          fetch([input.endpoint, input.envKey].join("/"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input.requestBody),
          })
            .then(
              async (response) => {
                const data = (await response.json()) as EvaluationResponseBody<F>;
                if (response.ok /* response.status is 200-299 */) {
                  // responses to outdated requests are skipped in the reducer
                  const outcome = { data };
                  dispatch({ type: "settle/success", input, outcome });
                } else {
                  dispatch({
                    type: "settle/failure",
                    input,
                    outcome: { error: "response-not-ok" },
                  });
                }
              },
              () => {
                dispatch({
                  type: "settle/failure",
                  input,
                  outcome: { error: "invalid-response-body" },
                });
              }
            )
            .catch((error) => {
              console.error("HappyKit: Failed to load flags");
              console.error(error);
              dispatch({
                type: "settle/failure",
                input,
                outcome: { error: "network-error" },
              });
            });
          break;
        }

        case "set-visitor-key":
          document.cookie = serializeVisitorKeyCookie(effect.payload);
          break;

        case "set-cache":
          cache.set(effect.input, effect.outcome);
          break;

        default:
          return;
      }
    });
  }, [effects, dispatch]);

  const { defaultFlags } = config;

  const flagBag = React.useMemo<FlagBag<F>>(() => {
    if (!state.input)
      return {
        flags: null,
        data: null,
        error: null,
        // settled: false,
        fetching: false,
        visitorKey: null,
        revalidate,
      } as FlagBag<F>;

    if (!state.outcome) {
      return {
        flags: state.cachedOutcome?.data.flags
          ? combineRawFlagsWithDefaultFlags<F>(
              state.cachedOutcome.data.flags as F,
              defaultFlags
            )
          : // no defaultFlags fallback while fetching
            null,
        data: null,
        error: null,
        // settled: !state.cachedOutcome,
        fetching: true,
        visitorKey: state.input.requestBody.visitorKey,
        revalidate,
      } as FlagBag<F>;
    }

    if (state.outcome.error)
      return {
        flags: state.cachedOutcome?.data.flags
          ? combineRawFlagsWithDefaultFlags<F>(
              state.cachedOutcome.data.flags as F,
              defaultFlags
            )
          : // defaultFlags fallback when errored
            defaultFlags || null,
        data: null,
        error: state.outcome.error,
        // settled: true,
        fetching: state.revalidating,
        visitorKey: state.input.requestBody.visitorKey,
        revalidate,
      } as FlagBag<F>;

    return {
      flags: combineRawFlagsWithDefaultFlags<F>(
        state.outcome.data.flags as F,
        defaultFlags
      ),
      data: state.outcome.data,
      error: null,
      // settled: true,
      fetching: state.revalidating,
      visitorKey: state.input.requestBody.visitorKey,
      revalidate,
    } as FlagBag<F>;
  }, [state, defaultFlags]);

  return flagBag;
}
