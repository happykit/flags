import * as React from "react";
import { nanoid } from "nanoid";
import { isConfigured, config, Configuration } from "./config";
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
  RevalidatingAfterErrorFlagBag,
  EmptyFlagBag,
  EvaluatingFlagBag,
  SucceededFlagBag,
  RevalidatingAfterSuccessFlagBag,
  FailedFlagBag,
} from "./types";
import {
  deepEqual,
  getCookie,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
  ObjectMap,
  has,
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
  // initial state candidate for csr
  | { name: "empty"; input?: never; outcome?: never; cachedOutcome?: never }
  | {
      name: "evaluating";
      input: Input;
      outcome?: never;
      cachedOutcome: SuccessOutcome<F> | null;
    }
  // initial state candidate for ssr
  | {
      name: "succeeded";
      input: Input;
      outcome: SuccessOutcome<F>;
      cachedOutcome?: never;
    }
  | {
      name: "revalidating-after-success";
      input: Input;
      // the previous outcome
      outcome: SuccessOutcome<F>;
      cachedOutcome?: never;
    }
  // initial state candidate for ssr
  | {
      name: "failed";
      input: Input;
      outcome: ErrorOutcome;
      cachedOutcome: SuccessOutcome<F> | null;
    }
  | {
      name: "revalidating-after-failure";
      input: Input;
      // the previous outcome
      outcome: ErrorOutcome;
      cachedOutcome: SuccessOutcome<F> | null;
    };

type Action<F extends Flags> =
  | { type: "evaluate"; input: Input }
  // revalidate generally revalidates the same input, except for ssg when
  // initial state is passed in
  | { type: "revalidate"; input?: Input }
  | { type: "settle/success"; input: Input; outcome: SuccessOutcome<F> }
  | { type: "settle/failure"; input: Input; outcome: ErrorOutcome };

type Effect<F extends Flags> =
  | { effect: "fetch"; input: Input }
  // revalidate generally revalidates the same input, except for ssg when
  // initial state is passed in
  | { effect: "revalidate-input"; input?: Input }
  | { effect: "set-visitor-key"; payload: string }
  | { effect: "set-cache"; input: Input; outcome: SuccessOutcome<F> };

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

  switch (action.type) {
    case "evaluate": {
      const cachedOutcome = cache.get<SuccessOutcome<F>>(action.input);

      // action.input will always differ from state.input, because we do not
      // dispatch "evaluate" otherwise
      return [
        {
          name: "evaluating",
          input: action.input,
          cachedOutcome,
        },
        [{ effect: "fetch", input: action.input }],
      ];
    }
    case "revalidate": {
      if (state.name === "empty") return tuple;

      const input = action.input || state.input;
      const effects: Effect<F>[] = [{ effect: "fetch", input }];

      if (state.name === "succeeded")
        return [
          {
            name: "revalidating-after-success",
            input: state.input,
            outcome: state.outcome,
            cachedOutcome: state.cachedOutcome,
          },
          effects,
        ];

      if (state.name === "failed")
        return [
          {
            name: "revalidating-after-failure",
            input: state.input,
            outcome: state.outcome,
            cachedOutcome: state.cachedOutcome,
          },
          effects,
        ];

      if (state.name === "evaluating")
        return [
          {
            name: "evaluating",
            input: state.input,
            outcome: state.outcome,
            cachedOutcome: state.cachedOutcome,
          },
          effects,
        ];

      return tuple;
    }
    case "settle/failure": {
      if (
        state.name !== "evaluating" &&
        state.name !== "revalidating-after-success" &&
        state.name !== "revalidating-after-failure"
      )
        return tuple;

      // ignore outdated responses
      // this does not need to handle static inputs, as the static input
      // will have been replaced at the beginning of the fetch request
      if (!deepEqual(state.input, action.input)) return tuple;

      const cachedOutcome = cache.get<SuccessOutcome<F>>(action.input);
      return [
        {
          name: "failed",
          input: action.input,
          outcome: action.outcome,
          cachedOutcome,
        },
        [],
      ];
    }
    case "settle/success": {
      if (
        state.name !== "evaluating" &&
        state.name !== "revalidating-after-success" &&
        state.name !== "revalidating-after-failure"
      )
        return tuple;

      // ignore outdated responses
      if (!isAlmostEqual(state.input, action.input)) return tuple;

      const setCacheEffect: Effect<F> = {
        effect: "set-cache",
        input: action.input,
        outcome: action.outcome,
      };

      return [
        {
          name: "succeeded",
          input: action.input,
          outcome: action.outcome,
        },
        action.outcome.data.visitor
          ? [
              {
                effect: "set-visitor-key",
                payload: action.outcome.data.visitor.key,
              },
              setCacheEffect,
            ]
          : [setCacheEffect],
      ];
    }

    default:
      return tuple;
  }
}

