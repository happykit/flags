import Head from "next/head";
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

export default function Home() {
  const flagBag = useFlags();
  console.log(flagBag);
  return (
    <div>
      <Head>
        <title>@happykit/flags examples</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <pre>{JSON.stringify(flagBag, null, 2)}</pre>
      </main>
    </div>
  );
}
