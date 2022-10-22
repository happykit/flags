import type { GetDefinitions } from "@happykit/flags/api-route";
import { get } from "@vercel/edge-config";

export const getDefinitions: GetDefinitions = async (
  projectId,
  envKey,
  environment
) => {
  // TODO fix types here once get() supports generics properly
  const definitions = (await get(
    `happykit_v1_${projectId}`
  )) as unknown as Awaited<ReturnType<GetDefinitions>>;

  // read from edge config here
  return definitions ?? null;
};
