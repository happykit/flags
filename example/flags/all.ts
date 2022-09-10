// it would be dope if we could have all flags in one file,
// but it seems like we'll have to use separate files
import { createUseFlags } from "@happykit/flags/client";
import { createGetFlags } from "@happykit/flags/server";
import { createGetEdgeFlags } from "@happykit/flags/edge";
import { configure } from "@happykit/flags/config";
import { createUseFlagBag } from "@happykit/flags/context";

export type AppFlags = {
  ads: boolean;
  checkout: "short" | "medium" | "full";
  discount: 5 | 10 | 15;
  purchaseButtonLabel: string;
};

const config = configure<AppFlags>({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,

  // You can just delete this line in your own application.
  // It's only here because we use it while working on @happykit/flags itself.
  endpoint: process.env.NEXT_PUBLIC_FLAGS_ENDPOINT,
});

export const useFlags = createUseFlags<AppFlags>(config);
export const getFlags = createGetFlags<AppFlags>(config);
export const getEdgeFlags = createGetEdgeFlags<AppFlags>(config);
export const useFlagBag = createUseFlagBag<AppFlags>();
