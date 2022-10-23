import type {
  Environment,
  Flag,
  FlagUserAttributes,
  FlagVariant,
  FlagVisitor,
} from "./evaluation-types";
import { resolveFlagToVariant } from "./internal/resolve-flag-to-variant";
import type { FlagUser, Traits } from "./internal/types";

export function toUser(incomingUser: {
  key: string;
  email?: unknown;
  name?: unknown;
  avatar?: unknown;
  language?: unknown;
  country?: unknown;
  timeZone?: unknown;
}) {
  if (!incomingUser) return null;
  if (typeof incomingUser !== "object") return null;
  if (typeof incomingUser.key !== "string") return null;
  if (incomingUser.key.trim().length === 0) return null;

  const user: FlagUserAttributes = {
    key: incomingUser.key.trim().substring(0, 516),
  };

  if (typeof incomingUser.email === "string")
    user.email = incomingUser.email.trim().substring(0, 516);
  if (typeof incomingUser.name === "string")
    user.name = incomingUser.name.trim().substring(0, 516);
  if (typeof incomingUser.avatar === "string")
    user.avatar = incomingUser.avatar.trim().substring(0, 1024);
  if (typeof incomingUser.language === "string")
    user.language = incomingUser.language.trim().substring(0, 1024);
  if (typeof incomingUser.timeZone === "string")
    user.timeZone = incomingUser.timeZone.trim().substring(0, 128);
  if (typeof incomingUser.country === "string")
    user.country = incomingUser.country.trim().substring(0, 2).toUpperCase();

  return user;
}

// the visitor attributes are always collected by the worker
export function toVisitor(visitorKey: string): FlagVisitor {
  return { key: visitorKey };
}

/**
 * Traits must be JSON.stringify-able and the result may at most be 4096 chars.
 * Keys may at most be 1024 chars.
 * otherwise the trait gets left out.
 */
export function toTraits(
  incomingTraits?: {
    [key: string]: any;
  } | null
): { [key: string]: any } | null {
  if (!incomingTraits) return null;
  if (typeof incomingTraits !== "object") return null;

  return Object.entries(incomingTraits).reduce<{ [key: string]: any }>(
    (acc, [key, value]) => {
      if (String(key).length > 1024) return acc;
      try {
        if (JSON.stringify(value).length > 4096) return acc;
      } catch (e) {
        return acc;
      }
      acc[key] = value;
      return acc;
    },
    {}
  );
}

export function toVariantValues(
  input: Record<string, FlagVariant | null>
): Record<string, FlagVariant["value"] | null> {
  return Object.entries(input).reduce<
    Record<string, FlagVariant["value"] | null>
  >((acc, [key, variant]) => {
    acc[key] = variant ? variant.value : null;
    return acc;
  }, {});
}

/**
 * Evaluates feature flags to their variant values given some inputs.
 */
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
