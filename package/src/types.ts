export type FlagUser = {
  key: string;
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

export type Outcome<F extends Flags> = {
  responseBody: EvaluationResponseBody<F>;
};

export type EvaluationRequestBody = {
  visitorKey: string | null;
  user: FlagUser | null;
  traits: Traits | null;
  static: boolean;
};

export type EvaluationResponseBody<F extends Flags> = {
  visitor: { key: string } | null;
  flags: F;
};

export type InitialFlagState<F extends Flags> = {
  input: Input;
  outcome: Outcome<F> | null;
};

export class InvalidConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Invalid configuration");
  }
}

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
};

export type DefaultConfiguration = {
  endpoint: string;
  defaultFlags: Flags;
  revalidateOnFocus: boolean;
};

export interface FlagBag<F extends Flags> {
  /**
   * The resolved feature flags, extended with the defaults.
   */
  flags: F;
  /**
   * The feature flags as loaded from the API, without default fallbacks.
   */
  loadedFlags: F | null;
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
