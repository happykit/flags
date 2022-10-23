import { CookieSerializeOptions } from "cookie";
import { Configuration } from "../config";
import type { Environment } from "../evaluation-types";

/**
 * A user to load the flags for. A user must at least have a `key`. See the
 * supported user attributes [here](#supported-user-attributes).
 * The user information you pass can be used for individual targeting or rules.
 */
export type FlagUser = {
  key: string;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

/**
 * Traits
 *
 * An object which you have access to in the flag's rules.
 * You can target users based on traits.
 */
export type Traits = { [key: string]: any };

/**
 * Generic Feature Flags
 *
 * Entries consist of the feature flag name as the key and the resolved variant's value as the value.
 */
export type Flags = {
  // A flag can resolve to null when a percentage based rollout is set based
  // on a criteria not present on the user, e.g. when bucketing by trait,
  // but no such trait was sent
  [key: string]: boolean | number | string | null;
};

export type FullConfiguration<F extends Flags> = Required<Configuration<F>> & {
  projectId: string;
  environment: Environment;
};

/**
 * The inputs to a flag evaluation.
 *
 * Given a flag has not changed, the same inputs will always lead to the same variants when evaluating a flag.
 */
export type Input = {
  endpoint: string;
  envKey: string;
  requestBody: EvaluationRequestBody;
};

export type SuccessOutcome<F extends Flags> = {
  data: GenericEvaluationResponseBody<F>;
  error?: never;
};

export type ErrorOutcome = {
  data?: never;
  error: ResolvingError;
};

/**
 * The result of a flag evaluation
 */
export type Outcome<F extends Flags> = SuccessOutcome<F> | ErrorOutcome;

/**
 * The fetch() request failed due to a network error (fetch itself threw).
 */
type NetworkError = "network-error";
/**
 * The response body could not be parsed into the expected JSON structure.
 */
type InvalidResponseBodyError = "invalid-response-body";
/**
 * The HTTP Status Code was not 200-299, so the response was not ok.
 */
type ResponseNotOkError = "response-not-ok";
/**
 * The request was aborted because it reached any of the loadingTimeouts.
 */
type RequestTimeoutError = "request-timed-out";

export type ResolvingError =
  | NetworkError
  | InvalidResponseBodyError
  | ResponseNotOkError
  | RequestTimeoutError;

export type EvaluationRequestBody = {
  visitorKey: string | null;
  user: FlagUser | null;
  traits: Traits | null;
};

/**
 * The HappyKit API response to a feature flag evaluation request.
 */
export type GenericEvaluationResponseBody<F extends Flags> = {
  visitor: { key: string } | null;
  flags: F;
};

export type SuccessInitialFlagState<F extends Flags> = {
  input: Input;
  outcome: SuccessOutcome<F>;
  error?: never;
};

export type ErrorInitialFlagState = {
  input: Input;
  outcome: ErrorOutcome;
};

/**
 * The initial flag state.
 *
 * In case you preloaded your flags during server-side rendering using `getFlags()`, provide the returned state as `initialState`. The client will then skip the first request whenever possible and use the provided flags instead. This allows you to get rid of loading states and on the client.
 */
export type InitialFlagState<F extends Flags> =
  | SuccessInitialFlagState<F>
  | ErrorInitialFlagState;

type Revalidate = () => void;

export type EmptyFlagBag = {
  flags: null;
  data: null;
  error: null;
  fetching: false;
  settled: false;
  revalidate: Revalidate;
  visitorKey: null;
};

export type EvaluatingFlagBag<F extends Flags> = {
  flags: null | F;
  data: null;
  error: null;
  fetching: true;
  settled: false;
  revalidate: Revalidate;
  visitorKey: string;
};

export type SucceededFlagBag<F extends Flags> = {
  flags: F;
  data: GenericEvaluationResponseBody<F>;
  error: null;
  fetching: false;
  // true, unless input is for a static page (has no visitorKey)
  settled: boolean;
  revalidate: Revalidate;
  visitorKey: string;
};

export type RevalidatingAfterSuccessFlagBag<F extends Flags> = {
  flags: F;
  data: GenericEvaluationResponseBody<F>;
  error: null;
  fetching: true;
  settled: boolean;
  revalidate: Revalidate;
  visitorKey: string;
};

export type FailedFlagBag<F extends Flags> = {
  flags: F | null; // cached or default or null
  data: null;
  error: ResolvingError;
  fetching: false;
  // true, unless input is for a static page (has no visitorKey)
  settled: boolean;
  revalidate: Revalidate;
  visitorKey: string;
};

export type RevalidatingAfterErrorFlagBag<F extends Flags> = {
  flags: F | null; // cached or default or null
  data: null;
  error: ResolvingError;
  fetching: true;
  settled: false;
  revalidate: Revalidate;
  visitorKey: string;
};

/**
 * A bag of feature flag related data.
 */
export type FlagBag<F extends Flags = Flags> =
  | EmptyFlagBag
  | EvaluatingFlagBag<F>
  | SucceededFlagBag<F>
  | RevalidatingAfterSuccessFlagBag<F>
  | FailedFlagBag<F>
  | RevalidatingAfterErrorFlagBag<F>;

export type GetFlagsSuccessBag<F extends Flags> = {
  /**
   * The resolved flags
   *
   * In case the default flags contain flags not present in the loaded flags,
   * the missing flags will get added to the returned flags.
   */
  flags: F;
  /**
   * The actually loaded data without any defaults applied, or null when
   * the flags could not be loaded.
   */
  data: GenericEvaluationResponseBody<F> | null;
  error: null;
  initialFlagState: SuccessInitialFlagState<F>;
  /**
   * The cookie options you should forward using
   *
   * Only used for edge, not for server.
   *
   * ```
   * response.cookie(
   *   flagBag.cookie.name,
   *   flagBag.cookie.value,
   *   flagBag.cookie.options
   * );
   * ```
   *
   * or using
   *
   * ```
   * response.cookie(...flagBag.cookie.args)
   * ```
   */
  cookie?: {
    name: string;
    value: string;
    options: CookieSerializeOptions;
    /**
     * Arguments for response.cookie()
     */
    args: [string, string, CookieSerializeOptions];
  } | null;
};

export type GetFlagsErrorBag<F extends Flags> = {
  /**
   * The resolved flags
   *
   * In case the flags could not be loaded, you will see the default
   * flags here (from config.defaultFlags)
   */
  flags: F | null;
  /**
   * The actually loaded data without any defaults applied, or null when
   * the flags could not be loaded.
   */
  data: null;
  error: ResolvingError;
  /**
   * The initial flag state that you can use to initialize useFlags()
   */
  initialFlagState: ErrorInitialFlagState;
  /**
   * Only used for edge, not for server.
   */
  cookie?: null;
};
