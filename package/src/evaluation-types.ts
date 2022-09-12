export type VariantFlagResolution = {
  mode: "variant";
  variant: string;
};

export type Condition =
  | {
      id: string;
      group: "visitor";
      lhs: "key";
      operator: "equal-to" | "not-equal-to" | "starts-with" | "ends-with";
      rhs: string;
    }
  | {
      id: string;
      group: "visitor";
      lhs: "key" | "language" | "country" | "referrer" | "timeZone";
      operator: "set" | "not-set";
    }
  | {
      id: string;
      group: "user";
      lhs: "key" | "email" | "name" | "language" | "country";
      operator: "set" | "not-set";
    }
  | {
      id: string;
      group: "user";
      lhs: "key" | "email" | "name" | "language" | "country";
      operator: "equal-to" | "not-equal-to" | "starts-with" | "ends-with";
      rhs: string;
    }
  | {
      id: string;
      group: "user";
      lhs: "authentication";
      operator: "authenticated" | "not-authenticated";
    }
  | {
      id: string;
      group: "traits";
      lhs: string;
      operator: "set" | "not-set";
    }
  | {
      id: string;
      group: "traits";
      lhs: string;
      operator: "equal-to" | "not-equal-to" | "starts-with" | "ends-with";
      rhs: string;
    };

export type FlagRule = {
  id: string;
  conditions: Condition[];
  resolution: FlagResolution;
};

export interface BaseRolloutFlagResolution {
  /**
   * This property does not do anything on rollouts.
   * It might still be around due to inconsistent data, which
   * can happen due to the form submitting wrong data.
   */
  variant?: string;
  mode: "rollout";
  variants: Record<string, { weight: number }>;
}

export interface VisitorRolloutFlagResolution
  extends BaseRolloutFlagResolution {
  bucketByCategory: "visitor";
  bucketByUserAttribute?: never;
  bucketByTrait?: never;
}

export interface UserRolloutFlagResolution extends BaseRolloutFlagResolution {
  bucketByCategory: "user";
  bucketByUserAttribute: "key" | "email" | "name" | "country";
  bucketByTrait?: never;
}

export interface TraitRolloutFlagResolution extends BaseRolloutFlagResolution {
  bucketByCategory: "trait";
  bucketByUserAttribute?: never;
  bucketByTrait: string;
}

export type RolloutFlagResolution =
  | UserRolloutFlagResolution
  | VisitorRolloutFlagResolution
  | TraitRolloutFlagResolution;

export type FlagResolution = VariantFlagResolution | RolloutFlagResolution;

export type EnvironmentConfiguration = {
  active: boolean;
  fallthrough: FlagResolution;
  offVariation: string;
  /**
   * Keys are variantIds, values are keys of users targeted by that flag
   */
  targets: Record<string, { values: string[] }>;
  rules: FlagRule[];
};

// import * as apiFlag from "../../app/types/api/flag";
export interface BaseFlag {
  kind: "boolean" | "number" | "string";
  id: string;
  projectId: string;
  slug: string;
  production: EnvironmentConfiguration;
  preview: EnvironmentConfiguration;
  development: EnvironmentConfiguration;
  variants: BooleanVariant[] | NumberVariant[] | StringVariant[];
}

export interface BaseVariant {
  id: string;
  value: string | number | boolean;
}

export interface BooleanVariant extends BaseVariant {
  value: boolean;
}
export interface NumberVariant extends BaseVariant {
  value: number;
}
export interface StringVariant extends BaseVariant {
  value: string;
}

export interface BooleanFlag extends BaseFlag {
  kind: "boolean";
  variants: BooleanVariant[];
}

export interface NumberFlag extends BaseFlag {
  kind: "number";
  variants: NumberVariant[];
}

export interface StringFlag extends BaseFlag {
  kind: "string";
  variants: StringVariant[];
}

export type Flag = BooleanFlag | NumberFlag | StringFlag;

// from Models.Fauna
export type FlagUserAttributes = {
  key: string;
  email?: string;
  name?: string;
  avatar?: string;
  language?: string;
  timeZone?: string;
  country?: string;
};

// from Models.Fauna
export type FlagVisitor = {
  key: string;
};

export type FlagVariant = {
  id: string;
  value: string | number | boolean;
};

export type Environment = "development" | "preview" | "production";
