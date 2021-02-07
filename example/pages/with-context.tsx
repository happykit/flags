import Head from "next/head";
import * as React from "react";
import {
  useFlags,
  FlagUser,
  InitialFlagState,
  Traits,
} from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import { FlagBagProvider, useFlagBag } from "@happykit/flags/context";
import { GetServerSideProps } from "next";

type Flags = {
  "baby-koalas": boolean;
  meal: "small" | "medium" | "large";
  dopestflagonearth: boolean;
  "numbered-koalas": number;
};

type ServerSideProps = {
  initialFlagState: InitialFlagState<Flags>;
};

function Code() {
  const flagBag = useFlagBag<Flags>();
  return <pre>{JSON.stringify(flagBag, null, 2)}</pre>;
}

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags<Flags>({ context });
  return { props: { initialFlagState } };
};

export default function Home(props: ServerSideProps) {
  const [user, setUser] = React.useState<null | FlagUser>(null);
  const [traits, setTraits] = React.useState<null | Traits>(null);

  const flagBag = useFlags<Flags>({
    initialState: props.initialFlagState,
    user,
    traits,
  });

  console.log(flagBag);

  return (
    <FlagBagProvider value={flagBag}>
      <Head>
        <title>@happykit/flags examples</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <button
          type="button"
          onClick={() => {
            console.log("toggle user");
            setUser((prev) => (prev ? null : { key: "jennyc" }));
          }}
        >
          toggle user
        </button>{" "}
        <button
          type="button"
          onClick={() => {
            console.log("toggle traits");
            setTraits((prev) => (prev ? null : { employee: true }));
          }}
        >
          toggle traits
        </button>{" "}
        <p>
          {user ? "has user" : "no user"}, {traits ? "has traits" : "no traits"}
        </p>
        <Code />
      </main>
    </FlagBagProvider>
  );
}
