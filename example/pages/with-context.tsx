import * as React from "react";
import { Layout } from "../components/Layout";
import { Result } from "../components/Result";
import { Switch } from "../components/Switch";
import { Divider } from "../components/Divider";
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

function SomeNestedComponent() {
  // The nested component has access to the flagBag using context
  const flagBag = useFlagBag<Flags>();
  return <Result value={flagBag} />;
}

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags<Flags>({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: ServerSideProps) {
  const [user, setUser] = React.useState<null | FlagUser>(null);
  const [traits, setTraits] = React.useState<null | Traits>(null);

  const flagBag = useFlags<Flags>({
    initialState: props.initialFlagState,
    user,
    traits,
  });

  return (
    <FlagBagProvider value={flagBag}>
      <Layout
        title="Example: Context"
        source="https://github.com/happykit/flags/blob/example/pages/with-context.tsx"
      >
        <div className="py-4">
          <p className="max-w-prose text-gray-600">
            This example shows how to use @happykit/flags for static pages.
          </p>

          <div className="mt-4 max-w-prose">
            <Divider>Input</Divider>
          </div>
          <div className="grid gap-2 mt-4">
            <Switch
              id="toggle-user"
              label="User"
              active={Boolean(user)}
              onClick={() => {
                setUser((prev) => (prev ? null : { key: "jennyc" }));
              }}
            />
            <Switch
              id="toggle-traits"
              label="Traits"
              active={Boolean(traits)}
              onClick={() => {
                setTraits((prev) => (prev ? null : { employee: true }));
              }}
            />
          </div>
          <div className="mt-4 max-w-prose">
            <Divider>Output</Divider>
          </div>
          <SomeNestedComponent />
        </div>
      </Layout>
    </FlagBagProvider>
  );
}
