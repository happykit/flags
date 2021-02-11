import * as React from "react";
import { GetServerSideProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type ServerSideProps = { flags: AppFlags };

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async (
  context
) => {
  const { flags } = await getFlags<AppFlags>({ context });
  return { props: { flags } };
};

export default function Page(props: ServerSideProps) {
  return (
    <Layout
      title="Example: Server Side Rendering (Pure)"
      source="https://github.com/happykit/flags/blob/example/pages/examples/pure-server-side-rendering.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This example shows how to use @happykit/flags for static pages.
        </p>
        <Result key="pure-server-side-rendering" value={props.flags} />
      </div>
    </Layout>
  );
}
