import {
  createGetFlags,
  type EvaluationResponseBody as E,
} from "@happykit/flags/server";
import { type AppFlags, config } from "./config";

export type EvaluationResponseBody = E<AppFlags>;
export const getFlags = createGetFlags<AppFlags>(config);
