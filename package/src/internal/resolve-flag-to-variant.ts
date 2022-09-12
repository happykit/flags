import { murmur } from "./murmur";
import {
  Condition,
  FlagVisitor,
  FlagUserAttributes,
  Flag,
  RolloutFlagResolution,
  FlagVariant,
  FlagResolution,
  Environment,
} from "../evaluation-types";

function hasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

type Traits = Record<string, string | number | null | undefined>;

function matchCondition(
  condition: Condition,
  visitor: FlagVisitor | null | undefined,
  user: FlagUserAttributes | null | undefined,
  traits: Traits | null | undefined
): boolean {
  if (condition.group === "user") {
    // when a user is missing the user rules can't match, except when the
    // operator is "not-authenticated" in which case the rule matches
    if (!user || !user.key) return condition.operator === "not-authenticated";

    switch (condition.operator) {
      case "equal-to":
        return String(user[condition.lhs]) === condition.rhs;
      case "not-equal-to":
        return String(user[condition.lhs]) !== condition.rhs;
      case "authenticated":
        return Boolean(user.key);
      case "not-authenticated":
        return !user || !user.key;
      case "set":
        return hasOwnProperty(user, condition.lhs);
      case "not-set":
        return !hasOwnProperty(user, condition.lhs);
      case "starts-with": {
        const lhs = user[condition.lhs];
        const rhs = condition.rhs;
        return (
          typeof lhs === "string" &&
          typeof rhs === "string" &&
          lhs.toLowerCase().startsWith(rhs.toLowerCase())
        );
      }
      case "ends-with": {
        const lhs = user[condition.lhs];
        const rhs = condition.rhs;
        return (
          typeof lhs === "string" &&
          typeof rhs === "string" &&
          lhs.toLowerCase().endsWith(rhs.toLowerCase())
        );
      }
    }
  } else if (condition.group === "visitor") {
    switch (condition.operator) {
      case "equal-to":
        return Boolean(
          visitor && String(visitor[condition.lhs]) === condition.rhs
        );
      case "not-equal-to":
        return Boolean(
          visitor && String(visitor[condition.lhs]) !== condition.rhs
        );
      case "set":
        return Boolean(visitor && hasOwnProperty(visitor, condition.lhs));
      case "not-set":
        return !visitor || !hasOwnProperty(visitor, condition.lhs);
      case "starts-with": {
        if (!visitor) return false;
        const lhs = visitor[condition.lhs];
        const rhs = condition.lhs;
        return (
          typeof lhs === "string" &&
          typeof rhs === "string" &&
          lhs.toLowerCase().startsWith(rhs.toLowerCase())
        );
      }
      case "ends-with": {
        if (!visitor) return false;
        const lhs = visitor[condition.lhs];
        const rhs = condition.rhs;
        return (
          typeof lhs === "string" &&
          typeof rhs === "string" &&
          lhs.toLowerCase().endsWith(rhs.toLowerCase())
        );
      }
    }
  } else if (condition.group === "traits") {
    switch (condition.operator) {
      case "equal-to":
        return Boolean(
          traits && String(traits[condition.lhs]) === condition.rhs
        );
      case "not-equal-to":
        return Boolean(
          traits && String(traits[condition.lhs]) !== condition.rhs
        );
      case "set":
        return Boolean(traits && hasOwnProperty(traits, condition.lhs));
      case "not-set":
        return !traits || !hasOwnProperty(traits, condition.lhs);
      case "starts-with": {
        if (!traits) return false;
        const lhs = traits[condition.lhs];
        const rhs = condition.rhs;
        return (
          typeof lhs === "string" &&
          typeof rhs === "string" &&
          lhs.toLowerCase().startsWith(rhs.toLowerCase())
        );
      }
      case "ends-with": {
        if (!traits) return false;
        const lhs = traits[condition.lhs];
        const rhs = condition.rhs;
        return (
          typeof lhs === "string" &&
          typeof rhs === "string" &&
          lhs.toLowerCase().endsWith(rhs.toLowerCase())
        );
      }
    }
  } else {
    return false;
  }
}

