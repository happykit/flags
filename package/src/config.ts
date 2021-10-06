import {
  DefaultConfiguration,
  IncomingConfiguration,
  Flags,
  InvalidConfigurationError,
} from "./types";

export type Configuration<F extends Flags> = DefaultConfiguration &
  IncomingConfiguration<F>;
export let config: Configuration<Flags> | null = null;

export function _resetConfig() {
  config = null;
}

export function configure<F extends Flags = Flags>(
  options: IncomingConfiguration<F>
) {
  const defaults: DefaultConfiguration = {
    endpoint: "https://happykit.dev/api/flags",
    defaultFlags: {},
    revalidateOnFocus: true,
    clientLoadingTimeout: 3000,
    serverLoadingTimeout: 3000,
    staticLoadingTimeout: 60000,
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
