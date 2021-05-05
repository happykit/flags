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
import { Result } from "../components/Result";

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
  const user: FlagUser = { key: "xyz", email: "xyz@example.com" };
  const traits: Traits = { teamMember: true };
  const { initialFlagState } = await getFlags<Flags>({ context, user, traits });

  return {
    props: { initialFlagState, initialUser: user, initialTraits: traits },
  };
};

export default function Home(props: ServerSideProps) {
  const [ready, setReady] = React.useState<boolean>(true);
  const [user, setUser] = React.useState<null | FlagUser>(props.initialUser);
  const [traits, setTraits] = React.useState<null | Traits>(
    props.initialTraits
  );

  const flagBag = useFlags<Flags>({
    initialState: props.initialFlagState,
    user,
    traits,
    pause: !ready,
  });

  return (
    <div>
      <Head>
        <title>@happykit/flags examples</title>
      </Head>

      <main>
        <button type="button" onClick={() => setReady(false)}>
          ready off
        </button>{" "}
        <button type="button" onClick={() => setReady(true)}>
          ready on
        </button>{" "}
        <button type="button" onClick={() => setUser(null)}>
          no user
        </button>{" "}
        <button type="button" onClick={() => setUser({ key: "jennyc" })}>
          user jennyc
        </button>{" "}
        <button type="button" onClick={() => setUser({ key: "greg" })}>
          user greg
        </button>{" "}
        <button type="button" onClick={() => setTraits({ teamMember: true })}>
          traits on
        </button>{" "}
        <button type="button" onClick={() => setTraits(null)}>
          traits off
        </button>{" "}
        <p>
          {user ? "has user" : "no user"}, {traits ? "has traits" : "no traits"}
        </p>
        <Result key="test" value={flagBag} />
      </main>
    </div>
  );
}
