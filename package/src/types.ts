export type FlagUser = {
  key: string;
  persist?: boolean;
  email?: string;
  name?: string;
  avatar?: string;
  country?: string;
};

export type Traits = { [key: string]: any };

export type Flags = {
  [key: string]: boolean | number | string;
};

export class MissingConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Missing configuration. Call configure() first.");
  }
}

export type Input = {
  endpoint: string;
  envKey: string;
  requestBody: EvaluationRequestBody;
};

export type Outcome<F extends Flags> = {
  responseBody: EvaluationResponseBody<F>;
};

export type EvaluationRequestBody = {
  visitorKey: string | null;
  user: FlagUser | null;
  traits: Traits | null;
};

export type EvaluationResponseBody<F extends Flags> = {
  visitor: { key: string };
  flags: F;
};

export type InitialFlagState<F extends Flags> = {
  input: Input;
  outcome: Outcome<F> | null;
};

export class InvalidConfigurationError extends Error {
  constructor() {
    super("@happykit/flags: Invalid configuration");
  }
}

export type IncomingConfiguration<F extends Flags> = {
  envKey: string;
  endpoint?: string;
  defaultFlags?: F;
  revalidateOnFocus?: boolean;
  disableCache?: boolean;
};

export type DefaultConfiguration = {
  endpoint: string;
  fetch: typeof fetch;
  defaultFlags: Flags;
  revalidateOnFocus: boolean;
  disableCache: boolean;
};