function resolvePercentageRolloutToVariant(
  splitValue: string | number,
  flag: Pick<Flag, "id" | "variants">,
  resolution: RolloutFlagResolution
) {
  // First we need to sort the buckets by the variant order for consistency,
  // otherwise the same murmur number might end up in different buckets each
  // time
  const buckets = (flag.variants as FlagVariant[])
    .map((variant) => {
      return { variant, weight: resolution.variants[variant.id].weight };
    })
    // strip out any buckets with no weight
    .filter((bucket) => bucket.weight > 0);

  // mix flag id into hash for more diverse results
  const murmurNumber = murmur(String(splitValue) + flag.id);

  const scaledMurmurNumber = murmurNumber % 10000;
  let upperLimit = 0;
  const bucket = buckets.find((bucketCandidate) => {
    // Weights go from 0-100 with two decimals, so we multiply them by
    // 100 to turn them into integers from 0-10000, but we also need to
    // use parseInt() to cut off any floating point decimal rounding errors,
    // otherwise 1.09 * 100 would turn into 109.00000000000001 instead of 109.
    upperLimit += parseInt(String(bucketCandidate.weight * 100), 10);
    return scaledMurmurNumber < upperLimit;
  });

  if (bucket) return bucket.variant;

  return null;
}

function getResolution({
  flag,
  environment,
  visitor,
  user,
  traits,
}: Options): FlagResolution {
  const envConfig = flag[environment];
  if (!envConfig.active)
    return { mode: "variant", variant: envConfig.offVariation };

  if (user) {
    const variantIdTargetingUserKey = Object.keys(envConfig.targets).find(
      (variantId) => envConfig.targets[variantId].values.includes(user.key)
    );

    if (variantIdTargetingUserKey)
      return {
        mode: "variant",
        variant: variantIdTargetingUserKey,
      };
  }

  if (Array.isArray(envConfig.rules)) {
    const matchedRule = envConfig.rules.find((rule) =>
      rule.conditions.every((condition) =>
        matchCondition(condition, visitor, user, traits)
      )
    );

    if (matchedRule) return matchedRule.resolution;
  }

  return envConfig.fallthrough;
}

interface Options {
  flag: {
    id: Flag["id"];
    production: Flag["production"];
    preview: Flag["preview"];
    development: Flag["development"];
    variants: Flag["variants"];
  };
  environment: Environment;
  visitor?: FlagVisitor | null;
  user?: FlagUserAttributes | null;
  traits?: Traits | null;
}

function resolveResolution(
  { flag, environment, visitor, user, traits }: Options,
  resolution: FlagResolution
) {
  // This part serves the determined resolution
  if (resolution.mode === "variant") {
    const variant = (flag.variants as FlagVariant[]).find(
      (variant) => variant.id === resolution.variant
    )!;
    return variant ? variant : null;
  }

  switch (resolution.bucketByCategory) {
    case "visitor": {
      return visitor && visitor.key
        ? resolvePercentageRolloutToVariant(visitor.key, flag, resolution)
        : // we were attempting to do a percentage rollout based on a visitor key,
          // but the client didn't send a visitor key
          null;
    }
    case "user": {
      // when no user exists but we're bucketing by user
      if (!user) return null;

      const attributeValue = user[resolution.bucketByUserAttribute];

      // when the user doesn't have the specified attribute
      if (!attributeValue) return null;

      return resolvePercentageRolloutToVariant(
        attributeValue,
        flag,
        resolution
      );
    }
    case "trait": {
      // when no traits were sent but we're bucketing by traits
      if (!traits) return null;

      const traitValue = traits[resolution.bucketByTrait];

      // when the user doesn't have the specified trait
      if (!traitValue) return null;

      return resolvePercentageRolloutToVariant(traitValue, flag, resolution);
    }
    default:
      // serve offVariation as a sane fallback just in case
      return null;
  }
}

/**
 * Resolves a flag to a variant, based on input.
 *
 * Returns null when something unexpected happens.
 */
export function resolveFlagToVariant(options: Options): FlagVariant | null {
  // This part determines the resolution to use
  const resolution = getResolution(options);
  // This maps the determined resolution to a variant
  return resolveResolution(options, resolution);
}
