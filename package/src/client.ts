import * as React from "react";
import { nanoid } from "nanoid";
import type { Configuration } from "./config";
import {
  InitialFlagState,
  Flags,
  Input,
  Outcome,
  FlagUser,
  Traits,
  FlagBag,
  GenericEvaluationResponseBody,
  SuccessOutcome,
  ErrorOutcome,
  RevalidatingAfterErrorFlagBag,
  EmptyFlagBag,
  EvaluatingFlagBag,
  SucceededFlagBag,
  RevalidatingAfterSuccessFlagBag,
  FailedFlagBag,
  FullConfiguration,
} from "./internal/types";
import {
  deepEqual,
  getCookie,
  serializeVisitorKeyCookie,
  combineRawFlagsWithDefaultFlags,
  ObjectMap,
  has,
} from "./internal/utils";
import { applyConfigurationDefaults } from "./internal/apply-configuration-defaults";

export type {
  FlagUser,
  Traits,
  Flags,
  InitialFlagState,
  Input,
  Outcome,
  FlagBag,
} from "./internal/types";

type Id = number;
let getId = (() => {
  let id = 0;
  return (): Id => id++;
})();

type Pending = {
  id: Id;
  // null in case the browser doesn't support it
  controller: AbortController | null;
};

type State<F extends Flags> =
  // "empty" is an initial state candidate for csr
  | {
      name: "empty";
      input?: never;
      outcome?: never;
      cachedOutcome?: never;
      pending?: never;
    }
  | {
      name: "evaluating";
      input: Input;
      outcome?: never;
      cachedOutcome: SuccessOutcome<F> | null;
      pending: Pending | null;
    }
  // "succeeded" is an initial state candidate for ssr
  | {
      name: "succeeded";
      input: Input;
      outcome: SuccessOutcome<F>;
      cachedOutcome?: never;
      pending?: never;
    }
  | {
      name: "revalidating-after-success";
      input: Input;
      // the previous outcome
      outcome: SuccessOutcome<F>;
      cachedOutcome?: never;
      pending: Pending | null;
    }
  // "failed" is an initial state candidate for ssr
  | {
      name: "failed";
      input: Input;
      outcome: ErrorOutcome;
      cachedOutcome: SuccessOutcome<F> | null;
      pending?: never;
    }
  | {
      name: "revalidating-after-failure";
      input: Input;
      // the previous outcome
      outcome: ErrorOutcome;
      cachedOutcome: SuccessOutcome<F> | null;
      pending: Pending | null;
    };

type Action<F extends Flags> =
  // evaluate is for new inputs; the data and error get cleared
  | { type: "evaluate"; input: Input }
  // revalidate is for the same inputs; the data and error aren't cleared
  // it generally revalidates the same input, except for ssg when initial state
  // is passed in
  | { type: "revalidate"; input?: Input }
  | {
      type: "settle/success";
      id: Id;
      input: Input;
      outcome: SuccessOutcome<F>;
    }
  | {
      type: "settle/failure";
      id: Id;
      input: Input;
      outcome: ErrorOutcome;
      thrownError: any;
    };

type Effect =
  | {
      effect: "fetch";
      input: Input;
      id: Id;
      controller: AbortController | null;
    }
  // revalidate generally revalidates the same input, except for ssg when
  // initial state is passed in
  | { effect: "revalidate-input"; input?: Input };

/**
 * Returns new effects and pending state, cancels controller of previous pending
 * state.
 *
 * @param input Next input
 * @param pending Previous pending state
 * @returns [Effects to execute, Next pending state]
 */
function createFetchEffects<F extends Flags>(
  input: Input,
  pending?: Pending | null
): [Effect[], Pending] {
  const id = getId();

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;

  const fetchEffect: Effect = { effect: "fetch", id, controller, input };

  if (pending?.controller) pending.controller.abort();

  return [[fetchEffect], { id, controller }];
}

function canSettle<F extends Flags>(state: State<F>) {
  return (
    state.name === "evaluating" ||
    state.name === "revalidating-after-success" ||
    state.name === "revalidating-after-failure"
  );
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
      const cachedOutcome = cache.get<SuccessOutcome<F>>(action.input);

      const [effects, pending] = createFetchEffects<F>(
        action.input,
        state.pending
      );

      // action.input will always differ from state.input, because we do not
      // dispatch "evaluate" otherwise
      return [
        {
          name: "evaluating",
          input: action.input,
          cachedOutcome,
          pending,
        },
        effects,
      ];
    }
    case "revalidate": {
      if (state.name === "empty") return tuple;

      const input = action.input || state.input;
      const [effects, pending] = createFetchEffects<F>(input, state.pending);

      if (state.name === "succeeded")
        return [
          {
            name: "revalidating-after-success",
            input: state.input,
            outcome: state.outcome,
            cachedOutcome: state.cachedOutcome,
            pending,
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
            pending,
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
            pending,
          },
          effects,
        ];

      return tuple;
    }
    case "settle/failure": {
      if (!canSettle(state)) return tuple;

      // ignore outdated responses
      if (state.pending?.id !== action.id) return tuple;

      if (action.thrownError) {
        console.error("@happykit/flags: Failed to load flags");
        console.error(action.thrownError);
      }

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
      if (!canSettle(state)) return tuple;

      // ignore outdated responses
      if (state.pending?.id !== action.id) return tuple;

      const visitorKey = action.outcome.data.visitor?.key;
      if (visitorKey) document.cookie = serializeVisitorKeyCookie(visitorKey);

      cache.set(action.input, action.outcome);

      return [
        {
          name: "succeeded",
          input: action.input,
          outcome: action.outcome,
        },
        [],
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
  config: FullConfiguration<F>;
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
    },
  };
}

