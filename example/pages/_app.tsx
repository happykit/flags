import * as React from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import "tailwindcss/tailwind.css";
import Script from "next/script";
import { VercelToolbar } from "@vercel/toolbar/next";

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
      {
        // shows the toolbar when developing locally or in preview, but not in production
        process.env.NEXT_PUBLIC_FLAGS_ENV_KEY &&
        /^flags_pub_(development|preview)_/.test(
          process.env.NEXT_PUBLIC_FLAGS_ENV_KEY
        ) ? (
          <VercelToolbar />
        ) : null
      }
    </React.Fragment>
  );
}

export default MyApp;
