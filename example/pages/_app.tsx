import type { AppProps } from "next/app";
import { configure } from "@happykit/flags/config";

configure({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,
  // You can just delete this line in your own application.
  // It's only here because we use it while working on @happykit/flags itself.
  endpoint: process.env.NEXT_PUBLIC_FLAGS_ENDPOINT,
});

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
