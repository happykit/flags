import * as React from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import "tailwindcss/tailwind.css";
import { configure } from "@happykit/flags/config";
import Script from "next/script";

configure({
  envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,

  // You can just delete this line in your own application.
  // It's only here because we use it while working on @happykit/flags itself.
  endpoint: process.env.NEXT_PUBLIC_FLAGS_ENDPOINT,
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <React.Fragment>
      <Head>
        <link rel="icon" href="/favicon.png" />
      </Head>
      {process.env.NODE_ENV === "production" && (
        <Script
          src="https://plausible.io/js/plausible.js"
          data-domain="flags.happykit.dev"
        />
      )}
      <Component {...pageProps} />
    </React.Fragment>
  );
}

export default MyApp;
