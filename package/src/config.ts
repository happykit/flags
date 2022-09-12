import type { Flags } from "./internal/types";

/**
 * Configuration thing
 */
export type Configuration<F extends Flags> = {
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
};
