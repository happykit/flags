import type { GetDefinitions, Definitions } from "@happykit/flags/api-route";
import { get } from "@vercel/edge-config";

export const getDefinitions: GetDefinitions = async (
  projectId,
  envKey,
  environment
) => {
  const definitions = await get<Definitions>(`happykit_v1_${projectId}`);
  return definitions ?? null;
};
