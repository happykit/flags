import * as React from "react";
import { GetStaticProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type StaticProps = { flags: AppFlags };

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { flags } = await getFlags<AppFlags>({ context });
  return { props: { flags } };
};

export default function Page(props: StaticProps) {
  return (
    <Layout
      title="Example: Static Site Generation (Pure)"
      source="https://github.com/happykit/flags/blob/example/pages/examples/pure-static-site-generation.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This example shows how to use @happykit/flags for static pages.
        </p>
        <Result key="pure-static-site-generation" value={props.flags} />
      </div>
    </Layout>
  );
}
