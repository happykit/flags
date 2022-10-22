import {
  createGetFlags,
  type GenericEvaluationResponseBody,
} from "@happykit/flags/server";
import { type AppFlags, config } from "./config";
import { getDefinitions } from "./storage";

export type EvaluationResponseBody = GenericEvaluationResponseBody<AppFlags>;
export const getFlags = createGetFlags<AppFlags>(config, { getDefinitions });
