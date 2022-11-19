import type { Configuration } from "@happykit/flags/config";

export type AppFlags = {
  ads: boolean;
  checkout: "short" | "medium" | "full";
  discount: 5 | 10 | 15;
  purchaseButtonLabel: string;
};

export const config: Configuration<AppFlags> = {
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,
  endpoint: "/api/flags",
};
