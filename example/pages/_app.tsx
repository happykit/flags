import * as React from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import "tailwindcss/tailwind.css";
import Script from "next/script";

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