function getInput<F extends Flags>({
  config,
  visitorKeyInState,
  generatedVisitorKey,
  user,
  traits,
}: {
  config: Configuration<F>;
  visitorKeyInState: string | null | undefined;
  generatedVisitorKey: string;
  user: FlagUser | null;
  traits: Traits | null;
}): Input {
  const cookie =
    typeof document !== "undefined" ? getCookie(document.cookie, "hkvk") : null;

  return {
    endpoint: config.endpoint,
    envKey: config.envKey,
    requestBody: {
      visitorKey: cookie || visitorKeyInState || generatedVisitorKey,
      user,
      traits,
      static: false,
    },
  };
}

function omitStaticDifferences(input: Input) {
  return {
    ...input,
    requestBody: { ...input.requestBody, static: null, visitorKey: null },
  };
}

/**
 * Returns true if the inputs are exactly equal...
 *
 * Or in case the current input is static, returns true when they are the same
 * except for the static properties ("static" and "visitorKey").
 */
function isAlmostEqual(
  currentInput: Input | undefined,
  nextInput: Input
): boolean {
  // special treatment when the current input is static
  // in this case, we ignore the static and visitorKey properties
  return currentInput?.requestBody.static
    ? deepEqual(
        omitStaticDifferences(currentInput),
        omitStaticDifferences(nextInput)
      )
    : deepEqual(currentInput, nextInput);
}

export const cache = new ObjectMap<Input, Outcome<Flags>>();

export type UseFlagsOptions<F extends Flags = Flags> =
  | {
      user?: FlagUser | null;
      traits?: Traits | null;
      initialState?: InitialFlagState<F>;
      revalidateOnFocus?: boolean;
      pause?: boolean;
      loadingTimeout?: number | false;
    }
  | undefined;

