import { Flags, Input } from "./types";

// this is the definition as returned by the API
type FlagDefinition = {};

export function unstable_evaluate<F extends Flags = Flags>(
  definitions: FlagDefinition[],
  input: Input
): F {
  return {} as F;
}
