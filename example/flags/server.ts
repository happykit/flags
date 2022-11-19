import {
  createGetFlags,
  type GenericEvaluationResponseBody,
} from "@happykit/flags/server";
import { type AppFlags, config } from "./config";

export type EvaluationResponseBody = GenericEvaluationResponseBody<AppFlags>;

export const getFlags = createGetFlags<AppFlags>(config);
