export type FlagUser = {
  key: string;
  /**
   * Persist user in HappyKit
   *
   * @deprecated This feature has been removed. It is no longer possible to persist users.
   */
  persist?: boolean;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

export type Traits = { [key: string]: any };

export type Flags = {
  // A flag can resolve to null when a percentage based rollout is set based
  // on a criteria not present on the user, e.g. when bucketing by trait,
  // but no such trait was sent
  [key: string]: boolean | number | string | null;
};

export class MissingConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Missing configuration. Call configure() first.");
  }
}

export type Input = {
  endpoint: string;
  envKey: string;
  requestBody: EvaluationRequestBody;
};

export type SuccessOutcome<F extends Flags> = {
  data: EvaluationResponseBody<F>;
  error?: never;
};

export type ErrorOutcome = {
  data?: never;
  error: ResolvingError;
};

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

export type EvaluationResponseBody<F extends Flags> = {
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

export type InitialFlagState<F extends Flags> =
  | SuccessInitialFlagState<F>
  | ErrorInitialFlagState;

export type IncomingConfiguration<F extends Flags> = {
  /**
   * Find this key in your happykit.dev project settings.
   *
   * It specifies the project and environment your flags will be loaded for.
   *
   * There are three different keys per project, one for each of these
   * environments: development, preview and production.
   *
   * It's recommeneded to stor eyour `envKey` in an environment variable like
   * `NEXT_PUBLIC_FLAGS_ENV_KEY`. That way you can pass in a different env key
   * for each environment easily.
   */
  envKey: string;
  /**
   * Where the environment variables will be fetched from.
   *
   * This gets combined with your `envKey` into something like
   * `https://happykit.dev/api/flags/flags_pub_000000000`.
   *
   * It is rare that you need to pass this in. It is mostly used for development
   * of this library itself, but it might be useful when you have to proxy the
   * feature flag requests for whatever reason.
   *
   * @default "https://happykit.dev/api/flags"
   */
  endpoint?: string;
  /**
   * A flags object that will be used as the default.
   *
   * This default kicks in when the flags could not be loaded from the server
   * for whatever reason.
   *
   * The default is also used to extend the loaded flags. When a flag was deleted
   * in happykit, but you have a default set up for it, the default will be served.
   *
   * This is most useful to gracefully deal with loading errors of feature flags.
   * It also keeps the number of possible states a flag can be in small, as
   * you'll have the guarantee that all flags will always have a value when you set this.
   *
   * This can be useful while you're developing in case you haven't created a new
   * flag yet, but want to program as if it already exists.
   *
   * @default `{}`
   */
  defaultFlags?: F;
  /**
   * By default `@happykit/flags` refetches the feature flags when the window
   * regains focus. You can disable this by passing `revalidateOnFocus: false`.
   */
  revalidateOnFocus?: boolean;
  /**
   * @deprecated Use clientLoadingTimeout instead.
   */
  loadingTimeout?: number;
  /**
   * A timeout in milliseconds after which any client-side evaluation requests
   * from `useFlags` will be aborted.
   *
   * Pass `false` to disable this feature.
   *
   * This feature is only supported in [browsers which support](https://caniuse.com/abortcontroller) the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
   */
  clientLoadingTimeout?: number;
  /**
   * A timeout in milliseconds after which any server-side evaluation requests
   * from `getFlags` inside of `getServerSideProps` will be aborted.
   *
   * Pass `false` to disable this feature.
   */
  serverLoadingTimeout?: number;
  /**
   * A timeout in milliseconds after which any static evaluation requests
   * from `getFlags` inside of `getStaticProps` or `getStaticPaths` will
   * be aborted.
   *
   * Pass `false` to disable this feature.
   */
  staticLoadingTimeout?: number;
};

export type DefaultConfiguration = {
  endpoint: string;
  defaultFlags: Flags;
  revalidateOnFocus: boolean;
  clientLoadingTimeout?: number;
  serverLoadingTimeout?: number;
  staticLoadingTimeout?: number;
};

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
  data: EvaluationResponseBody<F>;
  error: null;
  fetching: false;
  // true, unless input is for a static page (has no visitorKey)
  settled: boolean;
  revalidate: Revalidate;
  visitorKey: string;
};

export type RevalidatingAfterSuccessFlagBag<F extends Flags> = {
  flags: F;
  data: EvaluationResponseBody<F>;
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

export type FlagBag<F extends Flags = Flags> =
  | EmptyFlagBag
  | EvaluatingFlagBag<F>
  | SucceededFlagBag<F>
  | RevalidatingAfterSuccessFlagBag<F>
  | FailedFlagBag<F>
  | RevalidatingAfterErrorFlagBag<F>;
