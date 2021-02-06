import Head from "next/head";
import * as React from "react";
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import { GetServerSideProps } from "next";
import { FlagUser, InitialFlagState } from "@happykit/flags/config";

type Flags = {
  "baby-koalas": boolean;
  meal: "small" | "medium" | "large";
  dopestflagonearth: boolean;
  "numbered-koalas": number;
};

type ServerSideProps = {
  initialFlagState: InitialFlagState<Flags>;
};

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags<Flags>({
    context,
    user: { key: "jennyc" },
  });
  return {
    props: {
      initialFlagState,
    },
  };
};

export default function Home(props: ServerSideProps) {
  const [user, setUser] = React.useState<null | FlagUser>({
    key: "jennyc",
  });

  const flagBag = useFlags<Flags>({
    initialState: props.initialFlagState,
    user: user,
    // traits: { random: "r" },
  });

  return (
    <div>
      <Head>
        <title>@happykit/flags examples</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <button
          type="button"
          onClick={() => setUser((prev) => (prev ? null : { key: "jon" }))}
        >
          toggle user
        </button>{" "}
        {user ? "has user" : "anonymous"}
        <pre>{JSON.stringify(flagBag, null, 2)}</pre>
      </main>
    </div>
  );
}
