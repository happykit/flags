import type {
  DefaultConfiguration,
  IncomingConfiguration,
  Flags,
} from "./types";

export type Configuration<F extends Flags> = DefaultConfiguration &
  IncomingConfiguration<F>;

export function configure<F extends Flags = Flags>(
  options: IncomingConfiguration<F>
): Configuration<F> {
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
  ) {
    // We can't create a custom InvalidConfigurationError as that
    // would lead to the middleware "eval" warning:
    throw new Error("@happykit/flags: Invalid configuration");
  }

  const config = Object.assign({}, defaults, options);

  return config as Configuration<F>;
}
