import type { Configuration } from "@happykit/flags/config";

export type AppFlags = {
  ads: boolean;
  checkout: "short" | "medium" | "full";
  discount: 5 | 10 | 15;
  purchaseButtonLabel: string;
};

export const config: Configuration<AppFlags> = {
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,

  // You can just delete this line in your own application.
  // It's only here because we use it while working on @happykit/flags itself.
  endpoint: process.env.NEXT_PUBLIC_FLAGS_ENDPOINT,
};
