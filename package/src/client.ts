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
  tuple: [State<F>, Effect[]],
  action: Action<F>
): [State<F>, Effect[]] {
  const [state /* and effects */] = tuple;
  switch (action.type) {
    case "prefillFromLocalStorage": {
      if (state.current) return tuple;
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
    case "settle/success": {
      // skip outdated responses
      if (state.pending?.input !== action.input) return tuple;

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
    case "settle/failure": {
      return deepEqual(action.input, state.pending?.input)
        ? [
            {
              ...state,
              current: { input: action.input, outcome: null },
              pending: null,
              prefilledFromLocalStorage: false,
            },
            [],
          ]
        : tuple;
    }
    default:
      return tuple;
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
): FlagBag<F> {
  if (!isConfigured(config)) throw new MissingConfigurationError();

  const [generatedVisitorKey] = React.useState(nanoid);

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
              dispatch({
                type: "settle/success",
                input,
                outcome: { responseBody },
              });

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

  // sync to cache in localStorage
  React.useEffect(() => {
    if (shouldDisableCache || !state.current) return;
    localStorage.setItem(cacheKey, JSON.stringify(state.current));
  }, [shouldDisableCache, state.current]);

  const defaultFlags = config.defaultFlags;

  const flagBag = React.useMemo<FlagBag<F>>(() => {
    const loadedFlags =
      (state.current?.outcome?.responseBody.flags as F | undefined) || null;

    const flags = combineLoadedFlagsWithDefaultFlags<F>(
      loadedFlags,
      defaultFlags
    );

    // When the outcome was generated for a static site, then no visitor key
    // is present on the outcome. In that case, the state can not be seen as
    // settled as another revalidation will happen in which a visitor key will
    // get generated.
    return {
      flags,
      loadedFlags,
      fetching: Boolean(state.pending),
      settled: Boolean(
        state.current &&
          !state.current.input.requestBody.static &&
          !state.prefilledFromLocalStorage
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
