import type { Flags, FullConfiguration } from "./types";
import type { Configuration } from "../config";
import type { Environment } from "../evaluation-types";

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

  const match = incomingConfig.envKey.match(
    /^flags_pub_(?:(development|preview|production)_)?([a-z0-9]+)$/
  );
  if (!match) throw new Error("@happykit/flags: invalid envKey");
  const projectId = match[2];
  const environment: Environment = (match[1] as Environment) || "production";

  if (!projectId)
    throw new Error("@happykit/flags: could not parse projectId from envKey");
  if (!environment)
    throw new Error("@happykit/flags: could not parse environment from envKey");

  return Object.assign({}, defaults, incomingConfig, {
    projectId,
    environment,
  }) as FullConfiguration<F>;
}
