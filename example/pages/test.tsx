import Head from "next/head";
import * as React from "react";
import {
  useFlags,
  FlagUser,
  InitialFlagState,
  Traits,
} from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import { GetServerSideProps } from "next";

type Flags = {
  "baby-koalas": boolean;
  meal: "small" | "medium" | "large";
  dopestflagonearth: boolean;
  "numbered-koalas": number;
};

type ServerSideProps = {
  initialFlagState: InitialFlagState<Flags>;
  initialUser: FlagUser;
  initialTraits: Traits;
};

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const user: FlagUser = { key: "jennyc" };
  const traits: Traits = { employee: true };
  const { initialFlagState } = await getFlags<Flags>({ context, user, traits });

  return {
    props: { initialFlagState, initialUser: user, initialTraits: traits },
  };
};

export default function Home(props: ServerSideProps) {
  const [user, setUser] = React.useState<null | FlagUser>(props.initialUser);
  const [traits, setTraits] = React.useState<null | Traits>(
    props.initialTraits
  );

  const flagBag = useFlags<Flags>({
    initialState: props.initialFlagState,
    user,
    traits,
  });

  return (
    <div>
      <Head>
        <title>@happykit/flags examples</title>
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
        <pre>{JSON.stringify(flagBag, null, 2)}</pre>
      </main>
    </div>
  );
}