function omitStaticDifferences(input: Input) {
  return {
    ...input,
    requestBody: { ...input.requestBody, visitorKey: null },
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
  return currentInput && !currentInput.requestBody.visitorKey
    ? deepEqual(
        omitStaticDifferences(currentInput),
        omitStaticDifferences(nextInput)
      )
    : deepEqual(currentInput, nextInput);
}

let usedTimes = 0;
function useOnce() {
  React.useEffect(() => {
    usedTimes++;

    if (usedTimes > 1) {
      console.warn(
        [
          "@happykit/flags: Simultaneous invocations of useFlags() detected",
          "",
          "See https://happykit.dev/notes/1",
        ].join("\n")
      );
    }

    return () => {
      usedTimes--;
    };
  }, []);
}

export const cache = new ObjectMap<Input, Outcome<Flags>>();

interface FactoryUseFlagOptions {
  /**
   * By default `@happykit/flags` refetches the feature flags when the window
   * regains focus. You can disable this by passing `revalidateOnFocus: false`.
   */
  revalidateOnFocus?: boolean;
  /**
   * A timeout in milliseconds after which any client-side evaluation requests
   * from `useFlags` will be aborted.
   *
   * Pass `false` to disable this feature.
   *
   * This feature is only supported in [browsers which support](https://caniuse.com/abortcontroller) the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
   */
  clientLoadingTimeout?: number;
}

export type UseFlagsOptions<F extends Flags = Flags> =
  | ({
      user?: FlagUser | null;
      traits?: Traits | null;
      initialState?: InitialFlagState<F>;
      pause?: boolean;
    } & FactoryUseFlagOptions)
  | undefined;

/**
 * Creates a useFlags() function your application should use when loading flags on the client.
 */
export function createUseFlags<F extends Flags>(
  configuration: Configuration<F>,
  {
    revalidateOnFocus: factoryRevalidateOnFocus = true,
    clientLoadingTimeout: factoryClientLoadingOptions = 3000,
  }: FactoryUseFlagOptions = {}
) {
  const config = applyConfigurationDefaults(configuration);

  return function useFlags(options: UseFlagsOptions<F> = {}): FlagBag<F> {
    useOnce();

    const [generatedVisitorKey] = React.useState(nanoid);

    const currentUser = options.user || null;
    const currentTraits = options.traits || null;
    const shouldRevalidateOnFocus =
      options.revalidateOnFocus === undefined
        ? factoryRevalidateOnFocus
        : options.revalidateOnFocus;

    const currentClientLoadingTimeout = has(options, "clientLoadingTimeout")
      ? options.clientLoadingTimeout
      : factoryClientLoadingOptions;

    const [[state, effects], dispatch] = React.useReducer(
      reducer,
      options.initialState,
      (initialFlagState): [State<F>, Effect[]] => {
        if (!initialFlagState?.input) return [{ name: "empty" }, []];

        const input = getInput({
          config,
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
              cachedOutcome: cache.get<SuccessOutcome<F>>(
                initialFlagState.input
              ),
            },
            // always revalidate because the initial state failed
            [{ effect: "revalidate-input", input }],
          ];

        cache.set(initialFlagState.input, initialFlagState.outcome);

        return [
          {
            name: "succeeded",
            input: initialFlagState.input,
            outcome: initialFlagState.outcome,
          },
          // revalidate only if the initial state was for a static render
          initialFlagState.input.requestBody.visitorKey
            ? []
            : [{ effect: "revalidate-input", input }],
        ];
      }
    );

    React.useEffect(() => {
      const input = getInput({
        config,
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

    const revalidate = React.useCallback(
      () => dispatch({ type: "revalidate" }),
      [dispatch]
    );

    React.useEffect(() => {
      effects.forEach((effect) => {
        switch (effect.effect) {
          // execute the effect
          case "fetch": {
            const { id, input, controller } = effect;

            let timeoutId: ReturnType<typeof setTimeout>;
            if (controller && currentClientLoadingTimeout) {
              timeoutId = setTimeout(
                () => controller.abort(),
                currentClientLoadingTimeout
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
                    id,
                    input,
                    outcome: { error: "response-not-ok" },
                    thrownError: new Error("Response not ok"),
                  });
                  return null;
                }

                return response.json().then(
                  (data: GenericEvaluationResponseBody<F>) => {
                    // responses to outdated requests are skipped in the reducer
                    dispatch({
                      type: "settle/success",
                      id,
                      input,
                      outcome: { data },
                    });
                  },
                  (thrownError) => {
                    dispatch({
                      type: "settle/failure",
                      id,
                      input,
                      outcome: { error: "invalid-response-body" },
                      thrownError,
                    });
                    return null;
                  }
                );
              },
              (error) => {
                // aborted from controller due to timeout
                if (
                  error instanceof DOMException &&
                  error.name === "AbortError"
                ) {
                  dispatch({
                    type: "settle/failure",
                    id,
                    input,
                    outcome: { error: "request-timed-out" },
                    thrownError: error,
                  });
                } else {
                  dispatch({
                    type: "settle/failure",
                    id,
                    input,
                    outcome: { error: "network-error" },
                    thrownError: error,
                  });
                }

                return null;
              }
            );

            break;
          }

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
            settled: Boolean(state.input.requestBody.visitorKey),
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
            settled: Boolean(state.input.requestBody.visitorKey),
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
            settled: Boolean(state.input.requestBody.visitorKey),
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
            settled: Boolean(state.input.requestBody.visitorKey),
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
  };
}
