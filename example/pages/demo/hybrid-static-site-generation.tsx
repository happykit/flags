import * as React from "react";
import { GetStaticProps } from "next";
import { Layout } from "../../components/Layout";
import { Result } from "../../components/Result";
import { InitialFlagState, useFlags } from "@happykit/flags/client";
import { getFlags } from "@happykit/flags/server";

type AppFlags = { size: "small" | "medium" | "large" };
type StaticProps = { initialFlagState: InitialFlagState<AppFlags> };

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { initialFlagState } = await getFlags<AppFlags>({ context });
  return { props: { initialFlagState } };
};

export default function Page(props: StaticProps) {
  const flagBag = useFlags({ initialState: props.initialFlagState });
  return (
    <Layout
      title="Demo: Static Site Generation (Hybrid)"
      source="https://github.com/happykit/flags/blob/example/pages/demo/hybrid-static-site-generation.tsx"
    >
      <div className="py-4">
        <p className="max-w-prose text-gray-600">
          This demo shows how to use @happykit/flags for static pages.
        </p>
        <Result key="hybrid-static-site-generation" value={flagBag} />
      </div>
    </Layout>
  );
}
