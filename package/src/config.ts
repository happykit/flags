import type {
  DefaultConfiguration,
  IncomingConfiguration,
  Flags,
} from "./types";

export type Configuration<F extends Flags> = DefaultConfiguration &
  IncomingConfiguration<F>;

/**
 * Throws if envKey or endpoint are missing in configuration
 */
export function validate<F extends Flags = Flags>(config: Configuration<F>) {
  if (!config.envKey || config.envKey.length === 0)
    throw new Error("@happykit/flags: envKey missing");
  if (!config.endpoint || config.endpoint.length === 0)
    throw new Error("@happykit/flags: endpoint missing");
}

export function configure<F extends Flags = Flags>(
  options: IncomingConfiguration<F>
): Configuration<F> {
  const defaults: DefaultConfiguration = {
    endpoint: "https://happykit.dev/api/flags",
    defaultFlags: {},
  };

  if (
    !options ||
    typeof options.envKey !== "string" ||
    options.envKey.length === 0
  ) {
    // We can't create a custom InvalidConfigurationError as that
    // would lead to the middleware "eval" warning:
    throw new Error("@happykit/flags: Invalid configuration");
  }

  return Object.assign({}, defaults, options) as Configuration<F>;
}