export function useFlags<F extends Flags = Flags>(
  options: UseFlagsOptions<F> = {}
): FlagBag<F> {
  if (!isConfigured(config)) throw new MissingConfigurationError();
  const staticConfig = config;

  const [generatedVisitorKey] = React.useState(nanoid);

  const currentUser = options.user || null;
  const currentTraits = options.traits || null;
  const shouldRevalidateOnFocus =
    options.revalidateOnFocus === undefined
      ? config.revalidateOnFocus
      : options.revalidateOnFocus;

  const currentLoadingTimeout = has(options, "loadingTimeout")
    ? options.loadingTimeout
    : config.loadingTimeout || 0;

  const [[state, effects], dispatch] = React.useReducer(
    reducer,
    options.initialState,
    (initialFlagState): [State<F>, Effect<F>[]] => {
      if (!initialFlagState?.input) return [{ name: "empty" }, []];

      const input = getInput({
        config: staticConfig,
        visitorKeyInState: initialFlagState.input.requestBody.visitorKey,
        generatedVisitorKey,
        user: currentUser,
        traits: currentTraits,
      });

      if (initialFlagState.outcome.error)
        return [
          {
            name: "failed",
            input: initialFlagState.input,
            outcome: initialFlagState.outcome,
            cachedOutcome: cache.get<SuccessOutcome<F>>(initialFlagState.input),
          },
          // always revalidate because the initial state failed
          [{ effect: "revalidate-input", input }],
        ];

      const setCacheEffect: Effect<F> = {
        effect: "set-cache",
        input: initialFlagState.input,
        outcome: initialFlagState.outcome,
      };

      return [
        {
          name: "succeeded",
          input: initialFlagState.input,
          outcome: initialFlagState.outcome,
        },
        // revalidate only if the initial state was for a static render
        initialFlagState.input.requestBody.static
          ? [setCacheEffect, { effect: "revalidate-input", input }]
          : [setCacheEffect],
      ];
    }
  );

  React.useEffect(() => {
    const input = getInput({
      config: staticConfig,
      visitorKeyInState: state.input?.requestBody.visitorKey,
      generatedVisitorKey,
      user: currentUser,
      traits: currentTraits,
    });

    // evaluate if the input has changed, but not if the current input is
    // static as that will be revalidated on initialisation
    if (!options.pause && !isAlmostEqual(state.input, input)) {
      dispatch({ type: "evaluate", input });
    }

    if (!shouldRevalidateOnFocus) return;

    function handleFocus() {
      if (document.visibilityState === "visible" && !options.pause) {
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
    options.pause,
  ]);

  const revalidate = React.useCallback(() => dispatch({ type: "revalidate" }), [
    dispatch,
  ]);

  React.useEffect(() => {
    effects.forEach((effect) => {
      switch (effect.effect) {
        // execute the effect
        case "fetch": {
          const { input } = effect;

          const controller =
            typeof AbortController !== "undefined"
              ? new AbortController()
              : null;

          let timeoutId: ReturnType<typeof setTimeout>;
          if (controller && currentLoadingTimeout) {
            timeoutId = setTimeout(
              () => controller.abort(),
              currentLoadingTimeout
            );
          }

          fetch([input.endpoint, input.envKey].join("/"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input.requestBody),
            signal: controller?.signal,
          }).then(
            (response) => {
              clearTimeout(timeoutId);

              if (!response.ok /* response.status is not 200-299 */) {
                dispatch({
                  type: "settle/failure",
                  input,
                  outcome: { error: "response-not-ok" },
                });
                return null;
              }

              return response.json().then(
                (data: EvaluationResponseBody<F>) => {
                  // responses to outdated requests are skipped in the reducer
                  dispatch({
                    type: "settle/success",
                    input,
                    outcome: { data },
                  });
                },
                () => {
                  dispatch({
                    type: "settle/failure",
                    input,
                    outcome: { error: "invalid-response-body" },
                  });
                  return null;
                }
              );
            },
            (error) => {
              console.error("HappyKit: Failed to load flags");
              console.error(error);

              // aborted from controller due to timeout
              if (
                error instanceof DOMException &&
                error.name === "AbortError"
              ) {
                dispatch({
                  type: "settle/failure",
                  input,
                  outcome: { error: "request-timed-out" },
                });
              } else {
                dispatch({
                  type: "settle/failure",
                  input,
                  outcome: { error: "network-error" },
                });
              }

              return null;
            }
          );
          break;
        }

        case "set-visitor-key":
          document.cookie = serializeVisitorKeyCookie(effect.payload);
          break;

        case "set-cache":
          cache.set(effect.input, effect.outcome);
          break;

        case "revalidate-input":
          dispatch({ type: "revalidate", input: effect.input });
          break;

        default:
          return;
      }
    });
  }, [effects, dispatch]);

  const { defaultFlags } = config;

  const flagBag = React.useMemo<FlagBag<F>>(() => {
    switch (state.name) {
      case "evaluating":
        return {
          flags: state.cachedOutcome?.data.flags
            ? combineRawFlagsWithDefaultFlags(
                state.cachedOutcome.data.flags,
                defaultFlags
              )
            : null,
          data: null,
          error: null,
          fetching: true,
          settled: false,
          revalidate,
          visitorKey: state.input.requestBody.visitorKey,
        } as EvaluatingFlagBag<F>;
      case "succeeded":
        return {
          flags: combineRawFlagsWithDefaultFlags(
            state.outcome.data.flags,
            defaultFlags
          ),
          data: state.outcome.data,
          error: null,
          fetching: false,
          settled: !state.input.requestBody.static,
          revalidate,
          visitorKey: state.input.requestBody.visitorKey,
        } as SucceededFlagBag<F>;
      case "revalidating-after-success":
        return {
          flags: combineRawFlagsWithDefaultFlags(
            state.outcome.data.flags,
            defaultFlags
          ),
          data: state.outcome.data,
          error: null,
          fetching: true,
          settled: !state.input.requestBody.static,
          revalidate,
          visitorKey: state.input.requestBody.visitorKey,
        } as RevalidatingAfterSuccessFlagBag<F>;
      case "failed":
        return {
          flags: state.cachedOutcome?.data.flags
            ? combineRawFlagsWithDefaultFlags(
                state.cachedOutcome.data.flags,
                defaultFlags
              )
            : defaultFlags || null,
          data: null,
          error: state.outcome.error,
          fetching: false,
          settled: !state.input.requestBody.static,
          revalidate,
          visitorKey: state.input.requestBody.visitorKey,
        } as FailedFlagBag<F>;
      case "revalidating-after-failure":
        return {
          flags: state.cachedOutcome?.data.flags
            ? combineRawFlagsWithDefaultFlags(
                state.cachedOutcome.data.flags,
                defaultFlags
              )
            : defaultFlags || null,
          data: null,
          error: state.outcome.error,
          fetching: true,
          settled: !state.input.requestBody.static,
          revalidate,
          visitorKey: state.input.requestBody.visitorKey,
        } as RevalidatingAfterErrorFlagBag<F>;
      default:
      case "empty":
        return {
          flags: null,
          data: null,
          error: null,
          fetching: false,
          settled: false,
          revalidate,
          visitorKey: null,
        } as EmptyFlagBag;
    }
  }, [state, defaultFlags, revalidate]);

  return flagBag;
}
