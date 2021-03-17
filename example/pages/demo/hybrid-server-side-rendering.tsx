import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { InitialFlagState, useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type ServerSideProps = { initialFlagState: InitialFlagState<AppFlags> };

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { initialFlagState } = await getFlags<AppFlags>({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: ServerSideProps) {
  const flagBag = useFlags({ initialState: props.initialFlagState });
  return (
    <Layout
      title="Demo: Server Side Rendering (Hybrid)"
      source="https://github.com/happykit/flags/blob/example/pages/demo/hybrid-server-side-rendering.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for static pages.
        </p>
        <Result key="hybrid-server-side-rendering" value={flagBag} />
      </div>
    </Layout>
  );
}
