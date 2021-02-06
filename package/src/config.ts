import {
  DefaultConfiguration,
  IncomingConfiguration,
  Flags,
  InvalidConfigurationError,
} from "./types";

export type Configuration<F extends Flags> = DefaultConfiguration &
  IncomingConfiguration<F>;
export let config: Configuration<Flags> | null = null;

export function configure<F extends Flags = Flags>(
  options: IncomingConfiguration<F> & Partial<DefaultConfiguration>
) {
  const defaults: DefaultConfiguration = {
    endpoint: "https://happykit.dev/api/flags",
    fetch,
    defaultFlags: {},
    revalidateOnFocus: true,
    disableCache: false,
  };

  if (
    !options ||
    typeof options.envKey !== "string" ||
    options.envKey.length === 0
  )
    throw new InvalidConfigurationError();

  config = Object.assign({}, defaults, options);
}

export function isConfigured<F extends Flags, C = Configuration<F>>(
  c: C | null
): c is C {
  return c !== null;
}
