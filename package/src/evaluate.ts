import type {
  Environment,
  Flag,
  FlagVariant,
  FlagVisitor,
} from "./evaluation-types";
import { resolveFlagToVariant } from "./internal/resolve-flag-to-variant";
import type { FlagUser, Traits } from "./internal/types";

/**
 * Evaluates feature flags to their variant values given some inputs.
 */
export function unstable_evaluate({
  flags,
  environment,
  user,
  visitor,
  traits,
}: {
  flags: Flag[];
  environment: Environment;
  user: FlagUser | null;
  visitor: FlagVisitor | null;
  traits: Traits | null;
}) {
  return flags.reduce<Record<string, FlagVariant | null>>((acc, flag) => {
    const variant: FlagVariant | null = resolveFlagToVariant({
      flag,
      environment,
      user,
      visitor,
      traits,
    });

    acc[flag.slug] = variant ? variant : null;
    return acc;
  }, {});
}
