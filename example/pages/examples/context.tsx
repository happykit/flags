import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { useFlags, InitialFlagState } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";
import { FlagBagProvider, useFlagBag } from "@happykit/flags/context";

type Flags = {
  size: "small" | "medium" | "large";
};

type ServerSideProps = {
  initialFlagState: InitialFlagState<Flags>;
};

function SomeNestedComponent() {
  // The nested component has access to the flagBag using context
  const flagBag = useFlagBag<Flags>();
  return <Result key="context" value={flagBag} />;
}

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags<Flags>({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: ServerSideProps) {
  const flagBag = useFlags<Flags>({ initialState: props.initialFlagState });

  return (
    // The FlagBagProvider is intended to be set on every page
    <FlagBagProvider value={flagBag}>
      <Layout
        title="Example: Context"
        source="https://github.com/happykit/flags/blob/example/pages/examples/context.tsx"
      >
        <div className="py-4">
          <p className="max-w-prose text-gray-600">
            This example shows how to propagate the flag bag through the
            context.
          </p>

          <SomeNestedComponent />
        </div>
      </Layout>
    </FlagBagProvider>
  );
}
