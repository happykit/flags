import { createGetEdgeFlags } from "@happykit/flags/edge";
import { type AppFlags, config } from "./config";
import { getDefinitions } from "flags/storage";

export const getEdgeFlags = createGetEdgeFlags<AppFlags>(config, {
  getDefinitions,
});
