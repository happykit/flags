import type { Flags, FullConfiguration } from "./types";
import type { Configuration } from "../config";

export function applyConfigurationDefaults<F extends Flags>(
  incomingConfig: Configuration<F>
) {
  if (!incomingConfig) throw new Error("@happykit/flags: config missing");
  if (!incomingConfig.envKey || incomingConfig.envKey.length === 0)
    throw new Error("@happykit/flags: envKey missing");

  const defaults = {
    endpoint: "https://happykit.dev/api/flags",
    defaultFlags: {} as F,
  };

  return Object.assign({}, defaults, incomingConfig) as FullConfiguration<F>;
}
