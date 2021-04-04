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
        title="Demo: Context"
        source="https://github.com/happykit/flags/blob/example/pages/demo/context.tsx"
      >
        <article className="py-4 prose max-w-prose">
          <p>
            This demo shows how to propagate the flag bag through the context.
          </p>
          <p>
            The <code>useFlags()</code> hook of HappyKit should only be used
            once per Next.js route, at the top level of the default exported
            page. You should then pass the feature flags down to each component
            that needs access to them using props.
          </p>
          <p>
            But some developers might prefer being able to use context instead.
            This demo shows how to use <code>FlagBagProvider</code> and the{" "}
            <code>useFlagBag()</code>
            hook to put the flagBag into context and how to access it from a
            nested component.
          </p>
          <SomeNestedComponent />
        </article>
      </Layout>
    </FlagBagProvider>
  );
}
