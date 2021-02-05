import Head from "next/head";
import { useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import { GetServerSideProps } from "next";
import { InitialFlagState } from "@happykit/flags/config";

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
  const { initialFlagState } = await getFlags<Flags>({ context });
  return {
    props: {
      initialFlagState,
    },
  };
};

export default function Home(props: ServerSideProps) {
  const flagBag = useFlags<Flags>({ initialState: props.initialFlagState });
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
