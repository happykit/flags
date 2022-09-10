import type {
  Environment,
  Flag,
  FlagVariant,
  FlagVisitor,
} from "./api-route-types";
import { resolveFlagToVariant } from "./resolve-flag-to-variant";
import type { FlagUser, Traits } from "./types";

export function evaluate({
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