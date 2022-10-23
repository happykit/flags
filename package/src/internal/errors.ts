import { Flags, Input, GetFlagsErrorBag, ResolvingError } from "./types";

export function resolvingErrorBag<F extends Flags>(options: {
  error: ResolvingError;
  input: Input;
  flags: F;
  cookie?: GetFlagsErrorBag<F>["cookie"];
}): GetFlagsErrorBag<F> {
  return {
    flags: options.flags as F,
    data: null,
    error: options.error,
    initialFlagState: {
      input: options.input,
      outcome: { error: options.error },
    },
    cookie: options.cookie,
  };
}
