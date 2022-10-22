import { unstable_DefinitionsInStorage } from "@happykit/flags/api-route";
import { get } from "@vercel/edge-config";

export async function getDefinitions(
  projectId: string,
  envKey: string,
  environment: string
) {
  const data = (await get(
    `happykit_v1_${projectId}`
  )) as unknown as unstable_DefinitionsInStorage;

  // read from edge config here
  return data ?? null;
}
